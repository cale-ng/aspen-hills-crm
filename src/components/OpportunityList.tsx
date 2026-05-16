"use client";

import type { Opportunity } from "@/lib/types";
import { StagePill } from "./ui/StagePill";
import { FitDot } from "./ui/FitDot";

type Props = {
  opportunities: Opportunity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** When true, render in compact mode (used when detail panel is open) */
  compact?: boolean;
};

function formatRetainer(value: string | null): string {
  if (!value) return "—";
  const num = Number(value);
  if (Number.isFinite(num)) {
    return `$${num.toLocaleString()}/mo`;
  }
  return value;
}

export function OpportunityList({
  opportunities,
  selectedId,
  onSelect,
  compact = false,
}: Props) {
  if (opportunities.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted text-sm">
        No opportunities match the current filters.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border-subtle">
      {opportunities.map((opp) => {
        const isSelected = selectedId === opp.id;
        return (
          <li key={opp.id}>
            <button
              onClick={() => onSelect(opp.id)}
              className="w-full text-left px-6 py-4 hover:bg-bg-elevated transition-colors flex flex-col gap-2"
              style={{
                backgroundColor: isSelected
                  ? "var(--bg-elevated)"
                  : "transparent",
                borderLeft: `2px solid ${isSelected ? "var(--accent-primary)" : "transparent"}`,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FitDot fit={opp.fit} />
                  <span className="text-text-primary font-medium truncate">
                    {opp.company}
                  </span>
                </div>
                <StagePill stage={opp.stage} />
              </div>
              {!compact && (
                <div className="flex items-center justify-between gap-3 text-xs text-text-muted">
                  <span className="truncate">{opp.industry || "—"}</span>
                  <span className="whitespace-nowrap">
                    {formatRetainer(opp.retainerEst)}
                  </span>
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
