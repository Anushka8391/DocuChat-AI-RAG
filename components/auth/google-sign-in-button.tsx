"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface GoogleSignInButtonProps {
  next?: string;
}

export function GoogleSignInButton({
  next = "/chat",
}: GoogleSignInButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const redirectTo = useMemo(() => {
    const browserOrigin = typeof window === "undefined" ? "" : window.location.origin;
    const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
    const baseUrl =
      configuredBaseUrl && !configuredBaseUrl.includes("localhost")
        ? configuredBaseUrl
        : browserOrigin;

    return `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`;
  }, [next]);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        size="lg"
        className="w-full rounded-2xl"
        onClick={handleSignIn}
        disabled={isLoading}
      >
        {isLoading ? "Redirecting..." : "Continue with Google"}
      </Button>

      <p className="text-xs text-slate-400">
        Secure sign-in powered by Google OAuth and Supabase Auth.
      </p>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
