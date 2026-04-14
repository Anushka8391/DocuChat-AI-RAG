import { redirect } from "next/navigation";

import { ChatShell } from "@/components/chat/chat-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserSystemPrompt } from "@/services/auth/profile.service";

export const dynamic = "force-dynamic";

function getDisplayName(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const candidate = metadata as Record<string, unknown>;

  if (typeof candidate.full_name === "string") {
    return candidate.full_name;
  }

  if (typeof candidate.name === "string") {
    return candidate.name;
  }

  return null;
}

export default async function ChatPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/chat");
  }

  const initialSystemPrompt = await getUserSystemPrompt(user.id);

  return (
    <ChatShell
      user={{
        email: user.email ?? null,
        name: getDisplayName(user.user_metadata),
      }}
      initialSystemPrompt={initialSystemPrompt}
    />
  );
}
