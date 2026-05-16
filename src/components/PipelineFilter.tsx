"use client";

import { PIPELINE_STAGES, STAGE_META, type PipelineStage } from "@/lib/types";

type Props = {
  counts: Record<PipelineStage, number>;
  active: PipelineStage | null;
  onChange: (stage: PipelineStage | null) => void;
};

export function PipelineFilter({ counts, active, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2 px-6 py-3 border-b border-border-subtle bg-bg-surface">
      {PIPELINE_STAGES.map((stage) => {
        const meta = STAGE_META[stage];
        const isActive = active === stage;
        const count = counts[stage] ?? 0;
        return (
          <button
            key={stage}
            onClick={() => onChange(isActive ? null : stage)}
            className="px-3 py-1.5 rounded-md text-[11px] uppercase tracking-wider transition-all"
            style={{
              color: isActive ? meta.color : "var(--text-muted)",
              backgroundColor: isActive ? meta.tint : "transparent",
              border: `1px solid ${isActive ? meta.color + "44" : "var(--border-subtle)"}`,
            }}
          >
            {stage}
            <span className="ml-2 opacity-70">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
