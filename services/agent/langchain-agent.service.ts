import { randomUUID } from "node:crypto";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";

import { env } from "@/lib/env";
import type { AgentRunResult, AgentStructuredResponse, AgentToolInvocation } from "@/types/agent";
import type { ChatMessage } from "@/types/chat";
import type { UploadedFileMetadata } from "@/types/file";

import { agentChatMemory } from "./chat-memory.service";
import { createAgentTools } from "./tool-registry.service";

const DEFAULT_CHAT_MODEL = "gemini-2.5-flash";
const MAX_CONTEXT_MESSAGES = 10;

const AGENT_SYSTEM_PROMPT = `You are a polished AI assistant with tool calling.

Available tools:
- retrieval_search: use this when the answer should be grounded in uploaded documents.
- calculator: use this for arithmetic or numeric reasoning.
- current_datetime: use this for current date, time, weekday, month, year, and other time-sensitive requests.
- weather_lookup: use this for current weather or today's forecast when the user provides a location.

Style rules:
- Write with the quality bar of ChatGPT or Gemini: clear, natural, confident, and helpful.
- Lead with the answer. Add brief supporting detail only when it improves usefulness.
- Do not mention internal tools, hidden reasoning, JSON formatting, or implementation details unless the user explicitly asks.
- If an attached file is provided, treat it as the primary context.
- If the user asks to describe or summarize a file, give the useful content, not metadata only.
- Use markdown only when it improves readability.
- If the user asks for weather without a location, ask a short follow-up question for the city or place.

Execution rules:
1. Decide yourself whether a tool is needed.
2. Use retrieval_search for file-based questions.
3. If an attached file is provided, use retrieval_search before answering.
4. Use calculator for computations.
5. Use current_datetime for current date or time requests.
6. Use weather_lookup for weather requests with a specified location.
7. If no tool is needed, answer directly.
8. Return ONLY valid JSON with this structure:
{{"answer":"string","reasoning":"short string","sources":["source names"],"usedTools":["tool names"]}}
9. Do not wrap the JSON in markdown fences.`;

function getLatestUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user") ?? null;
}

function getHistoryMessages(messages: ChatMessage[]): ChatMessage[] {
  const lastUserIndex = [...messages].map((message) => message.role).lastIndexOf("user");

  if (lastUserIndex <= 0) {
    return [];
  }

  const history = messages.slice(0, lastUserIndex);

  if (history.length <= MAX_CONTEXT_MESSAGES) {
    return history;
  }

  const recentHistory = history.slice(-MAX_CONTEXT_MESSAGES);
  const omittedCount = history.length - recentHistory.length;

  return [
    {
      id: `context-window-${omittedCount}`,
      role: "system",
      content:
        `Earlier conversation exists, but ${omittedCount} older messages were omitted to save tokens. Prioritize the recent context and the latest user request.`,
      createdAt: recentHistory[0]?.createdAt ?? new Date().toISOString(),
    },
    ...recentHistory,
  ];
}

function buildAgentInput(message: string, attachedFile?: UploadedFileMetadata | null) {
  if (!attachedFile) {
    return message;
  }

  return [
    message,
    "",
    "Attached file context:",
    `- fileName: ${attachedFile.name}`,
    `- fileId: ${attachedFile.id}`,
    `- extension: ${attachedFile.extension}`,
    "If the user refers to 'this' or the attached document, ground the answer in this file.",
  ].join("\n");
}

function extractJsonBlock(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return null;
}

function extractToolInvocations(intermediateSteps: unknown): AgentToolInvocation[] {
  if (!Array.isArray(intermediateSteps)) {
    return [];
  }

  return intermediateSteps.map((step) => {
    const candidate = step as {
      action?: {
        tool?: string;
        toolInput?: unknown;
      };
      observation?: unknown;
    };

    return {
      toolName: String(candidate.action?.tool ?? "unknown"),
      toolInput:
        typeof candidate.action?.toolInput === "string"
          ? candidate.action.toolInput
          : JSON.stringify(candidate.action?.toolInput ?? {}),
      toolOutput:
        typeof candidate.observation === "string"
          ? candidate.observation
          : JSON.stringify(candidate.observation ?? ""),
    };
  });
}

function parseStructuredResponse(
  rawOutput: string,
  toolInvocations: AgentToolInvocation[],
): AgentStructuredResponse {
  const fallbackUsedTools = [...new Set(toolInvocations.map((item) => item.toolName).filter(Boolean))];
  const jsonBlock = extractJsonBlock(rawOutput);

  if (jsonBlock) {
    try {
      const parsed = JSON.parse(jsonBlock) as Partial<AgentStructuredResponse>;

      return {
        answer: typeof parsed.answer === "string" ? parsed.answer : rawOutput.trim(),
        reasoning:
          typeof parsed.reasoning === "string"
            ? parsed.reasoning
            : "Final response generated by the agent.",
        sources: Array.isArray(parsed.sources) ? parsed.sources.map(String) : [],
        usedTools:
          Array.isArray(parsed.usedTools) && parsed.usedTools.length
            ? parsed.usedTools.map(String)
            : fallbackUsedTools,
      };
    } catch {
      // Fall through to the plain-text fallback.
    }
  }

  return {
    answer: rawOutput.trim(),
    reasoning: "Final response generated by the agent.",
    sources: [],
    usedTools: fallbackUsedTools,
  };
}

class LangChainToolAgentService {
  private createPrompt(userSystemPrompt?: string | null) {
    const normalizedUserPrompt = userSystemPrompt?.trim();
    const systemPrompt = normalizedUserPrompt
      ? `${AGENT_SYSTEM_PROMPT}\n\nUser custom instructions:\n${normalizedUserPrompt}\n\nFollow these custom instructions unless the user explicitly overrides them in the current message.`
      : AGENT_SYSTEM_PROMPT;

    return ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["placeholder", "{chat_history}"],
      ["human", "{input}"],
      ["placeholder", "{agent_scratchpad}"],
    ]);
  }

  private createModel(requestedModel?: string) {
    const apiKey = env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("Missing `GEMINI_API_KEY` (or `OPENAI_API_KEY`) in `.env.local`.");
    }

    const modelName = requestedModel ?? env.OPENAI_MODEL;

    return new ChatGoogleGenerativeAI({
      apiKey,
      model: modelName.startsWith("gemini") ? modelName : DEFAULT_CHAT_MODEL,
      temperature: 0.2,
    });
  }

  async run(input: {
    conversationId?: string;
    userId: string;
    messages: ChatMessage[];
    model?: string;
    attachedFile?: UploadedFileMetadata | null;
    userSystemPrompt?: string | null;
  }): Promise<AgentRunResult> {
    const conversationId = input.conversationId ?? randomUUID();
    const latestUserMessage = getLatestUserMessage(input.messages);

    if (!latestUserMessage) {
      return {
        conversationId,
        response: {
          answer: "Ask a question and I will decide which tools to use.",
          reasoning: "No user input was provided yet.",
          sources: [],
          usedTools: [],
        },
        toolInvocations: [],
      };
    }

    const history = await agentChatMemory.prepareHistory(
      conversationId,
      getHistoryMessages(input.messages),
    );

    const tools = createAgentTools({
      userId: input.userId,
      model: input.model,
      attachedFile: input.attachedFile,
    });

    const agent = createToolCallingAgent({
      llm: this.createModel(input.model) as never,
      tools,
      prompt: this.createPrompt(input.userSystemPrompt),
    });

    const executor = new AgentExecutor({
      agent,
      tools,
      returnIntermediateSteps: true,
      maxIterations: 6,
      handleParsingErrors: true,
    });

    const result = (await executor.invoke({
      input: buildAgentInput(latestUserMessage.content, input.attachedFile),
      chat_history: await history.getMessages(),
    })) as {
      output?: unknown;
      intermediateSteps?: unknown;
    };

    const toolInvocations = extractToolInvocations(result.intermediateSteps);
    const response = parseStructuredResponse(String(result.output ?? ""), toolInvocations);

    await agentChatMemory.appendExchange(
      conversationId,
      latestUserMessage.content,
      response.answer,
    );

    return {
      conversationId,
      response,
      toolInvocations,
    };
  }
}

export const langChainAgentService = new LangChainToolAgentService();
