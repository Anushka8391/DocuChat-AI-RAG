"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ApiError, SystemPromptResponse } from "@/types";

interface SystemPromptConfigProps {
  initialSystemPrompt?: string;
  className?: string;
  defaultOpen?: boolean;
}

function getErrorText(payload: ApiError | SystemPromptResponse) {
  if ("error" in payload) {
    return payload.details ?? payload.error;
  }

  return "Unable to save custom instructions.";
}

export function SystemPromptConfig({
  initialSystemPrompt = "",
  className,
  defaultOpen = false,
}: SystemPromptConfigProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [value, setValue] = useState(initialSystemPrompt);
  const [savedValue, setSavedValue] = useState(initialSystemPrompt);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEnabled = useMemo(() => savedValue.trim().length > 0, [savedValue]);
  const hasChanges = value !== savedValue;

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    setError(null);

    try {
      const response = await fetch("/api/settings/system-prompt", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemPrompt: value,
        }),
      });

      const payload = (await response.json()) as ApiError | SystemPromptResponse;

      if (!response.ok) {
        throw new Error(getErrorText(payload));
      }

      if (!("systemPrompt" in payload)) {
        throw new Error("Unexpected response while saving custom instructions.");
      }

      setSavedValue(payload.systemPrompt);
      setValue(payload.systemPrompt);
      setStatus(payload.message ?? "Custom instructions saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save custom instructions.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setValue("");
    setStatus(null);
    setError(null);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen((current) => !current)}>
          {isOpen ? "Close instructions" : "Custom instructions"}
        </Button>
      </div>

      {isOpen ? (
        <Card className="border-white/10 bg-slate-950/90">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Custom instructions</CardTitle>
                <CardDescription className="mt-1">
                  Add a system prompt that will guide every reply for your account.
                </CardDescription>
              </div>
              <Badge>{isEnabled ? "On" : "Off"}</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <Textarea
              rows={6}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setStatus(null);
                setError(null);
              }}
              placeholder="Example: Be concise, use simple language, and prefer bullet points when helpful."
              className="min-h-[160px]"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">
                Saved per user and automatically applied before the agent runs.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setValue(savedValue)}>
                  Undo
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleReset}>
                  Clear
                </Button>
                <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || !hasChanges}>
                  {isSaving ? "Saving..." : "Save"}
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
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
