export function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  console.error("[getErrorMessage] Non-Error exception", error);
  return "An unexpected error occurred.";
}

export function logError(context: string, error: unknown, details?: Record<string, unknown>) {
  const payload = details && Object.keys(details).length ? details : undefined;

  if (error instanceof Error) {
    console.error(`[${context}]`, error.message, payload);
    return;
  }

  console.error(`[${context}]`, error, payload);
}
