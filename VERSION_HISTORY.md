# Version History — Aspen Hills CRM

> Every meaningful update lands here. Versions increment as `V0.1 → V0.2 → V0.3` for v0 series, then `V1.0` at first production launch.

---

## V0.5.1 — 2026-05-20 · Intake form refinements + W7 workflow

**Summary**
Tuned the intake form based on real usage signal: dropped the "Est. Annual Revenue" field (not needed for quoting), split the single `contact` field into structured `contact_name`, `email`, `phone`. Added an inline hint that pain points/scope/notes are intended to be populated by the Aspen Agent from meeting transcripts — manual entry still works.

Captured the full meeting-to-context workflow as **W7** in `APP_REQUIREMENTS.md` so V0.6 builds toward it directly.

**Changes**
- Migration `supabase/migrations/0003_split_contact.sql` — adds `contact_name`, `email`, `phone` to `opportunities`
- `src/lib/types.ts` — `Opportunity` and `OpportunityRow` gain `contactName`/`email`/`phone`; legacy `contact` field deprecated but still read for display fallback
- `src/lib/mutations.ts` — `OpportunityInput` accepts new fields; `validateAndShape` maps them
- `src/components/IntakeForm.tsx` — removed Revenue field; new 3-column row for Contact name / Email / Phone; hint banner about agent-populated fields
- `src/components/DetailPanel.tsx` — Overview tab shows new contact fields with mailto: / tel: links; falls back to legacy `contact` text for un-migrated rows
- `src/lib/seed.ts` + `scripts/seed.ts` — updated to use the new contact structure
- Docs: `APP_REQUIREMENTS.md` W1 updated, new W7 workflow added; `DATA_DICTIONARY.md` columns documented

**Files affected**
- `supabase/migrations/0003_split_contact.sql` (new)
- `src/lib/{types,mutations,seed}.ts`
- `src/components/{IntakeForm,DetailPanel}.tsx`
- `scripts/seed.ts`
- `APP_REQUIREMENTS.md`, `DATA_DICTIONARY.md`, `VERSION_HISTORY.md`

**Known issues / pending**
- User must apply `0003_split_contact.sql` in Supabase SQL editor before the new contact fields will persist
- The two existing seeded rows (Be LOVE™, Husk) still have their data in the legacy `contact` column; opening them in the edit form and re-saving will migrate them to the new structured fields
- W7 (agent-populated fields from transcripts) is documented but not yet implemented — V0.6 work

---

## V0.5 — 2026-05-19 · Context Library (file uploads with typed kinds)

**Summary**
Extended the v1 Files tab into the typed **Context Library** described in `APP_REQUIREMENTS.md §3a`. Each opportunity can now collect transcripts, emails, JDs, decks, documents, and images — each tagged with a kind, optional tag, and free-form note. Text-based uploads (`text/*`, JSON, XML, YAML, .eml) get their content extracted into `attachments.extracted_text` so the future Aspen Agent has retrievable context. PDF/DOCX extraction deferred.

**Changes**
- DB migration `supabase/migrations/0002_context_library.sql` — adds `kind`, `tag`, `note`, `extracted_text` to `attachments`; new `attachments_kind_idx`
- New `src/lib/attachments.ts` — Supabase Storage upload/delete + signed URL helpers, inline text extraction for text-based MIME types, 10MB enforcement
- New routes: `GET`/`POST /api/opportunities/[id]/attachments`, `GET`/`DELETE /api/attachments/[id]`
- New `src/components/FilesTab.tsx` — drag-and-drop upload zone, kind picker (with auto-suggest from filename/MIME), tag + note fields, attachment list with view/delete actions
- `src/lib/data.ts` extended with `listAttachmentsByOpportunity` + `listAllAttachments`
- `src/lib/types.ts` extended with `ContextKind`, `CONTEXT_KIND_META`, and `Attachment` fields (`kind`, `tag`, `note`, `extractedText`)
- `DetailPanel` Files tab now renders the live FilesTab component (previously stubbed)

**Files affected**
- `supabase/migrations/0002_context_library.sql` (new)
- `src/lib/attachments.ts` (new)
- `src/components/FilesTab.tsx` (new)
- `src/app/api/opportunities/[id]/attachments/route.ts` (new)
- `src/app/api/attachments/[id]/route.ts` (new)
- `src/lib/data.ts`, `src/lib/types.ts`, `src/components/DetailPanel.tsx` (updated)
- `DATA_DICTIONARY.md`, `APP_REQUIREMENTS.md`, `TECHNICAL_SPECIFICATIONS.md`, `VERSION_HISTORY.md`

**Known issues / pending**
- PDF / DOCX text extraction not yet implemented — `extracted_text` is NULL for those uploads. Add `pdf-parse` + `mammoth` in a later pass.
- No virus scanning on uploads (single-tenant tool, acceptable risk for v1).
- Aspen Agent itself not built yet — V0.6 work, gated on Anthropic API key.
- User must apply `0002_context_library.sql` in Supabase SQL editor before uploads will work.

---

## V0.3 — 2026-05-19 · Intake form (create, edit, delete) + inline stage selector

**Summary**
Built the intake form so opportunities can be created, edited, and deleted entirely in the UI. Added an inline stage selector to the detail panel for quick pipeline moves without opening the edit form.

**Changes**
- New `src/lib/mutations.ts` — validation + Supabase write helpers (`createOpportunity`, `updateOpportunity`, `deleteOpportunity`)
- New route handlers: `POST /api/opportunities`, `PATCH /api/opportunities/[id]`, `DELETE /api/opportunities/[id]`
- New `src/components/IntakeForm.tsx` — full intake form with all fields from spec §4 (excluding attachments — those land in V0.5)
- `CRMApp` now manages three view modes: `tracker`, `new`, `edit` — and applies optimistic updates on stage change
- `DetailPanel` gained an Edit button and an inline stage selector inside the Overview tab
- Acceptance criteria W1 (create) and W3 (update stage) now pass

**Files affected**
- `src/lib/mutations.ts` (new)
- `src/app/api/opportunities/route.ts`, `src/app/api/opportunities/[id]/route.ts` (new)
- `src/components/IntakeForm.tsx` (new)
- `src/components/CRMApp.tsx`, `src/components/DetailPanel.tsx` (updated)
- `APP_REQUIREMENTS.md`, `TECHNICAL_SPECIFICATIONS.md`, `VERSION_HISTORY.md`

**Known issues / pending**
- No automated tests for the new mutation paths — manual smoke test only
- Attachments still pending (V0.5 / Context Library)
- AI features still gated on Anthropic API key

---

## V0.2a — 2026-05-15 · Captured Context Library + Aspen Agent direction

**Summary**
Documented a major post-v1 product direction: each opportunity becomes a context-rich record (Fathom transcripts, emails, JDs, decks) that an embedded AI agent ("Aspen Agent") can reason over to suggest next steps, surface risks, draft proposals, and answer questions. Not yet built — captured in `APP_REQUIREMENTS.md` §3a with a priority sequencing plan.

**Files affected**
- `APP_REQUIREMENTS.md` — added §3a (Context Library + AI Agent)
- `VERSION_HISTORY.md` — this entry

**Known issues / pending**
- Technical implications (parsing, embeddings, agent UX) not yet reflected in `TECHNICAL_SPECIFICATIONS.md` — will update when implementation starts

---

## V0.2 — 2026-05-15 · Supabase wired live

**Summary**
Connected the app to the live Supabase project. Schema applied, RLS disabled for v1, storage bucket created. Seed data inserted via script.

**Changes**
- `.env.local` populated with Supabase URL, anon key, service-role key (git-ignored)
- Ran `supabase/reset.sql` against Supabase project `vzoiqclipckfxiihvxlh` (drop + recreate fixed a half-applied initial schema)
- Added `scripts/seed.ts` (idempotent seeder; inserts by company-name check) and `scripts/inspect.ts` (column availability utility)
- Installed `tsx` + `dotenv-cli` as devDependencies for running TS scripts against env
- Seeded Be LOVE™ and Husk opportunities into the live DB with real UUIDs
- Data layer (`src/lib/data.ts`) now pulls from Supabase end-to-end; seed-fallback only fires if env vars are missing

**Files affected**
- `.env.local` (untracked)
- `supabase/reset.sql`
- `scripts/seed.ts`, `scripts/inspect.ts`
- `package.json`, `package-lock.json`
- `VERSION_HISTORY.md`, `TECHNICAL_SPECIFICATIONS.md`, `DATA_DICTIONARY.md`

**Known issues / pending**
- User shared the service-role key in chat — should rotate it via Supabase dashboard after testing finishes
- Intake form still not built (mutation path untested through UI)
- AI features still gated on Anthropic API key
- No automated tests yet

---

## V0.1 — 2026-05-15 · Project foundation + tracker shell

**Summary**
Bootstrapped the Aspen Hills CRM project. Set up Git + GitHub, scaffolded Next.js 16 with TypeScript and Tailwind v4, installed Supabase and Anthropic SDKs, and built the initial tracker UI with seed data.

**Changes**
- Initialized git repo at `~/Documents/Claude Code/Aspen Hills CRM`; pushed to `github.com/cale-ng/aspen-hills-crm`
- Configured global git identity (`cale-ng` / no-reply email) + SSH key auth
- Added initial product spec at `docs/aspen_hills_crm_spec.md`
- Scaffolded Next.js 16 (App Router + Turbopack, TypeScript, Tailwind v4, ESLint, src/ directory)
- Installed dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `@anthropic-ai/sdk`
- Built design token system (dark mode tokens from spec → CSS vars + Tailwind theme inline)
- Built tracker UI: `Header`, `PipelineFilter`, `OpportunityList`, `DetailPanel` (Overview tab only), `CRMApp` shell
- Added domain types (`src/lib/types.ts`) and server-only data layer (`src/lib/data.ts`) with seed fallback when Supabase env vars unset
- Drafted Postgres schema in `supabase/schema.sql` (opportunities, attachments, storage bucket, trigger)
- Added project documentation: `TECHNICAL_SPECIFICATIONS.md`, `APP_REQUIREMENTS.md`, `DATA_DICTIONARY.md`, `TESTING_REQUIREMENTS.md`, `VERSION_HISTORY.md`
- Added project rule to `CLAUDE.md` mandating doc updates on every meaningful change

**Files affected**
- `src/app/{layout,page,globals.css}.tsx`
- `src/components/{CRMApp,Header,PipelineFilter,OpportunityList,DetailPanel}.tsx`
- `src/components/ui/{StagePill,FitDot}.tsx`
- `src/lib/{types,data,seed,supabase/server}.ts`
- `supabase/schema.sql`
- `.env.local.example`
- `docs/aspen_hills_crm_spec.md`
- `TECHNICAL_SPECIFICATIONS.md`, `APP_REQUIREMENTS.md`, `DATA_DICTIONARY.md`, `TESTING_REQUIREMENTS.md`, `VERSION_HISTORY.md`
- `CLAUDE.md`

**Known issues / pending**
- Supabase credentials not yet configured — UI runs on seed-data fallback
- Anthropic API key not yet configured — AI features stubbed
- Intake form (new/edit) not built yet
- Pricing & Equity, Sales Pitch, Files tabs are placeholder UIs
- No automated tests yet (manual smoke checks only)
- No CI workflow yet
