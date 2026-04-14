"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { FileUpload } from "@/components/upload/file-upload";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import type { ChatMessage, UploadedFileMetadata } from "@/types";

import { SystemPromptConfig } from "./system-prompt-config";

interface ChatShellProps {
  user: {
    email: string | null;
    name: string | null;
  };
  initialSystemPrompt?: string;
}

type ThemeMode = "dark" | "light" | "system";

const THEME_STORAGE_KEY = "agentic-rag-theme";

const suggestionPrompts = [
  "What is the current date and time?",
  "What's today's weather in Mumbai?",
  "Summarize this file",
  "Plan the next feature",
  "What's the weather in New York?",
  "Analyze the uploaded document",
  "Give me a quick summary",
  "What files do I have?",
  "Help me brainstorm ideas",
  "Explain this concept simply",
  "Create an outline for me",
  "Give me today's weather forecast",
];

function getRandomSuggestions(prompts: string[], count: number = 4): string[] {
  const shuffled = [...prompts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const initialMessages: ChatMessage[] = [];

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatConversationDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("") || "AR";
}

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3.5 18.5 7v10L12 20.5 5.5 17V7L12 3.5Z" />
      <path d="m8.5 9.5 3.5 2 3.5-2" />
      <path d="M12 11.5V16" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 19 0-14" />
      <path d="m6 11 6-6 6 6" />
    </svg>
  );
}

function SidebarToggleIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
      <path d="M9 4v16" />
      {isOpen ? <path d="m15 9-3 3 3 3" /> : <path d="m12 9 3 3-3 3" />}
    </svg>
  );
}

export function ChatShell({ user, initialSystemPrompt = "" }: ChatShellProps) {
  const [draft, setDraft] = useState("");
  const [attachedFile, setAttachedFile] = useState<UploadedFileMetadata | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "system";
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "dark" || storedTheme === "light" || storedTheme === "system"
      ? storedTheme
      : "system";
  });
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const {
    conversationId,
    conversations,
    isLoading,
    loadConversation,
    messages,
    sendMessage,
    startNewChat,
  } = useChat(initialMessages);

  const displayName = useMemo(() => {
    if (user.name) {
      return user.name;
    }

    if (user.email) {
      return user.email.split("@")[0];
    }

    return "You";
  }, [user.email, user.name]);

  const isEmptyState = messages.length === 0 && !isLoading;
  const [quickPrompts, setQuickPrompts] = useState<string[]>([]);
  const themeOptions: Array<{ value: ThemeMode; label: string }> = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
    { value: "system", label: "Desktop" },
  ];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuickPrompts(getRandomSuggestions(suggestionPrompts, 4));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const nextTheme = themeMode === "system"
        ? (mediaQuery.matches ? "dark" : "light")
        : themeMode;

      document.documentElement.dataset.theme = nextTheme;
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    };

    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);

    return () => {
      mediaQuery.removeEventListener("change", applyTheme);
    };
  }, [themeMode]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isLoading, messages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const value = draft.trim();
    if (!value || isLoading) {
      return;
    }

    setDraft("");
    await sendMessage(value, { attachedFile });
    setAttachedFile(null);
  };

  return (
    <div className="relative h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-10rem] h-[22rem] w-[22rem] rounded-full bg-[var(--accent-soft)] blur-3xl" />
        <div className="absolute bottom-[-12rem] right-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[color:var(--accent-secondary-soft)] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      <div
        className={cn(
          "relative grid h-full min-h-0 transition-[grid-template-columns] duration-200",
          isSidebarOpen ? "lg:grid-cols-[296px_minmax(0,1fr)]" : "lg:grid-cols-[0_minmax(0,1fr)]",
        )}
      >
        <aside
          className={cn(
            "hidden min-h-0 overflow-hidden border-r border-[color:var(--border)] bg-[var(--panel-strong)]/88 transition-all duration-200 lg:flex lg:flex-col backdrop-blur-2xl",
            isSidebarOpen ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-4 opacity-0",
          )}
        >
          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm" title="AgenticRAG - AI Chat with File Upload">
                <LogoIcon className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-lg font-bold tracking-tight text-[var(--foreground)]">AgenticRAG</p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex"
              aria-label="Hide sidebar"
              onClick={() => setIsSidebarOpen(false)}
            >
              <SidebarToggleIcon isOpen={isSidebarOpen} />
            </Button>
          </div>

          <div className="px-3 pb-3">
            <Button
                type="button"
                variant="secondary"
                className="w-full justify-start gap-2 rounded-2xl border border-[color:var(--border)] bg-[var(--surface)]"
                onClick={() => {
                  setDraft("");
                  setAttachedFile(null);
                  startNewChat();
                }}
              >
                <PlusIcon className="h-4 w-4" />
                New chat
              </Button>
          </div>

          <div className="px-4 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Recent chats
            </p>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
            {conversations.length === 0 ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-4 text-sm text-[var(--muted)]">
                No saved chats yet.
              </div>
            ) : (
              conversations.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => {
                    setAttachedFile(null);
                    void loadConversation(thread.id);
                  }}
                  className={cn(
                    "w-full rounded-2xl border px-3 py-3 text-left transition",
                    conversationId === thread.id
                      ? "border-emerald-500/35 bg-[var(--accent-soft)]"
                      : "border-[color:var(--border)] bg-[var(--surface)] hover:opacity-90",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">{thread.title}</p>
                    <span className="shrink-0 text-[10px] text-[var(--muted)]" suppressHydrationWarning>
                      {formatConversationDate(thread.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{thread.preview}</p>
                </button>
              ))
            )}
          </div>



          <div ref={profileMenuRef} className="relative px-3 pb-3 pt-2">
            {isProfileMenuOpen ? (
              <div className="absolute bottom-[76px] left-3 right-3 z-20 rounded-2xl border border-[color:var(--border)] bg-[var(--panel-strong)] p-2 shadow-2xl backdrop-blur">
                <button
                  type="button"
                  className="flex w-full items-center rounded-xl px-3 py-2 text-sm text-[var(--foreground)] transition hover:bg-black/5 dark:hover:bg-white/5"
                  onClick={() => window.location.assign("/login")}
                >
                  Add account
                </button>

                <button
                  type="button"
                  className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-sm text-[var(--foreground)] transition hover:bg-black/5 dark:hover:bg-white/5"
                  onClick={() => {
                    setShowSystemPrompt((current) => !current);
                    setIsProfileMenuOpen(false);
                  }}
                >
                  {showSystemPrompt ? "Hide custom instructions" : "Custom instructions"}
                </button>

                <div className="mt-2 rounded-xl border border-[color:var(--border)] p-2">
                  <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    Theme
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    {themeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setThemeMode(option.value)}
                        className={cn(
                          "rounded-xl px-2 py-2 text-xs font-medium transition",
                          themeMode === option.value
                            ? "bg-emerald-600 text-white"
                            : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <LogoutButton
                  variant="ghost"
                  className="mt-2 justify-start rounded-xl px-3 text-[var(--foreground)]"
                />
              </div>
            ) : null}

            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-3 text-left transition hover:opacity-90"
              onClick={() => setIsProfileMenuOpen((current) => !current)}
            >
              <Avatar fallback={getInitials(displayName)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">{displayName}</p>
                <p className="truncate text-xs text-[var(--muted)]">{user.email ?? "Signed in"}</p>
              </div>
              <span className="text-lg leading-none text-[var(--muted)]">⋯</span>
            </button>
          </div>
        </aside>

        <section className="flex h-full min-h-0 flex-col overflow-hidden">
          <header className="border-b border-[color:var(--border)]/30 bg-transparent px-4 py-3 backdrop-blur-sm md:px-6">
            <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="inline-flex"
                aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <SidebarToggleIcon isOpen={isSidebarOpen} />
              </Button>

              <p className="text-lg font-bold tracking-tight text-[var(--foreground)]">AgenticRAG</p>

              <Badge className="border-transparent bg-[var(--accent-soft)] text-[var(--accent)] text-xs">
                Version 1.0
              </Badge>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 md:px-6 lg:py-12">
              {showSystemPrompt ? (
                <SystemPromptConfig initialSystemPrompt={initialSystemPrompt} defaultOpen />
              ) : null}

              {isEmptyState ? (
                <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 text-center">
                  <div>
                    <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                      How can I help?
                    </h1>
                    <p className="mt-3 text-sm text-[var(--muted)]">
                      Ask about anything, summarize files, or get live information
                    </p>
                  </div>

                  <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setDraft(prompt)}
                        className="group rounded-xl border border-[color:var(--border)]/60 bg-[var(--surface)]/50 px-4 py-3 text-left text-sm text-[var(--foreground)] transition hover:border-[color:var(--accent)]/40 hover:bg-[var(--surface)]/80"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => {
                    const isUser = message.role === "user";

                    return (
                      <article
                        key={message.id}
                        className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
                      >
                        {!isUser ? <Avatar className="mt-1 hidden sm:inline-flex" fallback="AR" /> : null}

                        <div
                          className={cn(
                            "max-w-3xl rounded-[28px] px-4 py-3.5 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.55)]",
                            isUser
                              ? "bg-[linear-gradient(135deg,var(--accent),var(--accent-secondary))] text-white"
                              : "border border-[color:var(--border)] bg-[var(--surface)]/95 text-[var(--foreground)] backdrop-blur-xl",
                          )}
                        >
                          <div className="mb-1 flex items-center gap-2 text-xs">
                            <span className="font-semibold">{isUser ? displayName : "AgenticRAG"}</span>
                            <time
                              dateTime={message.createdAt}
                              suppressHydrationWarning
                              className={isUser ? "text-emerald-50/80" : "text-[var(--muted)]"}
                            >
                              {formatTime(message.createdAt)}
                            </time>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                        </div>
                      </article>
                    );
                  })}

                  {isLoading ? (
                    <article className="flex justify-start gap-3">
                      <Avatar className="mt-1 hidden sm:inline-flex" fallback="AR" />
                      <div className="max-w-md rounded-[28px] border border-[color:var(--border)] bg-[var(--surface)]/95 px-4 py-3 text-sm text-[var(--muted)] shadow-[0_24px_60px_-40px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex gap-1">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.3s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.15s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" />
                          </span>
                          Thinking...
                        </div>
                      </div>
                    </article>
                  ) : null}
                </>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-[color:var(--border)] bg-[var(--panel)]/72 px-4 py-4 backdrop-blur-2xl md:px-6">
            <Card className="mx-auto w-full max-w-5xl rounded-[32px] border-[color:var(--border)] bg-[var(--panel-strong)]/92 shadow-[0_36px_100px_-56px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
              <CardContent className="p-2.5 md:p-3">
                <form onSubmit={handleSubmit} className="space-y-3">
                  {attachedFile ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-[var(--accent-soft)] px-3 py-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className="border-emerald-500/20 bg-transparent text-[var(--foreground)]">
                            Attached
                          </Badge>
                          <p className="truncate text-sm font-medium text-[var(--foreground)]">
                            {attachedFile.name}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {attachedFile.extension.toUpperCase()} • {formatBytes(attachedFile.size)} • ready for retrieval
                        </p>
                      </div>

                      <Button type="button" variant="ghost" size="sm" onClick={() => setAttachedFile(null)}>
                        Remove
                      </Button>
                    </div>
                  ) : null}

                  <div className="flex items-end gap-2.5">
                    <FileUpload
                      variant="compact"
                      className="shrink-0"
                      selectedFile={attachedFile}
                      onUploadComplete={setAttachedFile}
                    />

                    <div className="flex-1 rounded-[24px] border border-[color:var(--border)] bg-[var(--surface)]/75 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <label htmlFor="message" className="sr-only">
                        Message
                      </label>
                      <Textarea
                        id="message"
                        rows={2}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Ask anything"
                        className="max-h-40 min-h-[56px] resize-none border-0 bg-transparent px-0 py-2 shadow-none focus-visible:ring-0"
                      />
                    </div>

                    <Button
                      type="submit"
                      size="icon"
                      disabled={isLoading || !draft.trim()}
                      className="h-11 w-11 rounded-full"
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 px-1">
                    <p className="text-xs text-[var(--muted)]">
                      {attachedFile
                        ? "Your file is attached and will stay visible until you send or remove it."
                        : "Use the paperclip to attach `.md` or `.txt` files."}
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
