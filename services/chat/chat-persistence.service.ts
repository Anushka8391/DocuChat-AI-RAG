import { randomUUID } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AgentStructuredResponse,
  AgentToolInvocation,
  ChatConversationSummary,
  ChatMessage,
} from "@/types";

const CONVERSATIONS_TABLE = "chat_conversations";
const MESSAGES_TABLE = "chat_messages";

type ChatConversationRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type ChatMessageRow = {
  id: string;
  role: ChatMessage["role"];
  content: string;
  created_at: string;
};

function buildConversationTitle(message: string) {
  const normalized = message.trim().replace(/\s+/g, " ");
  return normalized.slice(0, 80) || "New chat";
}

export function isMissingChatPersistenceTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };

  return (
    candidate.code === "PGRST205" ||
    candidate.message?.includes(CONVERSATIONS_TABLE) ||
    candidate.message?.includes(MESSAGES_TABLE) ||
    candidate.message?.includes("schema cache") ||
    false
  );
}

class ChatPersistenceService {
  async ensureConversation(input: {
    conversationId?: string;
    userId: string;
    title?: string;
  }) {
    const admin = createSupabaseAdminClient();
    const conversationId = input.conversationId ?? randomUUID();

    const { error } = await admin.from(CONVERSATIONS_TABLE).upsert(
      {
        id: conversationId,
        user_id: input.userId,
        title: input.title ?? "New chat",
      },
      { onConflict: "id" },
    );

    if (error) {
      throw error;
    }

    return conversationId;
  }

  async storeMessage(input: {
    conversationId: string;
    userId: string;
    message: ChatMessage;
    agent?: AgentStructuredResponse;
    toolInvocations?: AgentToolInvocation[];
  }) {
    const admin = createSupabaseAdminClient();

    const { error } = await admin.from(MESSAGES_TABLE).insert({
      id: input.message.id,
      conversation_id: input.conversationId,
      user_id: input.userId,
      role: input.message.role,
      content: input.message.content,
      created_at: input.message.createdAt,
      agent_response: input.agent ?? null,
      tool_invocations: input.toolInvocations ?? null,
    });

    if (error) {
      throw error;
    }

    const { error: updateError } = await admin
      .from(CONVERSATIONS_TABLE)
      .update({ updated_at: new Date().toISOString() })
      .eq("id", input.conversationId)
      .eq("user_id", input.userId);

    if (updateError) {
      throw updateError;
    }
  }

  async listConversations(input: { userId: string; limit?: number }): Promise<ChatConversationSummary[]> {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from(CONVERSATIONS_TABLE)
      .select("id, title, created_at, updated_at")
      .eq("user_id", input.userId)
      .order("updated_at", { ascending: false })
      .limit(input.limit ?? 20);

    if (error) {
      throw error;
    }

    return Promise.all(
      ((data ?? []) as ChatConversationRow[]).map(async (conversation) => {
        const { data: latestMessageData } = await admin
          .from(MESSAGES_TABLE)
          .select("content, created_at")
          .eq("conversation_id", conversation.id)
          .eq("user_id", input.userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<Pick<ChatMessageRow, "content" | "created_at">>();

        return {
          id: conversation.id,
          title: conversation.title,
          preview: latestMessageData?.content?.slice(0, 100) || conversation.title,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
        } satisfies ChatConversationSummary;
      }),
    );
  }

  async listMessages(input: { conversationId: string; userId: string }) {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from(MESSAGES_TABLE)
      .select("id, role, content, created_at")
      .eq("conversation_id", input.conversationId)
      .eq("user_id", input.userId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map((row: ChatMessageRow) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    }));
  }

  createTitleFromMessage(message: string) {
    return buildConversationTitle(message);
  }
}

export const chatPersistenceService = new ChatPersistenceService();
