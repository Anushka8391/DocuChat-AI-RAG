import { randomUUID } from "node:crypto";

import { getErrorMessage } from "@/lib/utils";
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
      const userSystemPrompt = await getUserSystemPrompt(payload.userId);

      const result = await langChainAgentService.run({
        conversationId: payload.conversationId,
        userId: payload.userId,
        messages: payload.messages,
        model: payload.model,
        attachedFile: payload.attachedFile,
        userSystemPrompt,
      });

      return {
        conversationId: result.conversationId,
        reply: {
          id: randomUUID(),
          role: "assistant",
          content: result.response.answer,
          createdAt: new Date().toISOString(),
        },
        agent: result.response,
        toolInvocations: result.toolInvocations,
      };
    } catch (error) {
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
