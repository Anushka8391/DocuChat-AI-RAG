import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";

import type { ChatMessage } from "@/types";

function toBaseMessage(message: ChatMessage): BaseMessage | null {
  if (message.role === "user") {
    return new HumanMessage({ content: message.content });
  }

  if (message.role === "assistant") {
    return new AIMessage({ content: message.content });
  }

  return null;
}

class AgentChatMemoryService {
  private readonly histories = new Map<string, InMemoryChatMessageHistory>();

  private getOrCreate(conversationId: string) {
    if (!this.histories.has(conversationId)) {
      this.histories.set(conversationId, new InMemoryChatMessageHistory());
    }

    return this.histories.get(conversationId)!;
  }

  async prepareHistory(conversationId: string, messages: ChatMessage[]) {
    const history = this.getOrCreate(conversationId);
    await history.clear();

    const normalizedMessages = messages
      .map(toBaseMessage)
      .filter((message): message is BaseMessage => message !== null);

    if (normalizedMessages.length) {
      await history.addMessages(normalizedMessages);
    }

    return history;
  }

  async appendExchange(conversationId: string, userInput: string, assistantOutput: string) {
    const history = this.getOrCreate(conversationId);
    await history.addUserMessage(userInput);
    await history.addAIMessage(assistantOutput);
  }

  async clear(conversationId: string) {
    const history = this.getOrCreate(conversationId);
    await history.clear();
  }
}

export const agentChatMemory = new AgentChatMemoryService();
