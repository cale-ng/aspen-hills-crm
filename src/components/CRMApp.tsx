"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Opportunity, PipelineStage } from "@/lib/types";
import { PIPELINE_STAGES } from "@/lib/types";
import { Header } from "./Header";
import { PipelineFilter } from "./PipelineFilter";
import { OpportunityList } from "./OpportunityList";
import { DetailPanel } from "./DetailPanel";
import { IntakeForm } from "./IntakeForm";

type View =
  | { kind: "tracker" }
  | { kind: "new" }
  | { kind: "edit"; opportunity: Opportunity };

export function CRMApp({
  initialOpportunities,
}: {
  initialOpportunities: Opportunity[];
}) {
  const router = useRouter();
  const [opportunities, setOpportunities] =
    useState<Opportunity[]>(initialOpportunities);
  const [stageFilter, setStageFilter] = useState<PipelineStage | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: "tracker" });

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

  function handleSaved(saved: Opportunity) {
    setOpportunities((prev) => {
      const idx = prev.findIndex((o) => o.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
    setSelectedId(saved.id);
    setView({ kind: "tracker" });
  }

  function handleDeleted() {
    if (view.kind !== "edit") return;
    const removedId = view.opportunity.id;
    setOpportunities((prev) => prev.filter((o) => o.id !== removedId));
    if (selectedId === removedId) setSelectedId(null);
    setView({ kind: "tracker" });
  }

  /** Update a single opportunity field (used by inline stage selector). */
  async function patchOpportunity(
    id: string,
    changes: Partial<Opportunity>
  ) {
    // Optimistic update.
    setOpportunities((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...changes } : o))
    );

    const res = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });

    if (!res.ok) {
      // Roll back on failure.
      router.refresh();
      return;
    }
    const saved: Opportunity = await res.json();
    setOpportunities((prev) => prev.map((o) => (o.id === id ? saved : o)));
  }

  if (view.kind === "new" || view.kind === "edit") {
    return (
      <div className="flex flex-col h-screen">
        <Header
          onNewOpportunity={() => setView({ kind: "new" })}
          opportunityCount={opportunities.length}
        />
        <IntakeForm
          existing={view.kind === "edit" ? view.opportunity : null}
          onCancel={() => {
            if (view.kind === "edit") {
              // After delete handleDeleted already routes — guard against stale.
              setView({ kind: "tracker" });
            } else {
              setView({ kind: "tracker" });
            }
          }}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header
        onNewOpportunity={() => setView({ kind: "new" })}
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
            onEdit={() => setView({ kind: "edit", opportunity: selected })}
            onStageChange={(stage) =>
              patchOpportunity(selected.id, { stage })
            }
          />
        )}
      </div>
    </div>
  );
}
