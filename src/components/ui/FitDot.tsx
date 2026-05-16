import { FIT_META, type FitLevel } from "@/lib/types";

export function FitDot({
  fit,
  withLabel = false,
}: {
  fit: FitLevel;
  withLabel?: boolean;
}) {
  const meta = FIT_META[fit];
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ backgroundColor: meta.color, boxShadow: `0 0 8px ${meta.color}66` }}
      />
      {withLabel && (
        <span className="text-xs" style={{ color: meta.color }}>
          {meta.label}
        </span>
      )}
    </span>
  );
}
