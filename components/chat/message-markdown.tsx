"use client";

import { type ReactNode, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className ?? "");
  const code = String(children ?? "").replace(/\n$/, "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  if (!match) {
    return (
      <code className="rounded-md bg-black/25 px-1.5 py-0.5 font-mono text-[0.92em] text-inherit">
        {children}
      </code>
    );
  }

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[#0f1724] shadow-inner">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-300">
        <span>{match[1]}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 rounded-lg px-2 text-[11px] text-slate-300 hover:bg-white/10 hover:text-white"
          onClick={handleCopy}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <SyntaxHighlighter
        language={match[1]}
        style={oneDark}
        wrapLongLines
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "transparent",
          fontSize: "0.86rem",
          lineHeight: 1.6,
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export function MessageMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn("text-sm leading-7", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => <h1 className="mt-1 text-xl font-semibold" {...props} />,
          h2: ({ ...props }) => <h2 className="mt-4 text-lg font-semibold" {...props} />,
          h3: ({ ...props }) => <h3 className="mt-3 text-base font-semibold" {...props} />,
          p: ({ ...props }) => <p className="mt-2 whitespace-pre-wrap" {...props} />,
          ul: ({ ...props }) => <ul className="mt-2 list-disc space-y-1 pl-5" {...props} />,
          ol: ({ ...props }) => <ol className="mt-2 list-decimal space-y-1 pl-5" {...props} />,
          li: ({ ...props }) => <li className="marker:text-[var(--accent)]" {...props} />,
          a: ({ ...props }) => (
            <a
              className="font-medium text-[var(--accent)] underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="mt-3 border-l-2 border-[var(--accent)]/60 pl-4 text-[var(--muted)]"
              {...props}
            />
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ className: codeClassName, children }) => (
            <CodeBlock className={codeClassName}>{children}</CodeBlock>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
