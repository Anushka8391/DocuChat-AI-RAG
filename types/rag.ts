export interface RagIndexInput {
  fileId: string;
  userId: string;
  fileName: string;
  storagePath: string;
  bucketName?: string;
}

export interface RagIndexResult {
  fileId: string;
  chunkCount: number;
  message: string;
}

export interface RagQueryInput {
  userId: string;
  query: string;
  matchCount?: number;
  model?: string;
  fileId?: string;
  fileName?: string;
}

export interface RagMatch {
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

export interface RagAnswerResult {
  answer: string;
  matches: RagMatch[];
  warning?: string;
}
