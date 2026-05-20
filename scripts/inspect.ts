import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const OPP_COLS = [
  "id", "company", "contact", "contact_name", "email", "phone",
  "website", "industry", "revenue", "current_pain", "scope_notes",
  "notes", "fit", "retainer_est", "stage", "pitch", "pricing",
  "created_at", "updated_at",
];

const ATTACH_COLS = [
  "id", "opportunity_id", "name", "mime_type", "size_bytes",
  "storage_path", "is_reference", "kind", "tag", "note",
  "extracted_text", "created_at",
];

async function check(table: string, cols: string[]) {
  console.log(`\n${table}:`);
  for (const col of cols) {
    const r = await supabase.from(table).select(col).limit(1);
    const ok = r.error ? "✗ MISSING" : "✓";
    console.log(`  ${ok}  ${col}` + (r.error ? `  (${r.error.message})` : ""));
  }
}

async function main() {
  await check("opportunities", OPP_COLS);
  await check("attachments", ATTACH_COLS);
}

main();
