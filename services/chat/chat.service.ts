import { randomUUID } from "node:crypto";

import { getErrorMessage, logError } from "@/lib/utils";
import { langChainAgentService } from "@/services/agent/langchain-agent.service";
import { getUserSystemPrompt } from "@/services/auth/profile.service";
import type { ChatRequestBody, ChatResponseBody } from "@/types";

interface ChatReplyInput extends ChatRequestBody {
  userId: string;
}

export interface ChatService {
  createReply(payload: ChatReplyInput): Promise<ChatResponseBody>;
}

class LangChainChatService implements ChatService {
  async createReply(payload: ChatReplyInput): Promise<ChatResponseBody> {
    try {
      console.error("[chatService.createReply] input", {
        userId: payload.userId,
        conversationId: payload.conversationId ?? null,
        attachedFileId: payload.attachedFile?.id ?? null,
        attachedFileIds: payload.attachedFiles?.map((attachment) => attachment.id) ?? [],
        messageCount: payload.messages.length,
      });

      const userSystemPrompt = await getUserSystemPrompt(payload.userId);

      const result = await langChainAgentService.run({
        conversationId: payload.conversationId,
        userId: payload.userId,
        messages: payload.messages,
        model: payload.model,
        attachedFile: payload.attachedFile,
        userSystemPrompt,
      });

      console.error("[chatService.createReply] agent result", {
        conversationId: result.conversationId,
        answerPreview: result.response.answer.slice(0, 200),
        toolInvocations: result.toolInvocations.map((item) => item.toolName),
      });

      return {
        conversationId: result.conversationId,
        reply: {
          id: randomUUID(),
          role: "assistant",
          content: result.response.answer,
          createdAt: new Date().toISOString(),
          attachments: payload.attachedFiles?.length
            ? payload.attachedFiles
            : payload.attachedFile
              ? [payload.attachedFile]
              : undefined,
        },
        agent: result.response,
        toolInvocations: result.toolInvocations,
      };
    } catch (error) {
      console.error("[chatService.createReply] tool-calling agent failed", error, {
        userId: payload.userId,
        conversationId: payload.conversationId,
      });

      logError("chatService.createReply", error, { userId: payload.userId });
      return {
        conversationId: payload.conversationId ?? randomUUID(),
        reply: {
          id: randomUUID(),
          role: "assistant",
          content: `I couldn't run the tool-calling agent: ${getErrorMessage(error)}`,
          createdAt: new Date().toISOString(),
        },
      };
    }
  }
}

export const chatService = new LangChainChatService();
