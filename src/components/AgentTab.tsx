"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
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
    <div className="flex flex-col h-full -m-6">
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
              (transcripts, emails, JDs, etc.).
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
        <div className="flex-1 overflow-auto px-6 py-4 flex flex-col gap-4">
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
        className="border-t border-border-subtle px-6 py-4 flex gap-2"
      >
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the agent… (Enter to send, Shift+Enter for newline)"
          className="flex-1 px-3 py-2 rounded-md text-sm bg-bg-elevated text-text-primary placeholder:text-text-dim border border-border-default focus:border-accent focus:outline-none resize-none"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="px-4 py-2 text-xs uppercase tracking-wider rounded-md transition-colors disabled:opacity-50 self-end"
          style={{
            backgroundColor: "var(--accent-primary)",
            color: "var(--bg-base)",
          }}
        >
          {pending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ role, content }: Message) {
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
        {content}
      </div>
    </div>
  );
}
