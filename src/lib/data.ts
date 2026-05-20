import "server-only";
import { supabaseServer } from "./supabase/server";
import {
  type Attachment,
  type AttachmentRow,
  type Opportunity,
  type OpportunityRow,
  rowToAttachment,
  rowToOpportunity,
} from "./types";
import { SEED_OPPORTUNITIES } from "./seed";

/**
 * Returns true if Supabase env vars are configured. Lets us run the
 * UI locally before the DB is wired up.
 */
function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function listOpportunities(): Promise<Opportunity[]> {
  if (!supabaseConfigured()) {
    return SEED_OPPORTUNITIES;
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`listOpportunities: ${error.message}`);
  return (data as OpportunityRow[]).map(rowToOpportunity);
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  if (!supabaseConfigured()) {
    return SEED_OPPORTUNITIES.find((o) => o.id === id) ?? null;
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getOpportunity: ${error.message}`);
  return data ? rowToOpportunity(data as OpportunityRow) : null;
}

export async function listAttachmentsByOpportunity(
  opportunityId: string
): Promise<Attachment[]> {
  if (!supabaseConfigured()) return [];

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listAttachmentsByOpportunity: ${error.message}`);
  return (data as AttachmentRow[]).map(rowToAttachment);
}

export async function listAllAttachments(): Promise<
  Record<string, Attachment[]>
> {
  if (!supabaseConfigured()) return {};

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listAllAttachments: ${error.message}`);

  const grouped: Record<string, Attachment[]> = {};
  for (const row of (data as AttachmentRow[])) {
    const att = rowToAttachment(row);
    (grouped[att.opportunityId] ??= []).push(att);
  }
  return grouped;
}
