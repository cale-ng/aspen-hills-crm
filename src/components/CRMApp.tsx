"use client";

import { useMemo, useState } from "react";
import type { Opportunity, PipelineStage } from "@/lib/types";
import { PIPELINE_STAGES } from "@/lib/types";
import { Header } from "./Header";
import { PipelineFilter } from "./PipelineFilter";
import { OpportunityList } from "./OpportunityList";
import { DetailPanel } from "./DetailPanel";

export function CRMApp({
  initialOpportunities,
}: {
  initialOpportunities: Opportunity[];
}) {
  const [opportunities] = useState<Opportunity[]>(initialOpportunities);
  const [stageFilter, setStageFilter] = useState<PipelineStage | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(
      PIPELINE_STAGES.map((s) => [s, 0])
    ) as Record<PipelineStage, number>;
    for (const o of opportunities) counts[o.stage] += 1;
    return counts;
  }, [opportunities]);

  const filtered = useMemo(() => {
    if (!stageFilter) return opportunities;
    return opportunities.filter((o) => o.stage === stageFilter);
  }, [opportunities, stageFilter]);

  const selected = useMemo(
    () => opportunities.find((o) => o.id === selectedId) ?? null,
    [opportunities, selectedId]
  );

  return (
    <div className="flex flex-col h-screen">
      <Header
        onNewOpportunity={() => alert("Intake form coming next")}
        opportunityCount={opportunities.length}
      />
      <PipelineFilter
        counts={stageCounts}
        active={stageFilter}
        onChange={setStageFilter}
      />

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`overflow-auto border-r border-border-subtle ${
            selected ? "w-[360px] flex-shrink-0" : "flex-1"
          }`}
        >
          <OpportunityList
            opportunities={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            compact={!!selected}
          />
        </div>
        {selected && (
          <DetailPanel
            opportunity={selected}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}
