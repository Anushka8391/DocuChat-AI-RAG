"use client";

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ApiError, FileListResponse, FileUploadResponse, UploadedFileMetadata } from "@/types";

interface FileUploadProps {
  title?: string;
  description?: string;
  endpoint?: string;
  className?: string;
  variant?: "card" | "compact";
  selectedFile?: UploadedFileMetadata | null;
  onUploadComplete?: (file: UploadedFileMetadata) => void;
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

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getErrorText(payload: ApiError | FileListResponse | FileUploadResponse) {
  if ("error" in payload) {
    return payload.details ?? payload.error;
  }

  return "Something went wrong.";
}

function isFileListResponse(payload: ApiError | FileListResponse): payload is FileListResponse {
  return "files" in payload;
}

function isFileUploadResponse(payload: ApiError | FileUploadResponse): payload is FileUploadResponse {
  return "file" in payload;
}

export function FileUpload({
  title = "Knowledge files",
  description = "Upload .md or .txt notes to Supabase storage and keep their metadata in the database.",
  endpoint = "/api/files",
  className,
  variant = "card",
  selectedFile,
  onUploadComplete,
}: FileUploadProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<UploadedFileMetadata[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const loadFiles = useCallback(async () => {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json()) as ApiError | FileListResponse;

    if (!response.ok) {
      throw new Error(getErrorText(payload));
    }

    if (!isFileListResponse(payload)) {
      throw new Error("Unexpected response while loading files.");
    }

    setFiles(payload.files);
    setStatus(payload.message ?? null);
  }, [endpoint]);

  const refreshFiles = useCallback(() => {
    setIsLoading(true);
    setError(null);

    void loadFiles()
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to refresh the list.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [loadFiles]);

  useEffect(() => {
    let isMounted = true;

    void loadFiles()
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load files.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [loadFiles]);

  useEffect(() => {
    if (variant !== "compact" || !isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMenuOpen, variant]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const normalizedName = file.name.toLowerCase();
    if (!normalizedName.endsWith(".md") && !normalizedName.endsWith(".txt")) {
      setError("Only .md and .txt files are allowed.");
      setStatus(null);
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    setError(null);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ApiError | FileUploadResponse;

      if (!response.ok) {
        throw new Error(getErrorText(payload));
      }

      if (!isFileUploadResponse(payload)) {
        throw new Error("Unexpected response while uploading the file.");
      }

      setFiles((current) => [payload.file, ...current.filter((item) => item.id !== payload.file.id)]);
      setStatus(payload.message ?? `${file.name} uploaded successfully.`);
      onUploadComplete?.(payload.file);
      setIsMenuOpen(true);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
      setIsMenuOpen(true);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const renderedList = (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-[var(--muted)]">
        <span>{variant === "compact" ? "Recent files" : "Uploaded files"}</span>
        <span>{files.length}</span>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-4 text-sm text-[var(--muted)]">
          Loading files...
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-4 text-sm text-[var(--muted)]">
          No files uploaded yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {files.slice(0, variant === "compact" ? 3 : files.length).map((file) => (
            <li
              key={file.id}
              className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface)] px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">{file.name}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {formatBytes(file.size)} • {file.extension.toUpperCase()} • {formatDate(file.createdAt)}
                  </p>
                </div>

                {file.downloadUrl ? (
                  <a
                    className="text-xs font-medium text-emerald-300 hover:text-emerald-200"
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (variant === "compact") {
    return (
      <div ref={containerRef} className={cn("relative", className)}>
        <input
          ref={inputRef}
          type="file"
          accept=".md,.txt,text/plain,text/markdown"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-11 w-11 rounded-xl border border-[color:var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:opacity-90 hover:text-[var(--foreground)]",
            selectedFile ? "border-emerald-500/35 bg-[var(--accent-soft)] text-[var(--foreground)]" : null,
          )}
          aria-label="Attach file"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <PaperclipIcon className="h-4 w-4" />
        </Button>

        {isMenuOpen ? (
          <div className="absolute bottom-14 left-0 z-30 w-[320px] rounded-2xl border border-[color:var(--border)] bg-[var(--panel-strong)] p-3 shadow-2xl backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Attach file</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Add `.md` or `.txt` documents to your workspace.</p>
              </div>
              <Badge>md / txt</Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Choose file"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={refreshFiles} disabled={isUploading}>
                Refresh
              </Button>
            </div>

            {status ? (
              <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                {status}
              </p>
            ) : null}

            {error ? (
              <p className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            {selectedFile ? (
              <p className="mt-3 rounded-xl border border-emerald-500/20 bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--foreground)]">
                Attached: <span className="font-medium">{selectedFile.name}</span>
              </p>
            ) : null}

            <Separator className="my-3" />
            {renderedList}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Badge>md / txt</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept=".md,.txt,text/plain,text/markdown"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--foreground)]">Drop in your notes and keep them ready for retrieval later.</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Accepted formats: `.md` and `.txt`</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload file"}
            </Button>
            <Button type="button" variant="outline" onClick={refreshFiles} disabled={isUploading}>
              Refresh list
            </Button>
          </div>
        </div>

        {status ? (
          <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {status}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <Separator />
        {renderedList}
      </CardContent>
    </Card>
  );
}
