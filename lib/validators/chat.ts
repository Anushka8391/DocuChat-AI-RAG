import type { ChatMessage, ChatRequestBody, UploadedFileMetadata } from "@/types";

const VALID_ROLES = new Set<ChatMessage["role"]>([
  "system",
  "user",
  "assistant",
]);

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ChatMessage>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.role === "string" &&
    VALID_ROLES.has(candidate.role as ChatMessage["role"])
  );
}

function isUploadedFileMetadata(value: unknown): value is UploadedFileMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<UploadedFileMetadata>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.size === "number" &&
    typeof candidate.userId === "string" &&
    typeof candidate.mimeType === "string" &&
    typeof candidate.bucket === "string" &&
    typeof candidate.path === "string" &&
    (candidate.extension === "md" || candidate.extension === "txt") &&
    typeof candidate.createdAt === "string" &&
    (candidate.downloadUrl === null || typeof candidate.downloadUrl === "string")
  );
}

export function isChatRequestBody(value: unknown): value is ChatRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ChatRequestBody>;
  const hasMessages = Array.isArray(candidate.messages) && candidate.messages.every(isChatMessage);
  const hasMessage = typeof candidate.message === "string" && candidate.message.trim().length > 0;

  return (
    (hasMessages || hasMessage) &&
    (candidate.conversationId === undefined ||
      typeof candidate.conversationId === "string") &&
    (candidate.model === undefined || typeof candidate.model === "string") &&
    (candidate.attachedFile === undefined ||
      candidate.attachedFile === null ||
      isUploadedFileMetadata(candidate.attachedFile))
  );
}
