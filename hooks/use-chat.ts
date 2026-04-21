"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatConversationSummary, ChatMessage, UploadedFileMetadata } from "@/types";

const STORAGE_KEY = "agentic-rag-chat-store-v3";

interface StoredConversation extends ChatConversationSummary {
  messages: ChatMessage[];
}

interface SendMessageOptions {
  attachedFile?: UploadedFileMetadata | null;
}

function buildTimestamp(minutesAgo: number = 0) {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

function toSummary(conversation: StoredConversation): ChatConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    preview: conversation.preview,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function createAssistantMessage(
  content: string,
  metadata?: Pick<ChatMessage, "sources" | "usedTools" | "steps">,
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
    sources: metadata?.sources,
    usedTools: metadata?.usedTools,
    steps: metadata?.steps,
  };
}

function getConversationTitle(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 42) : "New chat";
}

function getPreview(messages: ChatMessage[]) {
  const lastMessage = [...messages]
    .reverse()
    .find((message) => message.content.trim().length > 0);

  if (!lastMessage) {
    return "Start a new conversation";
  }

  return lastMessage.content.replace(/\s+/g, " ").trim().slice(0, 88);
}


const starterConversations: StoredConversation[] = [
  {
    id: "starter-ui-refresh",
    title: "Website UI refresh",
    preview: "Let’s redesign the AI chat experience with a cleaner layout.",
    createdAt: buildTimestamp(180),
    updatedAt: buildTimestamp(150),
    messages: [
      {
        id: crypto.randomUUID(),
        role: "user",
        content: "I want a modern AI assistant layout for my website.",
        createdAt: buildTimestamp(180),
      },
      createAssistantMessage(
        "### Great choice\n\nA strong first version should feel clean, focused, and fast. I recommend a two-column layout with a sticky composer and markdown-ready responses.",
        {
          sources: ["Workspace UI kit", "Product prompt"],
          usedTools: ["memory_search", "code_reasoner"],
          steps: [
            "Reviewed the current interface goals.",
            "Selected a ChatGPT-style structure.",
            "Prepared the UI for future API integration.",
          ],
        },
      ),
    ],
  },
  {
    id: "starter-rag-layout",
    title: "RAG answer layout",
    preview: "Show sources and reasoning steps for each answer.",
    createdAt: buildTimestamp(120),
    updatedAt: buildTimestamp(90),
    messages: [
      {
        id: crypto.randomUUID(),
        role: "user",
        content: "How should I present sources in the chat UI?",
        createdAt: buildTimestamp(120),
      },
      createAssistantMessage(
        "Use a compact **Sources** section directly under each assistant message. Keep it lightweight with small badges or cards.",
        {
          sources: ["Conversation context", "Workspace UI kit"],
          usedTools: ["vector_search"],
          steps: [
            "Detected a request about response grounding.",
            "Mapped it to a compact badge-based UI.",
          ],
        },
      ),
    ],
  },
];

function hasConversationContent(conversation: StoredConversation) {
  return conversation.messages.some((message) => message.content.trim().length > 0);
}

function sanitizeStoredConversations(conversations: StoredConversation[]) {
  return conversations.filter(hasConversationContent);
}

function loadStoredConversations() {
  if (typeof window === "undefined") {
    return starterConversations;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return starterConversations;
    }

    const parsed = JSON.parse(stored) as StoredConversation[];

    if (!Array.isArray(parsed)) {
      return starterConversations;
    }

    return sanitizeStoredConversations(parsed);
  } catch {
    return starterConversations;
  }
}

function persistStoredConversations(conversations: StoredConversation[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeStoredConversations(conversations)));
}

export function useChat(initialMessages: ChatMessage[] = []) {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const storeRef = useRef<StoredConversation[]>([]);
  const hasHydratedRef = useRef(false);

  const syncStore = useCallback(
    (nextStore: StoredConversation[], activeId?: string) => {
      const sanitizedStore = sanitizeStoredConversations(nextStore);

      storeRef.current = sanitizedStore;
      setConversations(sanitizedStore.map(toSummary));

      if (hasHydratedRef.current) {
        persistStoredConversations(sanitizedStore);
      }

      if (typeof activeId !== "undefined") {
        setConversationId(activeId);
        const activeConversation = sanitizedStore.find((item) => item.id === activeId);
        setMessages(activeConversation?.messages ?? initialMessages);
      }
    },
    [initialMessages],
  );

  const upsertConversation = useCallback(
    (conversation: StoredConversation) => {
      const remaining = storeRef.current.filter((item) => item.id !== conversation.id);
      const nextStore = [conversation, ...remaining].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );

      syncStore(nextStore, conversation.id);
      return conversation;
    },
    [syncStore],
  );

  useEffect(() => {
    const loaded = loadStoredConversations();
    hasHydratedRef.current = true;
    storeRef.current = loaded;
    setConversations(loaded.map(toSummary));
    setConversationId(undefined);
    setMessages(initialMessages);
  }, [initialMessages]);

  const refreshConversations = useCallback(async () => {
    const loaded = loadStoredConversations();
    syncStore(loaded, conversationId);
    return loaded.map(toSummary);
  }, [conversationId, syncStore]);

  const loadConversation = useCallback(
    (nextConversationId: string) => {
      const activeConversation = storeRef.current.find((item) => item.id === nextConversationId);

      if (!activeConversation) {
        return;
      }

      setConversationId(nextConversationId);
      setMessages(activeConversation.messages.length > 0 ? activeConversation.messages : initialMessages);
    },
    [initialMessages],
  );

  const startNewChat = useCallback(() => {
    const sanitizedStore = sanitizeStoredConversations(storeRef.current);

    storeRef.current = sanitizedStore;
    setConversations(sanitizedStore.map(toSummary));

    if (hasHydratedRef.current) {
      persistStoredConversations(sanitizedStore);
    }

    setConversationId(undefined);
    setMessages(initialMessages);
  }, [initialMessages]);

  const renameConversation = useCallback(
    (targetId: string, title: string) => {
      const trimmedTitle = title.trim();

      if (!trimmedTitle) {
        return;
      }

      const nextStore = storeRef.current.map((item) =>
        item.id === targetId ? { ...item, title: trimmedTitle, updatedAt: new Date().toISOString() } : item,
      );

      syncStore(nextStore, conversationId);
    },
    [conversationId, syncStore],
  );

  const deleteConversation = useCallback(
    (targetId: string) => {
      const nextStore = storeRef.current.filter((item) => item.id !== targetId);

      if (nextStore.length === 0) {
        syncStore([], undefined);
        setConversationId(undefined);
        setMessages(initialMessages);
        return;
      }

      const nextActiveId = conversationId === targetId ? nextStore[0].id : conversationId;
      syncStore(nextStore, nextActiveId);
    },
    [conversationId, initialMessages, syncStore],
  );

  const streamAssistantResponse = useCallback(
    async (
      prompt: string,
      nextMessages: ChatMessage[],
      conversation: StoredConversation,
      attachedFile?: UploadedFileMetadata | null,
    ) => {
      const assistantId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      setMessages([
        ...nextMessages,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt,
        },
      ]);

      let streamedContent = "";
      let finalMetadata: Pick<ChatMessage, "sources" | "usedTools" | "steps"> = {};

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages,
            conversationId: conversation.id,
            attachedFile: attachedFile ?? null,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`API error: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const eventMatch = part.match(/^event: (\w+)\ndata: (.+)$/s);
            if (!eventMatch) continue;

            const [, eventType, rawData] = eventMatch;
            let payload: Record<string, unknown>;

            try {
              payload = JSON.parse(rawData) as Record<string, unknown>;
            } catch {
              continue;
            }

            if (eventType === "chunk") {
              streamedContent += String(payload.content ?? "");
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantId
                    ? { ...message, content: streamedContent }
                    : message,
                ),
              );
            } else if (eventType === "done") {
              const agent = payload.agent as Record<string, unknown> | undefined;
              finalMetadata = {
                sources: Array.isArray(agent?.sources)
                  ? (agent.sources as string[])
                  : undefined,
                usedTools: Array.isArray(agent?.usedTools)
                  ? (agent.usedTools as string[])
                  : undefined,
              };
              const reply = payload.reply as Record<string, unknown> | undefined;
              if (typeof reply?.content === "string") {
                streamedContent = reply.content;
              }
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantId
                    ? { ...message, content: streamedContent, ...finalMetadata }
                    : message,
                ),
              );
            } else if (eventType === "error") {
              streamedContent = String(payload.details ?? payload.error ?? "Something went wrong.");
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantId
                    ? { ...message, content: streamedContent }
                    : message,
                ),
              );
            }
          }
        }
      } catch (err) {
        const errorText = err instanceof Error ? err.message : "Request failed.";
        streamedContent = errorText;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? { ...message, content: errorText } : message,
          ),
        );
      }

      const finalAssistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: streamedContent,
        createdAt,
        ...finalMetadata,
      };

      upsertConversation({
        ...conversation,
        preview: getPreview([...nextMessages, finalAssistantMessage]),
        updatedAt: createdAt,
        messages: [...nextMessages, finalAssistantMessage],
      });
    },
    [upsertConversation],
  );

  const sendMessage = useCallback(
    async (content: string, options: SendMessageOptions = {}) => {
      if (!content.trim() || isLoading) {
        return;
      }

      setIsLoading(true);

      try {
        const createdAt = new Date().toISOString();
        const activeConversation = storeRef.current.find((item) => item.id === conversationId) ?? {
          id: crypto.randomUUID(),
          title: getConversationTitle(content),
          preview: "Start a new conversation",
          createdAt,
          updatedAt: createdAt,
          messages: [],
        };

        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content,
          createdAt,
        };

        const nextMessages = [...activeConversation.messages, userMessage];
        const titledConversation = {
          ...activeConversation,
          title:
            activeConversation.title === "New chat"
              ? getConversationTitle(content)
              : activeConversation.title,
          preview: getPreview(nextMessages),
          updatedAt: createdAt,
          messages: nextMessages,
        };

        upsertConversation(titledConversation);
        await streamAssistantResponse(
          content,
          nextMessages,
          titledConversation,
          options.attachedFile ?? null,
        );
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, isLoading, streamAssistantResponse, upsertConversation],
  );

  const regenerateLastResponse = useCallback(async () => {
    if (isLoading) {
      return;
    }

    const activeConversation = storeRef.current.find((item) => item.id === conversationId);

    if (!activeConversation) {
      return;
    }

    const lastUserMessage = [...activeConversation.messages]
      .reverse()
      .find((message) => message.role === "user");

    if (!lastUserMessage) {
      return;
    }

    const nextMessages = [...activeConversation.messages];

    if (nextMessages.at(-1)?.role === "assistant") {
      nextMessages.pop();
    }

    const updatedConversation = {
      ...activeConversation,
      preview: getPreview(nextMessages),
      updatedAt: new Date().toISOString(),
      messages: nextMessages,
    };

    upsertConversation(updatedConversation);
    setIsLoading(true);

    try {
      await streamAssistantResponse(lastUserMessage.content, nextMessages, updatedConversation);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading, streamAssistantResponse, upsertConversation]);

  return {
    conversationId,
    conversations,
    isLoading,
    messages,
    loadConversation,
    refreshConversations,
    sendMessage,
    setMessages,
    startNewChat,
    renameConversation,
    deleteConversation,
    regenerateLastResponse,
  };
}
