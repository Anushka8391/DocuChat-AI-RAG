import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
}

const securityNotes = [
  "Protected routes stay private after sign-in",
  "Supabase stores the session in secure cookies",
  "Google OAuth returns you directly to the chat workspace",
];

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next ?? "/chat";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-6">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="hidden border-violet-500/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.18),transparent_0,transparent_40%),rgba(2,6,23,0.92)] lg:block">
          <CardContent className="flex h-full flex-col justify-between p-8">
            <div>
              <Badge>Secure access</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
                Sign in to your AI workspace.
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Fast, secure access to a simple workspace designed for focused chat and real work.
              </p>
            </div>

            <div className="space-y-3">
              {securityNotes.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/85">
          <CardHeader>
            <Badge className="w-fit">Supabase Authentication</Badge>
            <CardTitle className="text-3xl">Continue with Google</CardTitle>
            <CardDescription>
              Use your Google account to enter the protected chat route and keep the session active.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {params.error ? (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                Sign-in could not be completed. Please try again.
              </p>
            ) : null}

            <GoogleSignInButton next={next} />

            <Link
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/10 bg-slate-900/70 px-4 text-sm font-medium text-slate-100 transition hover:bg-slate-900"
              href="/"
            >
              Back home
            </Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
