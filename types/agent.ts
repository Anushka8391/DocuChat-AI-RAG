export interface AgentToolInvocation {
  toolName: string;
  toolInput: string;
  toolOutput?: string;
}

export interface AgentStructuredResponse {
  answer: string;
  reasoning: string;
  sources: string[];
  usedTools: string[];
}

export interface AgentRunResult {
  conversationId: string;
  response: AgentStructuredResponse;
  toolInvocations: AgentToolInvocation[];
}
