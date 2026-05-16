import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const COLS = [
  "id", "company", "contact", "website", "industry", "revenue",
  "current_pain", "scope_notes", "notes", "fit", "retainer_est",
  "stage", "pitch", "pricing", "created_at", "updated_at",
];

async function main() {
  console.log("Column availability check on `opportunities`:");
  for (const col of COLS) {
    const r = await supabase.from("opportunities").select(col).limit(1);
    const ok = r.error ? "✗ MISSING" : "✓ exists";
    console.log(`  ${ok}  ${col}` + (r.error ? `  (${r.error.message})` : ""));
  }

  // Same for attachments
  console.log("\nColumn availability check on `attachments`:");
  const ATTACH = ["id","opportunity_id","name","mime_type","size_bytes","storage_path","is_reference","created_at"];
  for (const col of ATTACH) {
    const r = await supabase.from("attachments").select(col).limit(1);
    const ok = r.error ? "✗ MISSING" : "✓ exists";
    console.log(`  ${ok}  ${col}` + (r.error ? `  (${r.error.message})` : ""));
  }
}

main();
