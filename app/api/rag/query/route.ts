import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import { ragService } from "@/services/rag/rag.service";
import type { ApiError, RagAnswerResult } from "@/types";

export const dynamic = "force-dynamic";

function isRagQueryBody(
  value: unknown,
): value is { query: string; matchCount?: number; model?: string } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    query?: unknown;
    matchCount?: unknown;
    model?: unknown;
  };

  return (
    typeof candidate.query === "string" &&
    (candidate.matchCount === undefined || typeof candidate.matchCount === "number") &&
    (candidate.model === undefined || typeof candidate.model === "string")
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const payload: ApiError = {
        error: "Unauthorized.",
        details: "Sign in to run retrieval queries.",
      };

      return NextResponse.json(payload, { status: 401 });
    }

    const body: unknown = await request.json();

    if (!isRagQueryBody(body)) {
      const payload: ApiError = {
        error: "Invalid query payload.",
        details: "Expected an object with a `query` string.",
      };

      return NextResponse.json(payload, { status: 400 });
    }

    const result: RagAnswerResult = await ragService.answerQuestion({
      userId: user.id,
      query: body.query,
      matchCount: body.matchCount,
      model: body.model,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const payload: ApiError = {
      error: "Unable to run the retrieval query.",
      details: getErrorMessage(error),
    };

    return NextResponse.json(payload, { status: 500 });
  }
}
