"use client";

import { useState } from "react";
import type { Opportunity } from "@/lib/types";
import { StagePill } from "./ui/StagePill";
import { FitDot } from "./ui/FitDot";

type Tab = "overview" | "pricing" | "pitch" | "files";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "pricing", label: "Pricing & Equity" },
  { id: "pitch", label: "Sales Pitch" },
  { id: "files", label: "Files" },
];

export function DetailPanel({
  opportunity,
  onClose,
}: {
  opportunity: Opportunity;
  onClose: () => void;
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
        <button
          onClick={onClose}
          aria-label="Close"
          className="text-text-muted hover:text-text-primary text-xl leading-none px-2"
        >
          ×
        </button>
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
        {tab === "overview" && <OverviewTab opp={opportunity} />}
        {tab === "pricing" && <ComingSoon label="Pricing & Equity" />}
        {tab === "pitch" && <ComingSoon label="Sales Pitch" />}
        {tab === "files" && <ComingSoon label="Files" />}
      </div>
    </section>
  );
}

function OverviewTab({ opp }: { opp: Opportunity }) {
  return (
    <div className="flex flex-col gap-6">
      <InfoGrid opp={opp} />
      <Block label="Pain points" body={opp.currentPain} />
      <Block label="Scope notes" body={opp.scopeNotes} />
      <Block label="Notes" body={opp.notes} />
    </div>
  );
}

function InfoGrid({ opp }: { opp: Opportunity }) {
  const items = [
    { label: "Contact", value: opp.contact },
    {
      label: "Fit",
      value: opp.fit ? <FitDot fit={opp.fit} withLabel /> : null,
    },
    {
      label: "Est. Retainer",
      value: opp.retainerEst ? `$${Number(opp.retainerEst).toLocaleString()}/mo` : null,
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
