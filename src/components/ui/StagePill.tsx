import { STAGE_META, type PipelineStage } from "@/lib/types";

export function StagePill({ stage }: { stage: PipelineStage }) {
  const meta = STAGE_META[stage];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider whitespace-nowrap"
      style={{
        color: meta.color,
        backgroundColor: meta.tint,
        border: `1px solid ${meta.color}33`,
      }}
    >
      {stage}
    </span>
  );
}
