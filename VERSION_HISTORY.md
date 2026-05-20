# Version History — Aspen Hills CRM

> Every meaningful update lands here. Versions increment as `V0.1 → V0.2 → V0.3` for v0 series, then `V1.0` at first production launch.

---

## V0.7 — 2026-05-20 · Paste email → auto-classify + file (Aspen Agent inbox)

**Summary**
Built the paste-based email ingestion path from `APP_REQUIREMENTS §3b`. A new "📧 Paste email" button in the header opens a modal where Cale pastes any client email; the agent figures out which opportunity it belongs to, files the raw email as a `.eml` attachment under that opportunity, and posts a structured summary + suggested next steps to the opportunity's chat thread. High-confidence matches file automatically; lower-confidence ones present a candidate picker with "create new opportunity" as a fallback.

**Changes**
- New `src/lib/email.ts` — naive RFC822 header parser + Anthropic-backed classifier. Classifier sends all existing opportunities' identity fields (id, company, contact email, industry, stage) plus the email body, returns JSON with `confidence`, best-match `opportunityId`, `reasoning`, `summary`, `suggestedNextSteps[]`, `alternatives[]`, and `newOpportunity` extraction.
- New `fileEmail()` helper: uploads raw email as `.eml` (kind=email) via existing `uploadAttachment`, then calls new `postAssistantNote()` in agent.ts to log the summary + next steps in the opportunity's persistent chat thread.
- New route `POST /api/inbound/email` — single endpoint with classify-then-file logic. Body: `{ raw, forceOpportunityId?, createNew? }`. Auto-files at `confidence: "high"` with matched `opportunityId`; otherwise returns `{ status: "needs_confirmation", classification, parsed }`.
- New route `GET /api/opportunities` — list endpoint for client-side refresh after email filing creates new rows.
- New `src/lib/agent.ts → postAssistantNote()` — public helper to append a system-generated assistant message (no Anthropic call).
- New `src/components/PasteEmailModal.tsx` — full modal UI: paste textarea → classify → success state OR confirmation state with candidate buttons + "Create new opportunity" option.
- `src/components/Header.tsx` — adds "📧 Paste email" button next to "+ New Opportunity".
- `src/components/CRMApp.tsx` — wires modal + refreshes opportunity list after filing + selects the filed opportunity in the tracker.

**Files affected**
- `src/lib/email.ts` (new)
- `src/lib/agent.ts` (added `postAssistantNote`)
- `src/app/api/inbound/email/route.ts` (new)
- `src/app/api/opportunities/route.ts` (added GET)
- `src/components/PasteEmailModal.tsx` (new)
- `src/components/Header.tsx`, `src/components/CRMApp.tsx`
- `APP_REQUIREMENTS.md`, `TECHNICAL_SPECIFICATIONS.md`, `VERSION_HISTORY.md`

**Known issues / pending**
- Email parsing is naive — handles common Gmail/Outlook paste formats but not multipart MIME, encoded headers, or attachments-within-the-email. Pasted plain text body usually works fine.
- Classifier confidence threshold is binary (only "high" auto-files). Worth tuning if "medium" turns out to be reliable in practice.
- No deduplication — pasting the same email twice files it twice. Future enhancement: hash the body + check for prior identical attachment on the same opportunity.
- The "next steps" land as text in the chat — they're discoverable but not yet structured (e.g., to render in a global "next actions queue" on the dashboard). That's V0.7.1 / V0.8 work.
- V0.8 forwarding path (real inbound email via Postmark/Resend/Cloudflare) still pending — reuses the V0.7 classification + filing logic, only triggered by webhook instead of paste.

---

## V0.6.4 — 2026-05-20 · Captured email ingestion + dashboard directions

**Summary**
Documented two major upcoming features in `APP_REQUIREMENTS.md`:
- **§3b Email Ingestion** — phased plan: V0.7 paste-based ingestion (no infra) → V0.8 real inbound email via Postmark/Resend/Cloudflare with webhook + MX records. Agent classifies which opportunity, files as email artifact, generates summary + next steps.
- **§3c Dashboard** — `/dashboard` route with KPI strip, pipeline funnel, agent-generated "next actions queue", stale opportunity flags, plus retrospective views (contacts table, industry/role breakdowns, win/loss trends, conversion rate).

No code changes — these are scope captures, not builds.

**Files affected**
- `APP_REQUIREMENTS.md` — added §3b (Email Ingestion) and §3c (Dashboard)
- `VERSION_HISTORY.md` — this entry

---

## V0.6.3 — 2026-05-20 · Persistent agent chat in the database

**Summary**
Moved agent conversations from browser localStorage into Supabase so they survive device changes, browser changes, cache clears, and time. Each opportunity now has its own permanent chat log — open it from any device and continue the deep-dive where you left off. Reverses the V0.6 "in-browser ephemeral" decision based on actual usage signal.

**Changes**
- New migration `supabase/migrations/0004_agent_messages.sql` — creates `opportunity_messages` table (id, opportunity_id FK with cascade, role, content, attachments JSONB, created_at) + index on `(opportunity_id, created_at)`
- `src/lib/agent.ts` — adds `listMessages()`, `clearMessages()`, internal `saveMessage()`; `agentReply()` now takes a single `{ opportunityId, content, attachments }` input. It persists the user message first, loads full history from DB, calls Anthropic, then saves the assistant reply. Rolls back the user message if Anthropic fails so the conversation isn't left dangling.
- API route changes (`/api/opportunities/[id]/agent`):
  - **GET** — return `{ messages }` (full history, ordered)
  - **POST** — new body shape `{ content, attachments? }`; returns `{ userMessage, assistantMessage, usage }`
  - **DELETE** — clear all messages for the opportunity
- `src/components/AgentTab.tsx` — fetches history from server on mount instead of localStorage; renders optimistic user message while waiting for reply; "New chat" button hits DELETE
- localStorage code removed entirely

**Files affected**
- `supabase/migrations/0004_agent_messages.sql` (new)
- `src/lib/agent.ts`
- `src/app/api/opportunities/[id]/agent/route.ts`
- `src/components/AgentTab.tsx`
- `DATA_DICTIONARY.md`, `TECHNICAL_SPECIFICATIONS.md`, `VERSION_HISTORY.md`

**Known issues / pending**
- User must apply `0004_agent_messages.sql` in Supabase SQL editor before chat works
- Existing localStorage conversations (from V0.6 / V0.6.1) are discarded — they were limited to recent testing
- No conversation summarization or pruning yet — very long threads will eventually push the model context limit. Prompt caching mitigates cost. Add summarization later if any single opportunity grows past ~100K tokens of history.
- No conversation search or "jump to date" — would be useful for long threads. Future polish.

---

## V0.6.2 — 2026-05-20 · Attachments in agent chat + PDF/DOCX extraction

**Summary**
The agent composer now accepts file attachments — drag/drop into the chat or click the 📎 button. Attached files are uploaded to the Context Library (with auto-detected kind, tag "from chat") and the agent reads them in its reply. Also added PDF and DOCX text extraction so the agent can actually understand those uploads (previously only plain-text uploads got extracted).

**Changes**
- Installed `unpdf` (for PDF) and `mammoth` (for DOCX); both extract server-side during upload
- `src/lib/attachments.ts` — new `extractText()` helper dispatches by MIME type (text-based / PDF / DOCX) with graceful fallback to `NULL` on parse failure
- `src/components/AgentTab.tsx` — composer now has 📎 button + drag/drop overlay; pending files show as removable chips; user message bubbles show attached file names with a green dot indicating "text extracted, agent can read this"
- Auto-prompt: if user sends files with no typed message, generates "I've attached: …. Please review and tell me what's useful, then suggest next steps." so the agent has something to react to
- Chat-attached files default to `tag: "from chat"` for easy filtering later

**Files affected**
- `src/lib/attachments.ts`, `src/components/AgentTab.tsx`
- `package.json`, `package-lock.json`
- `DATA_DICTIONARY.md`, `VERSION_HISTORY.md`

**Known issues / pending**
- Image vision not yet implemented — images upload as attachments but the agent only sees metadata, not pixels. Could send images as Anthropic vision blocks in a later version.
- Excel (.xlsx) and PowerPoint (.pptx) still have no text extraction.
- PDF extraction relies on `unpdf` (uses Mozilla pdfjs). For scanned-image PDFs with no text layer, extraction will be empty. Needs OCR (Tesseract / cloud OCR) for those — future work.

---

## V0.6.1 — 2026-05-20 · Persist agent chat per opportunity

**Summary**
Fixed the V0.6 issue where switching tabs (or refreshing) lost the agent conversation. Chat history now persists in `localStorage` keyed by opportunity ID — each opportunity has its own thread that survives tab switches, panel close/reopen, and page refresh.

**Changes**
- `src/components/AgentTab.tsx` — hydrates messages from `localStorage` on mount; saves on every change; re-loads when `opportunityId` changes
- Added **"+ New chat"** button (shown when a conversation exists) to clear and start fresh
- Storage key: `aspen-agent-chat:{opportunityId}` — easy to inspect or clear via browser devtools

**Files affected**
- `src/components/AgentTab.tsx`
- `VERSION_HISTORY.md`

**Known issues / pending**
- Persistence is browser-local — opening the CRM on another device won't show the prior thread. DB persistence (a `messages` table) deferred until usage signals it matters.
- Conversations persist forever (no TTL). The localStorage cap (~5MB per origin) is plenty for many opportunities × many turns, but worth a future "prune old" pass.

---

## V0.6 — 2026-05-20 · Aspen Agent (conversational, context-aware)

**Summary**
Shipped the Aspen Agent — an opportunity-scoped conversational AI embedded in each detail panel. It has read access to every field on the opportunity plus all uploaded context (transcripts, emails, JDs, etc.) and can answer questions, summarize meetings, suggest next steps, draft follow-up emails or proposals, and flag risks. Replaces the originally-planned "Sales Pitch" tab — the agent handles pitches as one of its quick actions.

**Changes**
- New `src/lib/agent.ts` — Anthropic client + opportunity context builder. System prompt carries the Aspen Hills business context (cached via `cache_control: ephemeral`); a second cached block carries the opportunity-specific context (fields + extracted text from all attachments). User messages are uncached.
- New route `POST /api/opportunities/[id]/agent` — accepts a `messages` array, returns `{ reply, usage }` with token + cache metrics
- New `src/components/AgentTab.tsx` — chat-style UI with 6 quick-action buttons (summarize meeting, ask questions, suggest next steps, draft follow-up, draft proposal, flag risks). Enter to send, Shift+Enter for newline.
- `src/components/DetailPanel.tsx` — tabs reordered to **Overview / Agent / Pricing & Equity / Files**. "Sales Pitch" tab removed (agent handles it).
- `scripts/test-agent.ts` — Anthropic smoke test
- Anthropic API key wired into `.env.local`

**Files affected**
- `src/lib/agent.ts` (new)
- `src/app/api/opportunities/[id]/agent/route.ts` (new)
- `src/components/AgentTab.tsx` (new)
- `src/components/DetailPanel.tsx` (updated tabs)
- `scripts/test-agent.ts` (new)
- `.env.local` (untracked — Anthropic key added)
- `APP_REQUIREMENTS.md` (Files tab + Agent tab marked complete; sequencing updated)
- `TECHNICAL_SPECIFICATIONS.md` (new route, three new architectural decisions logged)
- `VERSION_HISTORY.md` (this entry)

**Known issues / pending**
- Chat history is in-browser only — closing the detail panel loses the conversation. Persistence is a later decision (V0.6.x).
- The agent's suggested field updates (pain points, scope, notes, stage) are surfaced as text in chat; user must manually copy/edit them into the Edit form. Structured "apply to record" is V0.6.1.
- PDF/DOCX uploads still have no extracted_text — the agent will note this and ask the user to paste the relevant text inline if it matters.
- Cost: each message sends full context. With prompt caching, follow-ups are ~10x cheaper than the first turn — but the first turn on a new opportunity can run a few cents if there's heavy transcript context.

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
