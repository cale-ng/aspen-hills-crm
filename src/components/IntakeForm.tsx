"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FIT_META,
  PIPELINE_STAGES,
  type FitLevel,
  type Opportunity,
  type PipelineStage,
} from "@/lib/types";

type Props = {
  /** When set, the form is in edit mode; otherwise create mode. */
  existing: Opportunity | null;
  onCancel: () => void;
  /** Called after a successful save with the new/updated opportunity. */
  onSaved: (opp: Opportunity) => void;
  /** Called after a successful delete (edit mode only). */
  onDeleted?: () => void;
};

type FormState = {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  currentPain: string;
  scopeNotes: string;
  notes: string;
  fit: FitLevel;
  retainerEst: string;
  stage: PipelineStage;
};

function toFormState(opp: Opportunity | null): FormState {
  return {
    company: opp?.company ?? "",
    contactName: opp?.contactName ?? "",
    email: opp?.email ?? "",
    phone: opp?.phone ?? "",
    website: opp?.website ?? "",
    industry: opp?.industry ?? "",
    currentPain: opp?.currentPain ?? "",
    scopeNotes: opp?.scopeNotes ?? "",
    notes: opp?.notes ?? "",
    fit: opp?.fit ?? "medium",
    retainerEst: opp?.retainerEst ?? "",
    stage: opp?.stage ?? "Qualifying",
  };
}

export function IntakeForm({ existing, onCancel, onSaved, onDeleted }: Props) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(toFormState(existing));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isEdit = !!existing;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // Convert empty strings to null so the DB stores NULL rather than "".
    const body = {
      company: state.company.trim(),
      contactName: state.contactName.trim() || null,
      email: state.email.trim() || null,
      phone: state.phone.trim() || null,
      website: state.website.trim() || null,
      industry: state.industry.trim() || null,
      currentPain: state.currentPain.trim() || null,
      scopeNotes: state.scopeNotes.trim() || null,
      notes: state.notes.trim() || null,
      fit: state.fit,
      retainerEst: state.retainerEst.trim() || null,
      stage: state.stage,
    };

    try {
      const url = isEdit ? `/api/opportunities/${existing!.id}` : "/api/opportunities";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(msg.error || `Save failed (${res.status})`);
      }
      const saved: Opportunity = await res.json();
      router.refresh();
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm(`Delete ${existing!.company}? This cannot be undone.`)) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${existing!.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const msg = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(msg.error || `Delete failed (${res.status})`);
      }
      router.refresh();
      if (onDeleted) onDeleted();
      else onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setDeleting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-1 overflow-auto p-8 max-w-3xl mx-auto w-full flex flex-col gap-6"
    >
      <div className="flex items-center justify-between">
        <h2
          className="text-3xl"
          style={{ fontFamily: "var(--font-playfair)", color: "var(--accent-primary)" }}
        >
          {isEdit ? `Edit ${existing!.company}` : "New Opportunity"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          ← Back to tracker
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-md text-sm" style={{
          color: "#ef4444",
          backgroundColor: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.3)",
        }}>
          {error}
        </div>
      )}

      <Field label="Company *" required>
        <input
          type="text"
          required
          value={state.company}
          onChange={(e) => update("company", e.target.value)}
          className={inputCls}
          placeholder="Be LOVE™"
        />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Contact name">
          <input
            type="text"
            value={state.contactName}
            onChange={(e) => update("contactName", e.target.value)}
            className={inputCls}
            placeholder="Taylor Smith"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={state.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputCls}
            placeholder="taylor@drink.love"
          />
        </Field>
        <Field label="Phone">
          <input
            type="tel"
            value={state.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={inputCls}
            placeholder="Optional"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Website">
          <input
            type="text"
            value={state.website}
            onChange={(e) => update("website", e.target.value)}
            className={inputCls}
            placeholder="drink.love"
          />
        </Field>
        <Field label="Industry / Category">
          <input
            type="text"
            value={state.industry}
            onChange={(e) => update("industry", e.target.value)}
            className={inputCls}
            placeholder="Functional Beverage"
          />
        </Field>
      </div>

      <div
        className="rounded-md p-3 text-xs leading-relaxed"
        style={{
          color: "var(--text-muted)",
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        💡 <span className="text-text-secondary">Pain points, scope, and notes</span> are
        populated by the Aspen Agent after a meeting — upload the Fathom transcript or
        notes in the <span className="text-text-secondary">Files</span> tab and the agent
        will summarize and fill these in. You can also edit manually below.
      </div>

      <Field label="Current Pain Points">
        <textarea
          rows={4}
          value={state.currentPain}
          onChange={(e) => update("currentPain", e.target.value)}
          className={textareaCls}
          placeholder="What's broken? Why did they reach out? (Or leave blank — agent will fill from meeting context.)"
        />
      </Field>

      <Field label="Scope Notes">
        <textarea
          rows={3}
          value={state.scopeNotes}
          onChange={(e) => update("scopeNotes", e.target.value)}
          className={textareaCls}
          placeholder="What are they asking for? Engagement shape?"
        />
      </Field>

      <Field label="Additional Notes">
        <textarea
          rows={3}
          value={state.notes}
          onChange={(e) => update("notes", e.target.value)}
          className={textareaCls}
          placeholder="Referral source, founder background, network context…"
        />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Pipeline Stage">
          <select
            value={state.stage}
            onChange={(e) => update("stage", e.target.value as PipelineStage)}
            className={inputCls}
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Fit Assessment">
          <select
            value={state.fit}
            onChange={(e) => update("fit", e.target.value as FitLevel)}
            className={inputCls}
          >
            {(["high", "medium", "low"] as FitLevel[]).map((f) => (
              <option key={f} value={f}>{FIT_META[f].label}</option>
            ))}
          </select>
        </Field>
        <Field label="Est. Monthly Retainer ($)">
          <input
            type="text"
            inputMode="numeric"
            value={state.retainerEst}
            onChange={(e) => update("retainerEst", e.target.value)}
            className={inputCls}
            placeholder="7500"
          />
        </Field>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
        <div>
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="px-3 py-2 text-xs uppercase tracking-wider rounded-md transition-colors"
              style={{
                color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              {deleting ? "Deleting…" : "Delete opportunity"}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs uppercase tracking-wider rounded-md text-text-muted border border-border-default hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || deleting}
            className="px-4 py-2 text-xs uppercase tracking-wider rounded-md transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "var(--bg-base)",
            }}
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create opportunity"}
          </button>
        </div>
      </div>
    </form>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-md text-sm bg-bg-elevated text-text-primary placeholder:text-text-dim border border-border-default focus:border-accent focus:outline-none";

const textareaCls = inputCls + " resize-y leading-relaxed";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </span>
      {children}
    </label>
  );
}
