export interface ApiError {
  error: string;
  details?: string;
}

export interface ApiHealthCheck {
  status: "ok";
  service: string;
  timestamp: string;
}

export interface SystemPromptResponse {
  systemPrompt: string;
  message?: string;
}
