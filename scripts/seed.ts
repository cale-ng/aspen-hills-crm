/**
 * One-time seed script.
 * Run with: npx tsx scripts/seed.ts
 *
 * Idempotent: uses upsert on the `id` column.
 */
import { createClient } from "@supabase/supabase-js";
import { SEED_OPPORTUNITIES } from "../src/lib/seed";
import type { Opportunity } from "../src/lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing env vars. Run with: dotenv -e .env.local -- npx tsx scripts/seed.ts");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

function toRow(o: Opportunity) {
  return {
    id: o.id,
    company: o.company,
    contact: o.contact,
    contact_name: o.contactName,
    email: o.email,
    phone: o.phone,
    website: o.website,
    industry: o.industry,
    revenue: o.revenue,
    current_pain: o.currentPain,
    scope_notes: o.scopeNotes,
    notes: o.notes,
    fit: o.fit,
    retainer_est: o.retainerEst,
    stage: o.stage,
    pitch: o.pitch,
    pricing: o.pricing,
  };
}

async function main() {
  // Sanity check: confirm the table exists.
  const { error: pingError } = await supabase
    .from("opportunities")
    .select("id", { count: "exact", head: true });

  if (pingError) {
    console.error("Could not query opportunities table:", pingError.message);
    console.error("Did you run supabase/schema.sql in the Supabase SQL editor?");
    process.exit(1);
  }

  const rows = SEED_OPPORTUNITIES.map(toRow);

  // Note: seed UUIDs in seed.ts aren't real UUIDs ("belove-001", "husk-001").
  // For upsert by id we need real UUIDs — switch to upsert by `company` instead.
  // We use `onConflict` on the `company` column with a unique index check.
  // Since there's no unique constraint on company, we'll insert if not present.
  for (const row of rows) {
    const { data: existing, error: lookupError } = await supabase
      .from("opportunities")
      .select("id")
      .eq("company", row.company)
      .maybeSingle();

    if (lookupError) {
      console.error(`Lookup failed for ${row.company}:`, lookupError.message);
      continue;
    }

    if (existing) {
      console.log(`• ${row.company} already exists (${existing.id}) — skipping`);
      continue;
    }

    // Drop the synthetic id so Postgres generates a real UUID.
    const { id: _id, ...rowWithoutId } = row;
    void _id;
    const { data, error } = await supabase
      .from("opportunities")
      .insert(rowWithoutId)
      .select("id")
      .single();

    if (error) {
      console.error(`Insert failed for ${row.company}:`, error.message);
    } else {
      console.log(`✓ Inserted ${row.company} (${data.id})`);
    }
  }

  console.log("\nSeed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
