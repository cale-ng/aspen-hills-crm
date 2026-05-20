"use client";

import { useState } from "react";

type ClassificationResponse =
  | {
      status: "filed";
      classification: ClassificationData;
      result: FileResult;
    }
  | {
      status: "needs_confirmation";
      classification: ClassificationData;
      parsed: { subject: string | null; from: { name: string | null; email: string | null } };
    };

interface ClassificationData {
  opportunityId: string | null;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  summary: string;
  suggestedNextSteps: string[];
  alternatives: { opportunityId: string; company: string; reason: string }[];
  proposesNew: boolean;
  newOpportunity: {
    company: string | null;
    contactName: string | null;
    email: string | null;
  } | null;
}

interface FileResult {
  opportunityId: string;
  summary: string;
  suggestedNextSteps: string[];
  createdNewOpportunity: boolean;
}

interface Props {
  onClose: () => void;
  /** Called after a successful filing so the parent can refresh data / navigate. */
  onFiled: (opportunityId: string, createdNew: boolean) => void;
}

export function PasteEmailModal({ onClose, onFiled }: Props) {
  const [raw, setRaw] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [filing, setFiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ClassificationResponse | null>(null);

  async function classify() {
    if (!raw.trim() || classifying) return;
    setClassifying(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/inbound/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || `Failed (${res.status})`);
      }
      const data = (await res.json()) as ClassificationResponse;
      setResponse(data);

      if (data.status === "filed") {
        // Auto-filed already — short pause so user sees the success state, then close.
        // (Or just notify immediately — let parent refresh.)
        onFiled(data.result.opportunityId, data.result.createdNewOpportunity);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setClassifying(false);
    }
  }

  async function confirmFile(opts: {
    forceOpportunityId?: string;
    createNew?: boolean;
  }) {
    if (filing) return;
    setFiling(true);
    setError(null);
    try {
      const res = await fetch("/api/inbound/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw, ...opts }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || `Failed (${res.status})`);
      }
      const data = (await res.json()) as ClassificationResponse;
      if (data.status === "filed") {
        onFiled(data.result.opportunityId, data.result.createdNewOpportunity);
      } else {
        // Shouldn't happen — if we forced, it should file. Surface as error.
        setError("Filing failed: server requested another confirmation.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setFiling(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-lg flex flex-col"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2
            className="text-xl"
            style={{
              fontFamily: "var(--font-playfair)",
              color: "var(--accent-primary)",
            }}
          >
            Paste email
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text-primary text-xl leading-none px-2"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
          {!response && (
            <>
              <p className="text-xs text-text-muted">
                Paste an email (with headers if you have them) and the Aspen Agent
                will figure out which opportunity it belongs to, file it as a context
                artifact, and queue up next steps. High-confidence matches file
                automatically; lower-confidence ones ask for your confirmation.
              </p>
              <textarea
                rows={14}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="From: taylor@drink.love&#10;Subject: Re: pricing follow-up&#10;Date: ...&#10;&#10;Hey Cale, thanks for the call yesterday. We're ready to move forward if..."
                className="w-full px-3 py-2 rounded-md text-sm bg-bg-elevated text-text-primary placeholder:text-text-dim border border-border-default focus:border-accent focus:outline-none font-mono resize-y"
              />
            </>
          )}

          {response?.status === "filed" && (
            <SuccessState
              classification={response.classification}
              result={response.result}
            />
          )}

          {response?.status === "needs_confirmation" && (
            <ConfirmationState
              classification={response.classification}
              parsed={response.parsed}
              filing={filing}
              onConfirm={confirmFile}
            />
          )}

          {error && (
            <div
              className="px-4 py-3 rounded-md text-sm"
              style={{
                color: "#ef4444",
                backgroundColor: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {!response && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-subtle">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs uppercase tracking-wider rounded-md text-text-muted border border-border-default hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={classify}
              disabled={!raw.trim() || classifying}
              className="px-4 py-2 text-xs uppercase tracking-wider rounded-md transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--accent-primary)",
                color: "var(--bg-base)",
              }}
            >
              {classifying ? "Classifying…" : "Classify + file"}
            </button>
          </div>
        )}

        {response && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-subtle">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs uppercase tracking-wider rounded-md text-text-muted border border-border-default hover:text-text-primary"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfidenceBadge({
  level,
}: {
  level: "high" | "medium" | "low";
}) {
  const map = {
    high: { label: "High confidence", color: "#10b981" },
    medium: { label: "Medium confidence", color: "#f59e0b" },
    low: { label: "Low confidence", color: "#ef4444" },
  };
  const { label, color } = map[level];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider"
      style={{
        color,
        backgroundColor: color + "22",
        border: `1px solid ${color}55`,
      }}
    >
      {label}
    </span>
  );
}

function SummaryBlock({
  classification,
}: {
  classification: ClassificationData;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ConfidenceBadge level={classification.confidence} />
        <span className="text-xs text-text-muted">{classification.reasoning}</span>
      </div>
      <div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim">
          Summary
        </span>
        <p className="text-sm text-text-secondary mt-1 leading-relaxed">
          {classification.summary}
        </p>
      </div>
      {classification.suggestedNextSteps.length > 0 && (
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim">
            Suggested next steps
          </span>
          <ul className="mt-1 flex flex-col gap-1">
            {classification.suggestedNextSteps.map((s, i) => (
              <li
                key={i}
                className="text-sm text-text-secondary flex items-baseline gap-2"
              >
                <span className="text-accent">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SuccessState({
  classification,
  result,
}: {
  classification: ClassificationData;
  result: FileResult;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="px-4 py-3 rounded-md text-sm flex items-center gap-2"
        style={{
          color: "#10b981",
          backgroundColor: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.3)",
        }}
      >
        ✓ Email filed{result.createdNewOpportunity ? " under a new opportunity" : ""}.
      </div>
      <SummaryBlock classification={classification} />
    </div>
  );
}

function ConfirmationState({
  classification,
  parsed,
  filing,
  onConfirm,
}: {
  classification: ClassificationData;
  parsed: { subject: string | null; from: { name: string | null; email: string | null } };
  filing: boolean;
  onConfirm: (opts: { forceOpportunityId?: string; createNew?: boolean }) => void;
}) {
  // Build a unified candidate list: primary match first (if any), then alternatives.
  const candidates: { opportunityId: string; company: string; reason?: string }[] = [];
  if (classification.opportunityId) {
    candidates.push({
      opportunityId: classification.opportunityId,
      company:
        classification.alternatives.find(
          (a) => a.opportunityId === classification.opportunityId
        )?.company || "(best match)",
      reason: classification.reasoning,
    });
  }
  for (const alt of classification.alternatives) {
    if (!candidates.some((c) => c.opportunityId === alt.opportunityId)) {
      candidates.push(alt);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="px-4 py-3 rounded-md text-sm"
        style={{
          color: "var(--text-secondary)",
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div className="text-xs text-text-muted mb-1">
          {parsed.subject ?? "(no subject)"}
        </div>
        <div className="text-xs">
          From: {parsed.from.name ?? ""} {parsed.from.email ? `<${parsed.from.email}>` : ""}
        </div>
      </div>

      <SummaryBlock classification={classification} />

      <div className="flex flex-col gap-2 pt-2 border-t border-border-subtle">
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim">
          File under
        </span>
        {candidates.map((c) => (
          <button
            key={c.opportunityId}
            disabled={filing}
            onClick={() => onConfirm({ forceOpportunityId: c.opportunityId })}
            className="text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-bg-elevated disabled:opacity-50"
            style={{
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div>{c.company}</div>
            {c.reason && (
              <div className="text-xs text-text-muted mt-0.5">{c.reason}</div>
            )}
          </button>
        ))}
        <button
          disabled={filing}
          onClick={() => onConfirm({ createNew: true })}
          className="text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-bg-elevated disabled:opacity-50"
          style={{
            color: "var(--accent-primary)",
            border: "1px dashed var(--accent-primary)",
          }}
        >
          <div>+ Create new opportunity</div>
          {classification.newOpportunity?.company && (
            <div className="text-xs text-text-muted mt-0.5">
              {classification.newOpportunity.company}
              {classification.newOpportunity.email
                ? ` · ${classification.newOpportunity.email}`
                : ""}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
