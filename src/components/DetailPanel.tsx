"use client";

import { useState } from "react";
import type { Opportunity, PipelineStage } from "@/lib/types";
import { PIPELINE_STAGES, STAGE_META } from "@/lib/types";
import { StagePill } from "./ui/StagePill";
import { FitDot } from "./ui/FitDot";
import { FilesTab } from "./FilesTab";
import { AgentTab } from "./AgentTab";

type Tab = "overview" | "agent" | "pricing" | "files";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "agent", label: "Agent" },
  { id: "pricing", label: "Pricing & Equity" },
  { id: "files", label: "Files" },
];

export function DetailPanel({
  opportunity,
  onClose,
  onEdit,
  onStageChange,
}: {
  opportunity: Opportunity;
  onClose: () => void;
  onEdit: () => void;
  onStageChange: (stage: PipelineStage) => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <section className="flex-1 flex flex-col bg-bg-surface border-l border-border-subtle">
      {/* Title bar */}
      <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border-subtle">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-3">
            <FitDot fit={opportunity.fit} withLabel />
            <h2
              className="text-2xl truncate"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {opportunity.company}
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span>{opportunity.industry || "—"}</span>
            <span>·</span>
            <StagePill stage={opportunity.stage} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-xs uppercase tracking-wider rounded-md text-text-muted hover:text-text-primary transition-colors border border-border-default"
          >
            Edit
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text-primary text-xl leading-none px-2"
          >
            ×
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 border-b border-border-subtle">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 py-2 text-xs uppercase tracking-wider transition-colors"
              style={{
                color: active ? "var(--accent-primary)" : "var(--text-muted)",
                borderBottom: `2px solid ${active ? "var(--accent-primary)" : "transparent"}`,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6">
        {tab === "overview" && (
          <OverviewTab opp={opportunity} onStageChange={onStageChange} />
        )}
        {tab === "agent" && <AgentTab opportunityId={opportunity.id} />}
        {tab === "pricing" && <ComingSoon label="Pricing & Equity" />}
        {tab === "files" && <FilesTab opportunityId={opportunity.id} />}
      </div>
    </section>
  );
}

function OverviewTab({
  opp,
  onStageChange,
}: {
  opp: Opportunity;
  onStageChange: (stage: PipelineStage) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <InfoGrid opp={opp} />
      <StageSelector current={opp.stage} onChange={onStageChange} />
      <Block label="Pain points" body={opp.currentPain} />
      <Block label="Scope notes" body={opp.scopeNotes} />
      <Block label="Notes" body={opp.notes} />
    </div>
  );
}

function StageSelector({
  current,
  onChange,
}: {
  current: PipelineStage;
  onChange: (stage: PipelineStage) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim">
        Pipeline Stage
      </span>
      <div className="flex flex-wrap gap-1.5">
        {PIPELINE_STAGES.map((s) => {
          const meta = STAGE_META[s];
          const active = current === s;
          return (
            <button
              key={s}
              onClick={() => !active && onChange(s)}
              className="px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-md transition-all"
              style={{
                color: active ? meta.color : "var(--text-muted)",
                backgroundColor: active ? meta.tint : "transparent",
                border: `1px solid ${active ? meta.color + "55" : "var(--border-subtle)"}`,
              }}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InfoGrid({ opp }: { opp: Opportunity }) {
  // Prefer the new structured contact field; fall back to legacy `contact` text
  // for older rows that haven't been re-saved through the new intake form yet.
  const contactDisplay = opp.contactName || opp.contact;

  const items: { label: string; value: React.ReactNode }[] = [
    { label: "Contact", value: contactDisplay },
    {
      label: "Email",
      value: opp.email ? (
        <a
          href={`mailto:${opp.email}`}
          className="hover:text-accent"
        >
          {opp.email}
        </a>
      ) : null,
    },
    {
      label: "Phone",
      value: opp.phone ? (
        <a href={`tel:${opp.phone}`} className="hover:text-accent">
          {opp.phone}
        </a>
      ) : null,
    },
    {
      label: "Fit",
      value: opp.fit ? <FitDot fit={opp.fit} withLabel /> : null,
    },
    {
      label: "Est. Retainer",
      value: opp.retainerEst
        ? `$${Number(opp.retainerEst).toLocaleString()}/mo`
        : null,
    },
    {
      label: "Date Added",
      value: new Date(opp.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim">
            {it.label}
          </span>
          <span className="text-sm text-text-primary">
            {it.value || <span className="text-text-muted">—</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function Block({ label, body }: { label: string; body: string | null }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim">
        {label}
      </span>
      <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
        {body || <span className="text-text-muted italic">Not set</span>}
      </p>
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-text-muted text-sm">
      {label} — coming soon.
    </div>
  );
}
