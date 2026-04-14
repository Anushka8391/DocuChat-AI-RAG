import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import { isChatRequestBody } from "@/lib/validators/chat";
import {
  chatPersistenceService,
  isMissingChatPersistenceTableError,
} from "@/services/chat/chat-persistence.service";
import { chatService } from "@/services/chat/chat.service";
import type { ApiError, ApiHealthCheck, ChatMessage, ChatRequestBody, ChatResponseBody } from "@/types";

export const dynamic = "force-dynamic";

function getLatestUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user") ?? null;
}

function buildWarningMessage(error: unknown) {
  if (isMissingChatPersistenceTableError(error)) {
    return "Run `supabase/migrations/20260411_create_chat_history.sql` to store conversations and messages in the database.";
  }

  return `Message persistence warning: ${getErrorMessage(error)}`;
}

function toSseEvent(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function splitForStreaming(content: string) {
  return content.match(/\S+\s*/g) ?? [content];
}

export async function GET() {
  const payload: ApiHealthCheck = {
    status: "ok",
    service: "chat-api",
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(payload, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const error: ApiError = {
        error: "Unauthorized.",
        details: "Sign in with Google to access the chat API.",
      };

      return NextResponse.json(error, { status: 401 });
    }

    const body: unknown = await request.json();

    if (!isChatRequestBody(body)) {
      const error: ApiError = {
        error: "Invalid chat payload.",
        details: "Expected a `message` string or a `messages` array.",
      };

      return NextResponse.json(error, { status: 400 });
    }

    const latestIncomingMessage = typeof body.message === "string" ? body.message.trim() : "";
    const normalizedMessages = Array.isArray(body.messages) && body.messages.length
      ? body.messages
      : [
          {
            id: randomUUID(),
            role: "user" as const,
            content: latestIncomingMessage,
            createdAt: new Date().toISOString(),
          },
        ];

    const latestUserMessage = getLatestUserMessage(normalizedMessages);

    if (!latestUserMessage) {
      const error: ApiError = {
        error: "Missing user message.",
        details: "Send at least one user message to the chat API.",
      };

      return NextResponse.json(error, { status: 400 });
    }

    let conversationId = body.conversationId ?? randomUUID();
    const warnings: string[] = [];

    try {
      conversationId = await chatPersistenceService.ensureConversation({
        conversationId,
        userId: user.id,
        title: chatPersistenceService.createTitleFromMessage(latestUserMessage.content),
      });
    } catch (error) {
      warnings.push(buildWarningMessage(error));
    }

    try {
      await chatPersistenceService.storeMessage({
        conversationId,
        userId: user.id,
        message: latestUserMessage,
      });
    } catch (error) {
      const warning = buildWarningMessage(error);
      if (!warnings.includes(warning)) {
        warnings.push(warning);
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const pushEvent = (event: string, payload: unknown) => {
          controller.enqueue(encoder.encode(toSseEvent(event, payload)));
        };

        pushEvent("meta", { conversationId, warnings });

        void (async () => {
          try {
            const response = await chatService.createReply({
              ...(body as ChatRequestBody),
              conversationId,
              messages: normalizedMessages,
              userId: user.id,
            });

            const finalPayload: ChatResponseBody = {
              ...response,
              warnings,
            };

            try {
              await chatPersistenceService.storeMessage({
                conversationId,
                userId: user.id,
                message: finalPayload.reply,
                agent: finalPayload.agent,
                toolInvocations: finalPayload.toolInvocations,
              });
            } catch (error) {
              const warning = buildWarningMessage(error);
              if (!warnings.includes(warning)) {
                warnings.push(warning);
              }
            }

            for (const chunk of splitForStreaming(finalPayload.reply.content)) {
              pushEvent("chunk", { content: chunk });
              await new Promise((resolve) => setTimeout(resolve, 12));
            }

            pushEvent("done", {
              ...finalPayload,
              warnings,
            });
          } catch (error) {
            pushEvent("error", {
              error: "Unable to process the chat request.",
              details: getErrorMessage(error),
              conversationId,
            });
          } finally {
            controller.close();
          }
        })();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const payload: ApiError = {
      error: "Unable to process the chat request.",
      details: getErrorMessage(error),
    };

    return NextResponse.json(payload, { status: 500 });
  }
}
