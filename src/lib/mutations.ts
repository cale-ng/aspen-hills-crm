import "server-only";
import { supabaseServer } from "./supabase/server";
import {
  type Opportunity,
  type OpportunityRow,
  type FitLevel,
  type PipelineStage,
  PIPELINE_STAGES,
  rowToOpportunity,
} from "./types";

const FIT_VALUES: FitLevel[] = ["high", "medium", "low"];

export interface OpportunityInput {
  company: string;
  contact?: string | null;
  website?: string | null;
  industry?: string | null;
  revenue?: string | null;
  currentPain?: string | null;
  scopeNotes?: string | null;
  notes?: string | null;
  fit?: FitLevel;
  retainerEst?: string | null;
  stage?: PipelineStage;
}

/**
 * Validates an OpportunityInput. Throws a descriptive Error on failure.
 * Returns the snake_case row ready for Supabase.
 */
function validateAndShape(
  input: OpportunityInput | Partial<OpportunityInput>,
  partial = false
) {
  if (!partial && (!input.company || !input.company.trim())) {
    throw new Error("Company is required.");
  }
  if (input.fit && !FIT_VALUES.includes(input.fit)) {
    throw new Error(`Invalid fit value: ${input.fit}`);
  }
  if (input.stage && !PIPELINE_STAGES.includes(input.stage)) {
    throw new Error(`Invalid stage value: ${input.stage}`);
  }

  const row: Record<string, unknown> = {};
  if (input.company !== undefined)      row.company       = input.company.trim();
  if (input.contact !== undefined)      row.contact       = input.contact;
  if (input.website !== undefined)      row.website       = input.website;
  if (input.industry !== undefined)     row.industry      = input.industry;
  if (input.revenue !== undefined)      row.revenue       = input.revenue;
  if (input.currentPain !== undefined)  row.current_pain  = input.currentPain;
  if (input.scopeNotes !== undefined)   row.scope_notes   = input.scopeNotes;
  if (input.notes !== undefined)        row.notes         = input.notes;
  if (input.fit !== undefined)          row.fit           = input.fit;
  if (input.retainerEst !== undefined)  row.retainer_est  = input.retainerEst;
  if (input.stage !== undefined)        row.stage         = input.stage;
  return row;
}

export async function createOpportunity(input: OpportunityInput): Promise<Opportunity> {
  const supabase = supabaseServer();
  const row = validateAndShape(input);

  const { data, error } = await supabase
    .from("opportunities")
    .insert(row)
    .select("*")
    .single();

  if (error) throw new Error(`createOpportunity: ${error.message}`);
  return rowToOpportunity(data as OpportunityRow);
}

export async function updateOpportunity(
  id: string,
  input: Partial<OpportunityInput>
): Promise<Opportunity> {
  const supabase = supabaseServer();
  const row = validateAndShape(input, true);

  if (Object.keys(row).length === 0) {
    throw new Error("No fields to update.");
  }

  const { data, error } = await supabase
    .from("opportunities")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(`updateOpportunity: ${error.message}`);
  return rowToOpportunity(data as OpportunityRow);
}

export async function deleteOpportunity(id: string): Promise<void> {
  const supabase = supabaseServer();
  const { error } = await supabase.from("opportunities").delete().eq("id", id);
  if (error) throw new Error(`deleteOpportunity: ${error.message}`);
}
