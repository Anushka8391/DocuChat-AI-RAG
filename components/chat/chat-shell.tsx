"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import type { ChatMessage, UploadedFileMetadata } from "@/types";

import { MessageMarkdown } from "./message-markdown";

interface ChatShellProps {
  user: {
    email: string | null;
    name: string | null;
  };
  initialSystemPrompt?: string;
}

type ThemeMode = "dark" | "light";
type ProfilePanelView = "chats" | "archived";

const THEME_STORAGE_KEY = "agentic-rag-theme";
const initialMessages: ChatMessage[] = [];

const promptSuggestionPool = [
  "Summarize my uploaded notes",
  "Answer from my md file",
  "Help fix my Next.js bug",
  "Calculate 18% GST on 2450",
  "What is 25% of 8,400?",
  "Split 12,500 among 5 people",
  "Explain this code simply",
  "Make my text shorter and clear",
];

function getRandomSuggestions(count: number = 4) {
  return [...promptSuggestionPool]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

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
    .join("") || "AI";
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
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M8.5 8h.01" />
      <path d="M11 8h6" />
      <path d="M8.5 12h.01" />
      <path d={isOpen ? "M11 12h6" : "M11 12h3.5"} />
      <path d="M8.5 16h.01" />
      <path d={isOpen ? "M11 16h4" : "M11 16h6"} />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
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
      <path d="M4 12h14" />
      <path d="m12 6 6 6-6 6" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
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
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

function ComposeIcon({ className }: { className?: string }) {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function PaperclipIcon({ className }: { className?: string }) {
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
      <path d="M21.44 11.05 12.25 20.24a6 6 0 1 1-8.49-8.49l9.55-9.54a4 4 0 0 1 5.66 5.65l-9.9 9.9a2 2 0 1 1-2.83-2.82l8.84-8.84" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
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
      <path d="m12 17 4 4" />
      <path d="m14 3 7 7-3 1-3 3-1 3-7-7 3-1 3-3Z" />
    </svg>
  );
}

function ArchiveIcon({ className }: { className?: string }) {
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
      <path d="M3 7h18" />
      <path d="M5 7h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
      <path d="M9 12h6" />
      <path d="M4 4h16v3H4Z" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
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
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function ThumbsUpIcon({ className }: { className?: string }) {
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
      <path d="M7 10v10" />
      <path d="M12 21h5.2a2 2 0 0 0 2-1.6l1.1-5.2a2 2 0 0 0-2-2.4H14V7.5A2.5 2.5 0 0 0 11.5 5L7 10v11h5Z" />
    </svg>
  );
}

function ThumbsDownIcon({ className }: { className?: string }) {
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
      <path d="M7 14V4" />
      <path d="M12 3H6.8a2 2 0 0 0-2 1.6L3.7 9.8a2 2 0 0 0 2 2.4H10v4.3A2.5 2.5 0 0 0 12.5 19L17 14V3h-5Z" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
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
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
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
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function HoverHint({
  label,
  side = "right",
}: {
  label: string;
  side?: "right" | "bottom";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute z-[60] inline-flex items-center justify-center whitespace-nowrap rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(17,24,39,0.96))] px-3 py-1.5 text-[11px] font-medium tracking-[0.02em] text-white opacity-0 shadow-[0_18px_45px_-18px_rgba(16,185,129,0.55)] backdrop-blur-xl transition duration-200 group-hover/icon:opacity-100",
        side === "bottom"
          ? "left-1/2 top-full mt-2 -translate-x-1/2 -translate-y-1 group-hover/icon:translate-y-0"
          : "left-full top-1/2 ml-2 -translate-y-1/2 translate-x-1 group-hover/icon:translate-x-0",
      )}
    >
      {label}
    </span>
  );
}

export function ChatShell({ user }: ChatShellProps) {
  const [draft, setDraft] = useState("");
  const [attachedFile, setAttachedFile] = useState<UploadedFileMetadata | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAccountDetailsOpen, setIsAccountDetailsOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [sharedMessageId, setSharedMessageId] = useState<string | null>(null);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, "like" | "dislike" | undefined>>({});
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [activeConversationMenuId, setActiveConversationMenuId] = useState<string | null>(null);
  const [pinnedConversationIds, setPinnedConversationIds] = useState<string[]>([]);
  const [archivedConversationIds, setArchivedConversationIds] = useState<string[]>([]);
  const [profilePanelView, setProfilePanelView] = useState<ProfilePanelView>("chats");
  const [archiveNotice, setArchiveNotice] = useState<string | null>(null);
  const [visibleSuggestions, setVisibleSuggestions] = useState<string[]>(() => getRandomSuggestions());
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "dark" || storedTheme === "light"
      ? storedTheme
      : "dark";
  });
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const {
    conversationId,
    conversations,
    isLoading,
    loadConversation,
    messages,
    sendMessage,
    startNewChat,
    renameConversation,
    deleteConversation,
    regenerateLastResponse,
  } = useChat(initialMessages);

  const displayName = useMemo(() => {
    if (user.name?.trim()) {
      return user.name;
    }

    if (user.email) {
      return user.email
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    return "Guest";
  }, [user.email, user.name]);

  const displaySubtitle = user.email ?? "Signed in";
  const isEmptyState = messages.length === 0 && !isLoading;
  const themeOptions: Array<{ value: ThemeMode; label: string }> = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
  ];
  const filteredConversations = useMemo(() => {
    const query = chatSearchQuery.trim().toLowerCase();

    if (!query) {
      return conversations;
    }

    return conversations.filter((thread) => {
      const haystack = `${thread.title} ${thread.preview}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [chatSearchQuery, conversations]);

  const visibleConversations = useMemo(() => {
    return [...filteredConversations]
      .filter((thread) => !archivedConversationIds.includes(thread.id))
      .sort((left, right) => {
        const leftPinned = pinnedConversationIds.includes(left.id) ? 1 : 0;
        const rightPinned = pinnedConversationIds.includes(right.id) ? 1 : 0;
        return rightPinned - leftPinned;
      });
  }, [archivedConversationIds, filteredConversations, pinnedConversationIds]);

  const archivedConversations = useMemo(() => {
    return conversations.filter((thread) => archivedConversationIds.includes(thread.id));
  }, [archivedConversationIds, conversations]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const applyTheme = () => {
      document.documentElement.dataset.theme = themeMode;
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    };

    applyTheme();
  }, [themeMode]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
        setIsAccountDetailsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (!showSearch) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [showSearch]);

  useEffect(() => {
    if (isProfileMenuOpen) {
      return;
    }

    setIsAccountDetailsOpen(false);
    setProfilePanelView("chats");
  }, [isProfileMenuOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isLoading, messages]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 56), 160);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 160 ? "auto" : "hidden";
  }, [draft]);

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

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setAttachedFile({
      id: crypto.randomUUID(),
      userId: "local-user",
      name: file.name,
      size: file.size,
      mimeType: file.type || "text/plain",
      bucket: "local-preview",
      path: file.name,
      extension: file.name.toLowerCase().endsWith(".md") ? "md" : "txt",
      createdAt: new Date().toISOString(),
      downloadUrl: null,
    });

    event.target.value = "";
  };

  const handleCopyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId(null), 1200);
    } catch {
      setCopiedMessageId(null);
    }
  };

  const handleShareMessage = async (message: ChatMessage) => {
    try {
      if (navigator.share) {
        await navigator.share({ text: message.content });
      } else {
        await navigator.clipboard.writeText(message.content);
      }

      setSharedMessageId(message.id);
      window.setTimeout(() => setSharedMessageId(null), 1200);
    } catch {
      setSharedMessageId(null);
    }
  };

  const handleMessageFeedback = (messageId: string, value: "like" | "dislike") => {
    setMessageFeedback((current) => ({
      ...current,
      [messageId]: current[messageId] === value ? undefined : value,
    }));
  };

  const handleEditMessage = (message: ChatMessage) => {
    setDraft(message.content);
    setAttachedFile(null);

    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.focus();
      const end = textarea.value.length;
      textarea.setSelectionRange(end, end);
    });
  };

  const showArchiveNotice = (value: string) => {
    setArchiveNotice(value);
    window.setTimeout(() => setArchiveNotice(null), 2200);
  };

  const handleShareConversation = async (title: string, preview: string) => {
    const text = `${title}\n\n${preview}`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        await navigator.clipboard.writeText(text);
      }

      showArchiveNotice("Chat details shared");
    } catch {
      setArchiveNotice(null);
    }
  };

  const togglePinConversation = (id: string) => {
    setPinnedConversationIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [id, ...current],
    );
    setActiveConversationMenuId(null);
  };

  const archiveConversation = (id: string) => {
    setArchivedConversationIds((current) => (current.includes(id) ? current : [id, ...current]));
    setPinnedConversationIds((current) => current.filter((item) => item !== id));
    setActiveConversationMenuId(null);
    showArchiveNotice("Chat archived. View it in Profile → Archived.");
  };

  const unarchiveConversation = (id: string) => {
    setArchivedConversationIds((current) => current.filter((item) => item !== id));
    setProfilePanelView("chats");
    showArchiveNotice("Chat moved back to Recents.");
  };

  const beginRenameConversation = (id: string, title: string) => {
    setEditingConversationId(id);
    setEditingTitle(title);
    setPendingDeleteId(null);
    setActiveConversationMenuId(null);
  };

  const cancelRenameConversation = () => {
    setEditingConversationId(null);
    setEditingTitle("");
  };

  const submitRenameConversation = () => {
    if (!editingConversationId) {
      return;
    }

    const nextTitle = editingTitle.trim();
    if (nextTitle) {
      renameConversation(editingConversationId, nextTitle);
    }

    setEditingConversationId(null);
    setEditingTitle("");
  };

  const requestDeleteConversation = (id: string) => {
    setPendingDeleteId(id);
    setEditingConversationId(null);
    setEditingTitle("");
    setActiveConversationMenuId(null);
  };

  const resetToNewChat = () => {
    setDraft("");
    setAttachedFile(null);
    setShowSearch(false);
    setChatSearchQuery("");
    setActiveConversationMenuId(null);
    setIsProfileMenuOpen(false);
    setVisibleSuggestions(getRandomSuggestions());
    startNewChat();
  };

  const cancelDeleteConversation = () => {
    setPendingDeleteId(null);
  };

  const confirmDeleteConversation = (id: string) => {
    deleteConversation(id);
    setPendingDeleteId(null);
  };

  return (
    <div className="relative h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-10rem] h-[22rem] w-[22rem] rounded-full bg-[var(--accent-soft)] blur-3xl" />
        <div className="absolute bottom-[-12rem] right-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[color:var(--accent-secondary-soft)] blur-3xl" />
      </div>

      {isSidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="absolute inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      {archiveNotice ? (
        <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-2xl border border-emerald-500/30 bg-[var(--panel-strong)]/95 px-4 py-3 text-sm text-[var(--foreground)] shadow-2xl backdrop-blur-xl">
          {archiveNotice}
        </div>
      ) : null}

      <div className="relative flex h-full min-h-0">
        <aside
          ref={searchRef}
          className={cn(
            "absolute inset-y-0 left-0 z-30 flex flex-col overflow-visible border-r border-[color:var(--border)] bg-[var(--panel-strong)]/95 backdrop-blur-2xl transition-[width] duration-200 lg:relative",
            isSidebarOpen ? "w-[280px]" : "w-[48px]",
          )}
        >
          <div className="overflow-visible px-2 py-3">
            {isSidebarOpen ? (
              <div className="flex items-center justify-between px-2 pb-2">
                <button
                  type="button"
                  aria-label="Refresh workspace"
                  className="group relative flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_38px_-18px_rgba(16,185,129,0.6)] hover:brightness-110"
                  onClick={resetToNewChat}
                >
                  <LogoIcon className="h-5 w-5" />
                  <HoverHint label="Refresh workspace" />
                </button>

                <button
                  type="button"
                  aria-label="Collapse panel"
                  className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-[var(--foreground)] transition duration-200 hover:-translate-y-[1px] hover:bg-[var(--surface)]/90 hover:text-white hover:shadow-[0_18px_38px_-18px_rgba(16,185,129,0.4)]"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <SidebarToggleIcon isOpen={isSidebarOpen} />
                  <HoverHint label="Collapse panel" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label="Expand panel"
                className="group relative mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-[var(--foreground)] transition duration-200 hover:-translate-y-[1px] hover:bg-[var(--surface)]/90 hover:text-white hover:shadow-[0_18px_38px_-18px_rgba(16,185,129,0.4)]"
                onClick={() => setIsSidebarOpen(true)}
              >
                <LogoIcon className="h-4 w-4" />
                <HoverHint label="Expand panel" />
              </button>
            )}

            <div className="space-y-1.5">
              <button
                type="button"
                aria-label="Start a new chat"
                className={cn(
                  "group relative flex h-10 items-center rounded-xl text-[var(--foreground)] transition duration-200 hover:-translate-y-[1px] hover:bg-[var(--surface)]/90 hover:text-white hover:shadow-[0_18px_38px_-18px_rgba(16,185,129,0.35)]",
                  isSidebarOpen ? "w-full gap-3 px-3" : "mx-auto w-10 justify-center",
                )}
                onClick={resetToNewChat}
              >
                <ComposeIcon className="h-4 w-4" />
                {isSidebarOpen ? <span className="text-sm">New chat</span> : <HoverHint label="Start a new chat" />}
              </button>

              <button
                type="button"
                aria-label="Find your chats"
                className={cn(
                  "group relative flex h-10 items-center rounded-xl text-[var(--foreground)] transition duration-200 hover:-translate-y-[1px] hover:bg-[var(--surface)]/90 hover:text-white hover:shadow-[0_18px_38px_-18px_rgba(16,185,129,0.35)]",
                  isSidebarOpen ? "w-full gap-3 px-3" : "mx-auto w-10 justify-center",
                )}
                onClick={() => {
                  setShowSearch((current) => !current);
                  setIsSidebarOpen(true);
                }}
              >
                <SearchIcon className="h-4 w-4" />
                {isSidebarOpen ? <span className="text-sm">Search chats</span> : <HoverHint label="Find your chats" />}
              </button>
            </div>

            {showSearch && isSidebarOpen ? (
              <div className="mt-3 px-1">
                <label htmlFor="chat-search" className="sr-only">
                  Search chats
                </label>
                <input
                  id="chat-search"
                  type="text"
                  value={chatSearchQuery}
                  onChange={(event) => setChatSearchQuery(event.target.value)}
                  placeholder="Search chats"
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-[var(--surface)]/85 px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                />
              </div>
            ) : null}
          </div>

          {isSidebarOpen ? (
            <div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Recents
            </div>
          ) : null}

          <div className={cn("flex-1 overflow-y-auto px-2 pb-3", isSidebarOpen ? "space-y-2" : "") }>
            {isSidebarOpen
              ? visibleConversations.map((thread) => {
                  const isEditing = editingConversationId === thread.id;
                  const isPendingDelete = pendingDeleteId === thread.id;
                  const isPinned = pinnedConversationIds.includes(thread.id);
                  const isMenuOpen = activeConversationMenuId === thread.id;

                  return (
                    <div key={thread.id} className="group/thread relative space-y-2">
                      {isEditing ? (
                        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)]/90 p-3">
                          <input
                            type="text"
                            value={editingTitle}
                            autoFocus
                            onChange={(event) => setEditingTitle(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                submitRenameConversation();
                              }

                              if (event.key === "Escape") {
                                event.preventDefault();
                                cancelRenameConversation();
                              }
                            }}
                            className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              type="button"
                              className="rounded-xl px-3 py-1.5 text-xs text-[var(--muted)] transition hover:bg-[var(--panel)]"
                              onClick={cancelRenameConversation}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500"
                              onClick={submitRenameConversation}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveConversationMenuId(null);
                              setIsProfileMenuOpen(false);
                              loadConversation(thread.id);
                            }}
                            className={cn(
                              "w-full rounded-2xl border px-3 py-3 pr-14 text-left transition",
                              conversationId === thread.id
                                ? "border-emerald-500/35 bg-[var(--accent-soft)]"
                                : "border-[color:var(--border)] bg-[var(--surface)]/80 hover:bg-[var(--surface)]",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                {isPinned ? <PinIcon className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> : null}
                                <p className="truncate text-sm font-medium text-[var(--foreground)]">{thread.title}</p>
                              </div>
                              <span className="shrink-0 text-[10px] text-[var(--muted)]" suppressHydrationWarning>
                                {formatConversationDate(thread.updatedAt)}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{thread.preview}</p>
                          </button>

                          <div className="absolute right-2 top-2">
                            <button
                              type="button"
                              className="rounded-lg border border-[color:var(--border)] bg-[var(--panel)] p-1.5 text-[var(--muted)] transition duration-200 hover:-translate-y-[1px] hover:text-[var(--foreground)] hover:shadow-[0_18px_38px_-18px_rgba(16,185,129,0.35)]"
                              aria-label="Conversation options"
                              onClick={(event) => {
                                event.stopPropagation();
                                setActiveConversationMenuId((current) => current === thread.id ? null : thread.id);
                              }}
                            >
                              <MoreIcon className="h-3.5 w-3.5" />
                            </button>

                            {isMenuOpen ? (
                              <div className="absolute right-0 top-10 z-40 w-40 rounded-2xl border border-[color:var(--border)] bg-[var(--panel-strong)] p-1.5 shadow-2xl backdrop-blur-xl">
                                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--foreground)] transition hover:bg-[var(--surface)]" onClick={() => void handleShareConversation(thread.title, thread.preview)}>
                                  <ShareIcon className="h-3.5 w-3.5" />
                                  Share
                                </button>
                                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--foreground)] transition hover:bg-[var(--surface)]" onClick={() => beginRenameConversation(thread.id, thread.title)}>
                                  <PencilIcon className="h-3.5 w-3.5" />
                                  Rename
                                </button>
                                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--foreground)] transition hover:bg-[var(--surface)]" onClick={() => togglePinConversation(thread.id)}>
                                  <PinIcon className="h-3.5 w-3.5" />
                                  {isPinned ? "Unpin" : "Pin"}
                                </button>
                                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--foreground)] transition hover:bg-[var(--surface)]" onClick={() => archiveConversation(thread.id)}>
                                  <ArchiveIcon className="h-3.5 w-3.5" />
                                  Archive
                                </button>
                                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10" onClick={() => requestDeleteConversation(thread.id)}>
                                  <TrashIcon className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </>
                      )}

                      {isPendingDelete ? (
                        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3">
                          <p className="text-sm text-[var(--foreground)]">Delete this chat?</p>
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              type="button"
                              className="rounded-xl px-3 py-1.5 text-xs text-[var(--muted)] transition hover:bg-[var(--panel)]"
                              onClick={cancelDeleteConversation}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-500"
                              onClick={() => confirmDeleteConversation(thread.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              : null}

            {isSidebarOpen && visibleConversations.length === 0 ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-4 text-sm text-[var(--muted)]">
                No chats found.
              </div>
            ) : null}
          </div>

          <div ref={profileMenuRef} className="relative mt-auto border-t border-[color:var(--border)]/60 px-2 py-3">
            {isProfileMenuOpen ? (
              <div
                className={cn(
                  "absolute z-30 rounded-2xl border border-[color:var(--border)] bg-[var(--panel-strong)] p-2 shadow-2xl backdrop-blur-2xl",
                  isSidebarOpen ? "bottom-[64px] left-2 right-2" : "bottom-0 left-full ml-2 w-[220px]",
                )}
              >
                <div
                  className="relative"
                  onMouseEnter={() => setIsAccountDetailsOpen(true)}
                  onMouseLeave={() => setIsAccountDetailsOpen(false)}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <Avatar className="h-8 w-8 border-0" fallback={getInitials(displayName)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[var(--foreground)]">{displayName}</p>
                      <p className="truncate text-xs text-[var(--muted)]">Profile</p>
                    </div>
                    <span className="text-[var(--muted)]">›</span>
                  </button>

                  {isAccountDetailsOpen ? (
                    <div className="absolute bottom-0 left-full ml-2 w-[250px] rounded-2xl border border-[color:var(--border)] bg-[var(--panel-strong)] p-2 shadow-2xl backdrop-blur-2xl">
                      <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                        <Avatar className="h-8 w-8 border-0" fallback={getInitials(displayName)} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--foreground)]">{displayName}</p>
                          <p className="truncate text-xs text-[var(--muted)]">{displaySubtitle}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-sm text-[var(--foreground)] transition hover:bg-black/5 dark:hover:bg-white/5"
                        onClick={() => window.location.assign("/login")}
                      >
                        Add another account
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-2 rounded-xl border border-[color:var(--border)] bg-[var(--surface)]/60 p-2">
                  <button
                    type="button"
                    onClick={() => setProfilePanelView((current) => (current === "archived" ? "chats" : "archived"))}
                    className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel)]"
                  >
                    <span>Archived</span>
                    <span className="text-xs text-[var(--muted)]">{archivedConversations.length}</span>
                  </button>

                  {profilePanelView === "archived" ? (
                    <div className="mt-2 rounded-xl bg-[var(--panel)]/70 p-2">
                      {archivedConversations.length > 0 ? (
                        <div className="space-y-2">
                          {archivedConversations.map((thread) => (
                            <div key={thread.id} className="rounded-xl border border-[color:var(--border)] bg-[var(--surface)]/60 p-2">
                              <button
                                type="button"
                                className="w-full text-left"
                                onClick={() => {
                                  setIsProfileMenuOpen(false);
                                  loadConversation(thread.id);
                                }}
                              >
                                <p className="truncate text-sm font-medium text-[var(--foreground)]">{thread.title}</p>
                                <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{thread.preview}</p>
                              </button>
                              <div className="mt-2 flex justify-end">
                                <button
                                  type="button"
                                  className="rounded-lg bg-[var(--panel-strong)] px-2.5 py-1 text-xs text-[var(--foreground)] transition hover:bg-[var(--surface)]"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    unarchiveConversation(thread.id);
                                  }}
                                >
                                  Unarchive
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--muted)]">No archived chats.</p>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="mt-2 rounded-xl border border-[color:var(--border)] bg-[var(--surface)]/60 p-2">
                  <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    Theme
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {themeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setThemeMode(option.value)}
                        className={cn(
                          "w-full rounded-xl px-2 py-2 text-xs font-medium transition",
                          themeMode === option.value
                            ? "bg-emerald-600 text-white"
                            : "bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--foreground)]",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <LogoutButton
                  variant="outline"
                  className="mt-2 justify-start rounded-xl"
                  label="Logout"
                />
              </div>
            ) : null}

            <button
              type="button"
              aria-label="Profile and settings"
              className={cn(
                "group relative flex items-center rounded-xl transition duration-200 hover:-translate-y-[1px] hover:bg-[var(--surface)]/90 hover:text-white hover:shadow-[0_18px_38px_-18px_rgba(16,185,129,0.35)]",
                isSidebarOpen ? "w-full gap-3 px-3 py-2.5 text-left" : "mx-auto h-9 w-9 justify-center",
              )}
              onClick={() => setIsProfileMenuOpen((current) => !current)}
            >
              <Avatar className="h-8 w-8 border-0" fallback={getInitials(displayName)} />
              {isSidebarOpen ? (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{displaySubtitle}</p>
                </div>
              ) : (
                <HoverHint label="Profile & settings" />
              )}
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="border-b border-[color:var(--border)]/60 bg-[var(--panel)]/70 px-4 py-3 backdrop-blur md:px-6">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
              <button
                type="button"
                className="flex items-center gap-3 text-left"
                onClick={resetToNewChat}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm">
                  <LogoIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                    Agentic RAG
                  </p>
                  <p className="text-xs text-[var(--muted)]">Intelligent workspace</p>
                </div>
              </button>

              <div className="flex items-center gap-2">
                <Badge className="border-transparent bg-[var(--surface)] text-[var(--foreground)]">
                  Version 1.0
                </Badge>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 md:px-6 lg:py-8">
              {isEmptyState ? (
                <div className="flex min-h-[60vh] flex-col items-center justify-center gap-7 text-center">
                  <div className="max-w-2xl">
                    <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                      Ask anything.
                    </h1>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)] md:text-base">
                      Clean, focused conversations in a modern workspace.
                    </p>
                  </div>

                  <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
                    {visibleSuggestions.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setDraft(prompt)}
                        className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)]/80 px-4 py-4 text-left text-sm text-[var(--foreground)] shadow-[0_20px_50px_-40px_rgba(0,0,0,0.6)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--surface)]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    const isUser = message.role === "user";
                    const canRegenerate = !isUser && index === messages.length - 1;

                    return (
                      <article
                        key={message.id}
                        className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
                      >
                        {!isUser ? <Avatar className="mt-1 hidden sm:inline-flex" fallback="AI" /> : null}

                        <div className="group/message w-full max-w-3xl">
                          <div
                            className={cn(
                              "rounded-[28px] px-4 py-3.5 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.55)]",
                              isUser
                                ? "ml-auto bg-[linear-gradient(135deg,var(--accent),var(--accent-secondary))] text-white"
                                : "border border-[color:var(--border)] bg-[var(--surface)]/95 text-[var(--foreground)] backdrop-blur-xl",
                            )}
                          >
                            <div className="mb-2 flex items-center gap-2 text-xs">
                              <span className="font-semibold">{isUser ? displayName : "Assistant"}</span>
                              <time
                                dateTime={message.createdAt}
                                suppressHydrationWarning
                                className={isUser ? "text-emerald-50/80" : "text-[var(--muted)]"}
                              >
                                {formatTime(message.createdAt)}
                              </time>
                            </div>

                            {isUser ? (
                              <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                            ) : (
                              <MessageMarkdown content={message.content} />
                            )}
                          </div>

                          {isUser ? (
                            <div className="mt-2 flex justify-end gap-1 opacity-100 transition sm:opacity-0 sm:group-hover/message:opacity-100">
                              <button
                                type="button"
                                aria-label="Copy message"
                                className="group/icon relative flex h-8 w-8 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white"
                                onClick={() => void handleCopyMessage(message)}
                              >
                                <CopyIcon className="h-3.5 w-3.5" />
                                <HoverHint label={copiedMessageId === message.id ? "Copied" : "Copy message"} side="bottom" />
                              </button>

                              <button
                                type="button"
                                aria-label="Edit message"
                                className="group/icon relative flex h-8 w-8 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white"
                                onClick={() => handleEditMessage(message)}
                              >
                                <PencilIcon className="h-3.5 w-3.5" />
                                <HoverHint label="Edit message" side="bottom" />
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2 flex flex-wrap items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover/message:opacity-100">
                              <button
                                type="button"
                                aria-label="Copy response"
                                className="group/icon relative flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                                onClick={() => void handleCopyMessage(message)}
                              >
                                <CopyIcon className="h-3.5 w-3.5" />
                                <HoverHint label={copiedMessageId === message.id ? "Copied" : "Copy"} side="bottom" />
                              </button>

                              <button
                                type="button"
                                aria-label="Like response"
                                className={cn(
                                  "group/icon relative flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[var(--surface)]",
                                  messageFeedback[message.id] === "like"
                                    ? "text-emerald-400"
                                    : "text-[var(--muted)] hover:text-[var(--foreground)]",
                                )}
                                onClick={() => handleMessageFeedback(message.id, "like")}
                              >
                                <ThumbsUpIcon className="h-3.5 w-3.5" />
                                <HoverHint label="Like" side="bottom" />
                              </button>

                              <button
                                type="button"
                                aria-label="Dislike response"
                                className={cn(
                                  "group/icon relative flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[var(--surface)]",
                                  messageFeedback[message.id] === "dislike"
                                    ? "text-rose-400"
                                    : "text-[var(--muted)] hover:text-[var(--foreground)]",
                                )}
                                onClick={() => handleMessageFeedback(message.id, "dislike")}
                              >
                                <ThumbsDownIcon className="h-3.5 w-3.5" />
                                <HoverHint label="Dislike" side="bottom" />
                              </button>

                              <button
                                type="button"
                                aria-label="Share response"
                                className="group/icon relative flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                                onClick={() => void handleShareMessage(message)}
                              >
                                <ShareIcon className="h-3.5 w-3.5" />
                                <HoverHint label={sharedMessageId === message.id ? "Shared" : "Share"} side="bottom" />
                              </button>

                              {canRegenerate ? (
                                <button
                                  type="button"
                                  aria-label="Regenerate response"
                                  className="group/icon relative flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                                  onClick={() => void regenerateLastResponse()}
                                >
                                  <RefreshIcon className="h-3.5 w-3.5" />
                                  <HoverHint label="Regenerate" side="bottom" />
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>

                        {isUser ? <Avatar className="mt-1 hidden sm:inline-flex" fallback={getInitials(displayName)} /> : null}
                      </article>
                    );
                  })}

                  {isLoading ? (
                    <article className="flex justify-start gap-3">
                      <Avatar className="mt-1 hidden sm:inline-flex" fallback="AI" />
                      <div className="rounded-[28px] border border-[color:var(--border)] bg-[var(--surface)]/95 px-4 py-3 text-sm text-[var(--muted)] shadow-[0_24px_60px_-40px_rgba(0,0,0,0.55)]">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex gap-1">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.3s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.15s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" />
                          </span>
                          Thinking…
                        </div>
                      </div>
                    </article>
                  ) : null}
                </>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-[color:var(--border)] bg-[var(--panel)]/82 px-4 py-4 backdrop-blur-2xl md:px-6">
            <Card className="mx-auto w-full max-w-5xl rounded-[32px] border-[color:var(--border)] bg-[var(--panel-strong)]/92 shadow-[0_36px_100px_-56px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
              <CardContent className="p-3">
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
                  {attachedFile ? (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-[var(--accent-soft)] px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">
                          {attachedFile.name}
                        </p>
                        <p className="text-xs text-[var(--muted)]">{formatBytes(attachedFile.size)}</p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setAttachedFile(null)}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : null}

                  <div className="flex items-end gap-2 rounded-[28px] border border-[color:var(--border)] bg-[var(--surface)] px-3 py-2 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.55)]">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".md,.txt"
                      className="hidden"
                      onChange={handleFileSelect}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <PaperclipIcon className="h-4 w-4" />
                      <HoverHint label="Attach file" side="bottom" />
                    </Button>

                    <label htmlFor="message" className="sr-only">
                      Message
                    </label>
                    <Textarea
                      ref={textareaRef}
                      id="message"
                      rows={1}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Message Agentic RAG"
                      className="max-h-40 min-h-[44px] flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0 py-2 text-sm shadow-none focus-visible:ring-0"
                    />

                    <Button
                      type="submit"
                      size="icon"
                      disabled={isLoading || !draft.trim()}
                      className="h-10 w-10 shrink-0 rounded-full"
                    >
                      <SendIcon className="h-4 w-4" />
                      <HoverHint label="Send" side="bottom" />
                    </Button>
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
