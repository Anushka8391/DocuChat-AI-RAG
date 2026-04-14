"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ApiError,
  ChatConversationListResponse,
  ChatConversationMessagesResponse,
  ChatConversationSummary,
  ChatMessage,
  ChatResponseBody,
  ChatStreamChunkEvent,
  ChatStreamErrorEvent,
  ChatStreamMetaEvent,
  UploadedFileMetadata,
} from "@/types";

function createAssistantReply(content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
  };
}

function getApiErrorMessage(
  payload:
    | ApiError
    | ChatResponseBody
    | ChatConversationListResponse
    | ChatConversationMessagesResponse,
) {
  if ("error" in payload) {
    return payload.details ?? payload.error;
  }

  return "Unable to process your message right now.";
}

function parseSsePacket(packet: string) {
  const lines = packet.split(/\r?\n/);
  const eventLine = lines.find((line) => line.startsWith("event:"));
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");

  if (!eventLine || !data) {
    return null;
  }

  return {
    event: eventLine.slice(6).trim(),
    data,
  };
}

interface SendMessageOptions {
  attachedFile?: UploadedFileMetadata | null;
}

export function useChat(initialMessages: ChatMessage[] = []) {
  const messagesRef = useRef<ChatMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const refreshConversations = useCallback(async () => {
    const response = await fetch("/api/chat/conversations", {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json()) as ApiError | ChatConversationListResponse;

    if (!response.ok) {
      throw new Error(getApiErrorMessage(payload));
    }

    if (!("conversations" in payload)) {
      throw new Error("Unexpected response while loading previous chats.");
    }

    setConversations(payload.conversations);
    return payload.conversations;
  }, []);

  const loadConversation = useCallback(
    async (nextConversationId: string) => {
      setIsLoadingConversation(true);

      try {
        const response = await fetch(`/api/chat/${nextConversationId}`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json()) as ApiError | ChatConversationMessagesResponse;

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload));
        }

        if (!("messages" in payload)) {
          throw new Error("Unexpected response while loading the conversation.");
        }

        const nextMessages = payload.messages.length ? payload.messages : initialMessages;
        messagesRef.current = nextMessages;
        setMessages(nextMessages);
        setConversationId(payload.conversationId);
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [initialMessages],
  );

  const startNewChat = useCallback(() => {
    messagesRef.current = initialMessages;
    setMessages(initialMessages);
    setConversationId(undefined);
  }, [initialMessages]);

  useEffect(() => {
    let isMounted = true;

    void refreshConversations()
      .then((items) => {
        if (!isMounted) {
          return;
        }

        if (items.length > 0) {
          void loadConversation(items[0].id);
        }
      })
      .catch(() => {
        if (isMounted) {
          setConversations([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [loadConversation, refreshConversations]);

  const sendMessage = useCallback(
    async (content: string, options: SendMessageOptions = {}) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };

      const assistantMessageId = crypto.randomUUID();
      const nextMessages = [...messagesRef.current, userMessage];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId,
            message: content,
            messages: nextMessages,
            attachedFile: options.attachedFile ?? null,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as ApiError | ChatResponseBody;
          throw new Error(getApiErrorMessage(payload));
        }

        if (!response.body) {
          throw new Error("Streaming response is unavailable.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const upsertAssistantMessage = (chunk: string) => {
          setMessages((current) => {
            const index = current.findIndex((message) => message.id === assistantMessageId);

            if (index === -1) {
              return [
                ...current,
                {
                  id: assistantMessageId,
                  role: "assistant",
                  content: chunk,
                  createdAt: new Date().toISOString(),
                },
              ];
            }

            return current.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: `${message.content}${chunk}` }
                : message,
            );
          });
        };

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const packets = buffer.split("\n\n");
          buffer = packets.pop() ?? "";

          for (const packet of packets) {
            const parsed = parseSsePacket(packet);

            if (!parsed) {
              continue;
            }

            if (parsed.event === "meta") {
              const meta = JSON.parse(parsed.data) as ChatStreamMetaEvent;
              setConversationId(meta.conversationId);
              continue;
            }

            if (parsed.event === "chunk") {
              const chunk = JSON.parse(parsed.data) as ChatStreamChunkEvent;
              upsertAssistantMessage(chunk.content);
              continue;
            }

            if (parsed.event === "done") {
              const payload = JSON.parse(parsed.data) as ChatResponseBody;
              setConversationId(payload.conversationId);
              setMessages((current) => {
                const index = current.findIndex((message) => message.id === assistantMessageId);

                if (index === -1) {
                  return [...current, payload.reply];
                }

                return current.map((message) =>
                  message.id === assistantMessageId ? payload.reply : message,
                );
              });
              void refreshConversations().catch(() => undefined);
              continue;
            }

            if (parsed.event === "error") {
              const payload = JSON.parse(parsed.data) as ChatStreamErrorEvent;
              throw new Error(payload.details ?? payload.error);
            }
          }
        }
      } catch (error) {
        const fallbackReply = createAssistantReply(
          error instanceof Error ? error.message : "Unable to process your message right now.",
        );

        setMessages((current) => [...current, fallbackReply]);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, refreshConversations],
  );

  return {
    conversationId,
    conversations,
    isLoading: isLoading || isLoadingConversation,
    messages,
    loadConversation,
    refreshConversations,
    sendMessage,
    setMessages,
    startNewChat,
  };
}
