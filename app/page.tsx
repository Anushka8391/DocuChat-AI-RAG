import Link from "next/link";

import { Button } from "@/components/ui/button";

function LogoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M12 3.5 18.5 7v10L12 20.5 5.5 17V7L12 3.5Z" />
      <path d="m8.5 9.5 3.5 2 3.5-2" />
      <path d="M12 11.5V16" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] px-4 py-10 text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-6rem] top-[-8rem] h-[20rem] w-[20rem] rounded-full bg-[var(--accent-soft)] blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-6rem] h-[22rem] w-[22rem] rounded-full bg-[color:var(--accent-secondary-soft)] blur-3xl" />
      </div>

      <section className="relative w-full max-w-xl rounded-[34px] border border-[color:var(--border)] bg-[var(--panel)]/90 p-8 shadow-[0_40px_100px_-56px_rgba(0,0,0,0.72)] backdrop-blur-2xl md:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_24px_50px_-28px_rgba(0,0,0,0.5)]">
          <LogoIcon />
        </div>

        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          AgenticRAG
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          AI chat grounded in your files.
        </h1>

        <p className="mt-4 text-sm leading-7 text-[var(--muted)] md:text-base">
          Ask questions about your documents, get live date and weather answers, and have natural conversations — all in one clean workspace.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/chat">
            <Button className="min-w-44">Open chat</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="min-w-44">
              Sign in
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
