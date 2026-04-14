import type { AgentStructuredResponse, AgentToolInvocation } from "./agent";
import type { UploadedFileMetadata } from "./file";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ChatRequestBody {
  message?: string;
  messages: ChatMessage[];
  conversationId?: string;
  model?: string;
  attachedFile?: UploadedFileMetadata | null;
}

export interface ChatResponseBody {
  conversationId: string;
  reply: ChatMessage;
  agent?: AgentStructuredResponse;
  toolInvocations?: AgentToolInvocation[];
  warnings?: string[];
}

export interface ChatConversationSummary {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversationListResponse {
  conversations: ChatConversationSummary[];
  note?: string;
}

export interface ChatConversationMessagesResponse {
  conversationId: string;
  messages: ChatMessage[];
  note?: string;
}

export interface ChatStreamMetaEvent {
  conversationId: string;
  warnings?: string[];
}

export interface ChatStreamChunkEvent {
  content: string;
}

export interface ChatStreamErrorEvent {
  error: string;
  details?: string;
  conversationId?: string;
}

