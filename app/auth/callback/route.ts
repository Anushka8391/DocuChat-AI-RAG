import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { upsertUserProfile } from "@/services/auth/profile.service";

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/chat";
  }

  return next;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeNextPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=oauth_callback", url.origin));
  }

  try {
    await upsertUserProfile(data.user);
  } catch (profileError) {
    console.warn("Profile sync skipped during auth callback.", profileError);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
