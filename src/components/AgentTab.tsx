"use client";

import { useEffect, useRef, useState } from "react";
import type { Attachment, ContextKind } from "@/lib/types";

type AttachmentRef = {
  id: string;
  name: string;
  kind: ContextKind;
  extracted: boolean;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  /** Attachments uploaded along with this user message (user role only). */
  attachments?: AttachmentRef[];
};

const MAX_FILE_SIZE_MB = 10;

/** Auto-detect a context kind for a file dropped into chat. */
function detectKind(file: File): ContextKind {
  const n = file.name.toLowerCase();
  const t = file.type;
  if (t.startsWith("image/")) return "image";
  if (t === "message/rfc822" || n.endsWith(".eml")) return "email";
  if (n.includes("transcript") || n.includes("fathom")) return "transcript";
  if (n.includes("jd") || n.includes("job")) return "job_description";
  if (n.endsWith(".pptx") || n.endsWith(".key")) return "deck";
  return "document";
}

const STORAGE_PREFIX = "aspen-agent-chat:";

function storageKey(opportunityId: string) {
  return `${STORAGE_PREFIX}${opportunityId}`;
}

function loadMessages(opportunityId: string): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(opportunityId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Message[]) : [];
  } catch {
    return [];
  }
}

function saveMessages(opportunityId: string, messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    if (messages.length === 0) {
      window.localStorage.removeItem(storageKey(opportunityId));
    } else {
      window.localStorage.setItem(
        storageKey(opportunityId),
        JSON.stringify(messages)
      );
    }
  } catch {
    // Quota exceeded or storage disabled — fail silently.
  }
}

const QUICK_ACTIONS: { label: string; prompt: string }[] = [
  {
    label: "Summarize latest meeting",
    prompt:
      "Summarize the most recently uploaded meeting transcript or notes using the structured format (Summary, Pain points, Scope, Stage signals, Action items, Suggested next steps).",
  },
  {
    label: "What questions should I ask?",
    prompt:
      "Based on what we know so far, what are the most important questions I should ask in the next conversation? Identify the gaps in our knowledge of their ops, decision criteria, timeline, and budget.",
  },
  {
    label: "Suggest next steps",
    prompt:
      "What are the right next steps to move this opportunity forward? Consider current stage, last touchpoint, and any signals from uploaded context.",
  },
  {
    label: "Draft a follow-up email",
    prompt:
      "Draft a follow-up email I can send to this contact based on our latest interaction. Keep it short, peer-level, and operator-tone — assume the recipient is busy.",
  },
  {
    label: "Draft a proposal outline",
    prompt:
      "Draft a proposal/SOW outline for this engagement based on scope, pricing estimate (if available), and equity terms (if relevant). Structured sections only.",
  },
  {
    label: "Flag risks",
    prompt:
      "What risks should I be aware of with this opportunity? Pull from any uploaded transcripts or notes, plus stage and fit signals.",
  },
];

export function AgentTab({ opportunityId }: { opportunityId: string }) {
  // Initialize from localStorage so chat survives tab switches + page refreshes.
  const [messages, setMessages] = useState<Message[]>(() =>
    loadMessages(opportunityId)
  );
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reload conversation if the user switches to a different opportunity.
  useEffect(() => {
    setMessages(loadMessages(opportunityId));
    setError(null);
    setInput("");
    setPendingFiles([]);
  }, [opportunityId]);

  // Persist on every change.
  useEffect(() => {
    saveMessages(opportunityId, messages);
  }, [opportunityId, messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  function clearChat() {
    if (messages.length > 0 && !confirm("Clear this conversation?")) return;
    setMessages([]);
    setError(null);
  }

  function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    const arr = Array.from(files);
    const tooBig = arr.find((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (tooBig) {
      setError(
        `"${tooBig.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit and was skipped.`
      );
    }
    const valid = arr.filter((f) => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024);
    if (valid.length > 0) {
      setError(null);
      setPendingFiles((prev) => [...prev, ...valid]);
    }
  }

  function removePendingFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  /**
   * Upload each pending file via the existing attachments API. Returns
   * AttachmentRefs to display on the user message bubble.
   */
  async function uploadPendingFiles(): Promise<AttachmentRef[]> {
    const refs: AttachmentRef[] = [];
    for (const file of pendingFiles) {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", detectKind(file));
      form.append("tag", "from chat");

      const res = await fetch(
        `/api/opportunities/${opportunityId}/attachments`,
        { method: "POST", body: form }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || `Upload failed for ${file.name}`);
      }
      const created = (await res.json()) as Attachment;
      refs.push({
        id: created.id,
        name: created.name,
        kind: created.kind,
        extracted: !!created.extractedText,
      });
    }
    return refs;
  }

  async function send(text: string, opts: { allowEmptyText?: boolean } = {}) {
    const trimmed = text.trim();
    const hasFiles = pendingFiles.length > 0;
    if (!trimmed && !hasFiles && !opts.allowEmptyText) return;
    if (pending) return;

    setPending(true);
    setError(null);

    let uploadedRefs: AttachmentRef[] = [];
    try {
      if (hasFiles) {
        uploadedRefs = await uploadPendingFiles();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload error");
      setPending(false);
      return;
    }

    // Construct the user message. If there's no typed text but there are
    // files, generate a sensible prompt so the agent has something to react to.
    let userContent = trimmed;
    if (!userContent && uploadedRefs.length > 0) {
      const names = uploadedRefs.map((r) => r.name).join(", ");
      userContent = `I've attached: ${names}. Please review and tell me what's useful, then suggest next steps.`;
    }

    const userMessage: Message = {
      role: "user",
      content: userContent,
      attachments: uploadedRefs.length > 0 ? uploadedRefs : undefined,
    };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || `Agent failed (${res.status})`);
      }
      const { reply } = (await res.json()) as { reply: string };
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      // Leave the user message in place so they can retry.
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div
      className="flex flex-col h-full -m-6 relative"
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes("Files")) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        // Only clear when leaving the container itself, not a child element.
        if (e.target === e.currentTarget) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      {/* Drop overlay */}
      {dragOver && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
          style={{
            backgroundColor: "rgba(200,224,107,0.06)",
            border: "2px dashed var(--accent-primary)",
            borderRadius: "0.5rem",
          }}
        >
          <span className="text-sm text-accent uppercase tracking-wider">
            Drop to attach
          </span>
        </div>
      )}

      {/* Quick actions (only when there are no messages yet) */}
      {messages.length === 0 && (
        <div className="p-6 flex flex-col gap-4">
          <div>
            <h3
              className="text-lg"
              style={{
                fontFamily: "var(--font-playfair)",
                color: "var(--accent-primary)",
              }}
            >
              Aspen Agent
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Ask anything about this opportunity. The agent has read access to all
              opportunity fields plus any context you&apos;ve uploaded in the Files tab
              (transcripts, emails, JDs, etc.). You can also drop files directly into
              the chat — they&apos;ll be filed into the Context Library automatically.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim">
              Quick actions
            </span>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => send(a.prompt)}
                  className="text-left px-3 py-2 rounded-md text-xs transition-colors hover:bg-bg-elevated"
                  style={{
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conversation */}
      {messages.length > 0 && (
        <>
          <div className="flex items-center justify-between px-6 pt-4 pb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim">
              Conversation
            </span>
            <button
              type="button"
              onClick={clearChat}
              className="text-[10px] uppercase tracking-wider text-text-muted hover:text-text-primary"
            >
              + New chat
            </button>
          </div>
          <div className="flex-1 overflow-auto px-6 pb-4 flex flex-col gap-4">
            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} />
            ))}
            {pending && (
              <div className="text-text-muted text-xs italic">
                Aspen Agent is thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>
        </>
      )}

      {error && (
        <div
          className="mx-6 mb-2 px-4 py-3 rounded-md text-sm"
          style={{
            color: "#ef4444",
            backgroundColor: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          {error}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border-subtle px-6 py-4 flex flex-col gap-2"
      >
        {/* Pending file chips */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((f, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)",
                }}
              >
                📎 {f.name}
                <span className="text-text-muted">
                  ({(f.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => removePendingFile(idx)}
                  className="text-text-muted hover:text-text-primary"
                  aria-label={`Remove ${f.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={pending}
            title="Attach file"
            className="px-3 py-2 rounded-md text-text-muted hover:text-text-primary border border-border-default text-base disabled:opacity-50"
          >
            📎
          </button>
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              pendingFiles.length > 0
                ? "Optional message — press Send to upload + ask"
                : "Ask the agent, or drop a file in… (Enter to send, Shift+Enter for newline)"
            }
            className="flex-1 px-3 py-2 rounded-md text-sm bg-bg-elevated text-text-primary placeholder:text-text-dim border border-border-default focus:border-accent focus:outline-none resize-none"
          />
          <button
            type="submit"
            disabled={pending || (!input.trim() && pendingFiles.length === 0)}
            className="px-4 py-2 text-xs uppercase tracking-wider rounded-md transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "var(--bg-base)",
            }}
          >
            {pending ? "…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ role, content, attachments }: Message) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[85%] px-4 py-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap"
        style={{
          backgroundColor: isUser
            ? "rgba(200,224,107,0.08)"
            : "var(--bg-elevated)",
          color: isUser ? "var(--text-primary)" : "var(--text-secondary)",
          border: `1px solid ${
            isUser ? "rgba(200,224,107,0.2)" : "var(--border-subtle)"
          }`,
        }}
      >
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {attachments.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: "var(--bg-base)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)",
                }}
                title={
                  a.extracted
                    ? "Text extracted — agent can read this"
                    : "Binary file — no text extracted"
                }
              >
                📎 {a.name}
                {a.extracted && (
                  <span style={{ color: "var(--accent-primary)" }}>·</span>
                )}
              </span>
            ))}
          </div>
        )}
        {content}
      </div>
    </div>
  );
}
