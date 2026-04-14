import type { User } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/types";

type SystemPromptRow = {
  system_prompt: string | null;
};

function isMissingSystemPromptSchemaError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    error?.message?.includes("system_prompt") ||
    error?.message?.includes("schema cache") ||
    error?.message?.includes("profiles")
  );
}

function mapUserToProfile(user: User): UserProfile {
  const metadata = user.user_metadata;

  return {
    id: user.id,
    email: user.email ?? null,
    full_name:
      (typeof metadata.full_name === "string" && metadata.full_name) ||
      (typeof metadata.name === "string" && metadata.name) ||
      null,
    avatar_url:
      (typeof metadata.avatar_url === "string" && metadata.avatar_url) || null,
    last_sign_in_at: new Date().toISOString(),
  };
}

export async function upsertUserProfile(user: User) {
  const supabase = createSupabaseAdminClient();
  const profile = mapUserToProfile(user);

  const { error } = await supabase.from("profiles").upsert(profile, {
    onConflict: "id",
  });

  if (error) {
    throw error;
  }

  return profile;
}

export async function getUserSystemPrompt(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("system_prompt")
    .eq("id", userId)
    .maybeSingle<SystemPromptRow>();

  if (error) {
    if (isMissingSystemPromptSchemaError(error)) {
      return "";
    }

    throw error;
  }

  return typeof data?.system_prompt === "string" ? data.system_prompt : "";
}

export async function saveUserSystemPrompt(userId: string, systemPrompt: string) {
  const supabase = createSupabaseAdminClient();
  const normalizedPrompt = systemPrompt.trim();

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      system_prompt: normalizedPrompt || null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    throw error;
  }

  return normalizedPrompt;
}
