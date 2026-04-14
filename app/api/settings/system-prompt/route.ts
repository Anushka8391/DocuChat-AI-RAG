import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import { getUserSystemPrompt, saveUserSystemPrompt } from "@/services/auth/profile.service";
import type { ApiError, SystemPromptResponse } from "@/types";

export const dynamic = "force-dynamic";

const MAX_SYSTEM_PROMPT_LENGTH = 4000;

function isMissingSystemPromptSchemaError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    error?.message?.includes("system_prompt") ||
    error?.message?.includes("schema cache")
  );
}

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    const payload: ApiError = {
      error: "Unauthorized.",
      details: "Please sign in to view custom instructions.",
    };

    return NextResponse.json(payload, { status: 401 });
  }

  try {
    const systemPrompt = await getUserSystemPrompt(user.id);
    const payload: SystemPromptResponse = {
      systemPrompt,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const payload: ApiError = {
      error: "Unable to load custom instructions.",
      details: getErrorMessage(error),
    };

    return NextResponse.json(payload, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    const payload: ApiError = {
      error: "Unauthorized.",
      details: "Please sign in to save custom instructions.",
    };

    return NextResponse.json(payload, { status: 401 });
  }

  try {
    const body = (await request.json()) as { systemPrompt?: unknown };

    if (body.systemPrompt !== undefined && typeof body.systemPrompt !== "string") {
      const payload: ApiError = {
        error: "Invalid settings payload.",
        details: "`systemPrompt` must be a string.",
      };

      return NextResponse.json(payload, { status: 400 });
    }

    const normalizedPrompt = (body.systemPrompt ?? "").trim().slice(0, MAX_SYSTEM_PROMPT_LENGTH);
    const savedPrompt = await saveUserSystemPrompt(user.id, normalizedPrompt);

    const payload: SystemPromptResponse = {
      systemPrompt: savedPrompt,
      message: savedPrompt ? "Custom instructions saved." : "Custom instructions cleared.",
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const details = isMissingSystemPromptSchemaError(error as { code?: string; message?: string })
      ? "Run the `supabase/migrations/20260411_add_system_prompt_to_profiles.sql` migration, then save again."
      : getErrorMessage(error);

    const payload: ApiError = {
      error: "Unable to save custom instructions.",
      details,
    };

    return NextResponse.json(payload, { status: 500 });
  }
}
