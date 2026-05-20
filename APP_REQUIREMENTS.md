# App Requirements — Aspen Hills CRM

> Living document. Update as requirements evolve. The canonical product spec lives in [`docs/aspen_hills_crm_spec.md`](docs/aspen_hills_crm_spec.md) — this file summarizes and tracks the build state against it.

**Last updated:** 2026-05-20 · **Version:** V0.6

---

## 1. Purpose

Internal CRM for **Aspen Hills Advisors LLC** to track inbound and outbound sales opportunities — brands that may become retainer clients. Each opportunity moves through a defined pipeline; AI generates pitches, pricing estimates, and equity-ask recommendations.

**Users (v1):** Cale only (single-tenant). v2 will add Cade Bradshaw + Keenan Stallings.

---

## 2. User workflows

### W1 — Log a new opportunity
1. Click "+ New Opportunity" in header
2. Fill the intake form. Required: company name. Optional: contact name, email, phone, website, industry, fit, retainer estimate, stage.
3. **Pain points, scope notes, and additional notes are typically left blank at intake** — they'll be populated by the Aspen Agent from meeting transcripts (see W7). Manual entry is still supported.
4. Save → returns to tracker with the new opportunity selected

### W2 — Triage the pipeline
1. Open the tracker (default view)
2. Filter by stage and/or fit
3. Click a row to open the detail panel

### W3 — Update an opportunity
1. Open detail panel
2. Change stage inline (no edit form needed) **OR** click "Edit" → opens intake form pre-filled
3. Save → detail panel reflects updates

### W4 — Generate AI sales pitch
1. Open detail panel → "Sales Pitch" tab
2. Click "Generate" → AI returns a 150–200 word pitch
3. Copy to clipboard

### W5 — Generate AI pricing & equity recommendation
1. Open detail panel → "Pricing & Equity" tab
2. Click "Run Estimate" → AI returns retainer estimate, savings vs FT, equity verdict + terms
3. Retainer estimate auto-populates the opportunity's `retainerEst` field (overrideable)

### W6 — Attach files
1. Open detail panel → "Files" tab
2. Drag & drop or click to browse
3. View files in modal (PDF in iframe, images inline)

### W7 — Capture meeting context (Aspen Agent, V0.6)
The core "lazy intake" workflow: most opportunity fields get populated **automatically from meetings**, not typed in by hand.

1. After a client meeting, upload the Fathom transcript (or pasted notes) into the opportunity's **Files** tab, tagged as `transcript`
2. Click "Summarize meeting" (or the agent runs automatically on transcript upload)
3. The agent extracts:
   - **Current pain points** → fills/updates the `currentPain` field
   - **Scope discussion** → fills/updates `scopeNotes`
   - **Decision-maker / org context / referral source** → appends to `notes`
   - **Stage signals** → may suggest a stage transition (user confirms)
   - **Action items** → posted as a structured to-do block on the detail panel
   - **Suggested next steps** → surfaced as recommendations
4. User reviews the suggested updates → accept / reject / edit before they land

This is what makes pain/scope/notes "live" fields that grow with each conversation, rather than something Cale has to remember to type.

---

## 3. Functional requirements

### v1 (in scope)
- [x] Tracker view: list opportunities with stage pill, fit dot, retainer estimate
- [x] Pipeline stage filter bar (with per-stage counts)
- [ ] Fit filter (Strong / Good / Weak / All)
- [x] Detail panel: tabbed (Overview / Agent / Pricing & Equity / Files)
  - [x] Overview tab rendered
  - [x] Agent tab (Aspen Agent: chat with full opportunity + context awareness; W4/W5 pitch + W7 meeting capture handled conversationally)
  - [ ] Pricing & Equity tab (one-click AI pricing/equity estimator with structured render)
  - [x] Files tab (Context Library: typed uploads with kind/tag/note, view, delete)
- [x] Inline stage selector on detail panel
- [x] Intake form (new + edit + delete)
- [ ] AI pitch generation (server-side `/api/opportunities/:id/pitch`)
- [ ] AI pricing/equity generation (server-side `/api/opportunities/:id/pricing`)
- [ ] File attachments via Supabase Storage (max 10MB, PDF/PNG/JPG/JPEG/WEBP/DOCX/XLSX)
- [ ] Seed initial opportunities (Be LOVE™, Husk) on first run
- [ ] Auto-update `retainerEst` from pricing result

### Out of scope for v1
See spec §11 (Future Features) — email ingestion, activity log, follow-up reminders, proposal generator, revenue dashboard, multi-user/auth, brokerage commission tracking, contact enrichment.

---

## 3b. Email Ingestion (planned, V0.7 → V0.8)

Forward any client email to the CRM and have the Aspen Agent file it under the right opportunity automatically — turning the agent into a passive observer of your sales pipeline that builds context as you work.

### Workflow
1. User forwards (or pastes) an email from any client conversation
2. Agent classifies which opportunity it belongs to — matches against company names, contact emails, and content cues
3. If a match: stores the email as an attachment (kind: `email`) under that opportunity, runs a summary pass to extract action items + suggested next steps, and surfaces them on the opportunity's detail panel
4. If no match: agent proposes a new opportunity (pre-populated with contact + company info from the email headers) → user reviews and confirms
5. If ambiguous: queued for user review in a small "Needs filing" inbox

### Phased delivery
- ✅ **V0.7 — Paste path** (shipped 2026-05-20)
  - "Paste email" button in the tracker header
  - Modal: paste raw email content (headers + body, or just body)
  - Agent picks best-match opportunity (or proposes new)
  - **High confidence → auto-files** (raw email saved as `.eml` attachment, summary + next steps posted as assistant message in the opportunity's chat)
  - Medium/low confidence → user picks from candidates or creates new opportunity
  - **No email infrastructure required** — validates the classification + summarization quality before V0.8 forwarding work
- **V0.8 — Forwarding path** (planned)
  - Provision an inbound address (e.g. `crm@aspenhills.com` via Postmark Inbound, Resend Inbound, or Cloudflare Email Workers)
  - Set MX records on the subdomain
  - Webhook endpoint: `POST /api/inbound/email`
  - Sender verification: only forwards from Cale's address (or a secret-tagged address) get processed
  - Re-uses the V0.7 classification + summarization logic — just triggered by webhook instead of paste

### Open questions
- Should the agent **auto-file** with high-confidence matches, or always queue for one-click confirmation? (Lean: auto-file at high confidence, queue otherwise.)
- Reply detection: should the agent draft a suggested reply when the email contains a question?
- Should we extract structured fields from emails (e.g., quoted budget, timeline mentions, blocker confessions) and update the opportunity's fields automatically? (Tied to the broader V0.6.1 "apply to record" capability.)

---

## 3c. Dashboard (planned, V0.7)

A summary surface separate from the tracker. The tracker is the **working** view; the dashboard is the **understanding** view — answers "where do things stand" and "what should I do today."

### Pipeline (forward-looking)
- **KPI strip:** Active opportunities · Pipeline value (sum of retainer estimates, weighted by stage probability) · Avg time in stage · Next actions queued
- **Pipeline funnel:** count of opportunities per stage; click to filter the tracker
- **Next actions queue:** top 5 things to do today, generated by the agent across all opportunities — ordered by urgency, with one-click open
- **Stale opportunities:** flagged if no update in N days (N configurable; default 14)

### Summary (retrospective)
- **People talked to:** table of contacts — name · company · role · last touched · stage · win/loss
- **Companies by industry:** distribution chart (Functional Beverage, Supplements, etc.)
- **Engagement type breakdown:** light vs moderate vs heavy scope (from pricing JSON when available)
- **Role analysis:** what roles were the contacts (founder, ops, marketing) — useful for understanding who actually buys Aspen Hills
- **Win/loss over time:** Closed Won vs Closed Lost trend, with reasons extracted from notes/agent context
- **Conversion rate:** pitched → closed won %

### Where it lives
- New route `/dashboard` accessed from the header
- Tracker stays as the default working surface
- Reuses existing data — no new tables needed except potentially a `daily_metrics_snapshot` table later if we want historical trends

---

## 3a. Context Library + AI Agent (planned, post-v1)

A larger feature direction the CRM is evolving toward: each opportunity becomes a **context-rich record** that an embedded AI agent can reason over to help drive the deal forward.

### Context uploads (expands the v1 Files tab)
Each opportunity supports uploading and tagging unstructured context:
- **Fathom meeting recordings / transcripts** (or copy-pasted transcript text)
- **Email threads** (paste content or .eml upload)
- **Job descriptions** they shared
- **Pitch decks / one-pagers** they sent
- **LinkedIn profiles / company background docs**
- **Any other relevant artifact** (proposals from competitors, RFPs, etc.)

Each artifact is stored with: file, type (transcript / email / JD / deck / other), upload date, optional tag (e.g. "intro call · 2026-05-10"), and a short user-written note about what it is.

### Opportunity-scoped AI agent
A conversational agent on the detail panel — call it the "Aspen Agent" for now — that has read access to:
1. All structured opportunity fields (pain, scope, notes, fit, stage, etc.)
2. All uploaded context artifacts (transcripts, emails, JDs, decks)
3. AI-generated outputs already on the record (pitch, pricing, equity)
4. The Aspen Hills business context already baked into the system prompts

The agent helps with:
- **"What are the next steps with this opportunity?"** — pulls from latest meeting notes + stage
- **"What questions should I ask in the next call?"** — finds gaps in our knowledge of their ops, decision criteria, timeline
- **"Draft a proposal for this engagement"** — pulls scope, pricing estimate, equity terms, and writes a structured SOW
- **"Summarize this meeting for the file"** — when a transcript is uploaded, generate a concise summary + extracted action items
- **"What's the right contract structure here?"** — based on equity verdict + scope + stage
- **"Flag risks I should be aware of"** — pull from transcripts + notes
- **General Q&A** about the opportunity ("What did Taylor say about the HEB launch timing?")

### Decision-support features
Beyond pure Q&A, surface proactive recommendations on the detail panel:
- **Suggested next action** ("Send pricing follow-up — last contact 8 days ago")
- **Stage progression flags** ("Looks ready to move from Pitching → Proposal Sent based on the last transcript")
- **Risk indicators** ("Multiple mentions of budget concerns — consider discount framing")
- **Information gaps** ("We haven't asked about their current 3PL — important before pricing")

### Implications (will update TECH_SPECIFICATIONS.md when this gets built)
- Document parsing: PDF/DOCX/TXT/EML extraction → plain text
- Audio transcription: if uploading raw Fathom video/audio (vs already-transcribed text), need Whisper or similar
- Retrieval: probably vector embeddings + similarity search (Supabase has `pgvector`); alternatively just stuff everything into a long context window since Sonnet 4.6 supports 200K tokens — start simple, add RAG only if needed
- Storage: existing `attachments` bucket extends naturally; add a `context_artifacts` table with `kind`, `extracted_text`, `tag`, `note`
- Agent UX: chat-style panel inside the detail view, OR a "ask the agent" button per workflow

### Priority sequencing
This is a **phase-2 effort**, not a v1 blocker. Likely sequencing once v1 ships:
1. ✅ **V0.5** — extend the Files tab into a typed Context Library (kind tagging, basic text extraction on upload for text-based MIME types)
2. ✅ **V0.6** — opportunity-scoped chat agent (Aspen Agent) with full-context-stuffing + prompt caching. Conversational Q&A, summaries, drafts, suggestions. No structured "apply to record" yet.
3. V0.6.1: structured "apply to record" — agent proposes JSON changes (pain, scope, notes, stage), user accepts/rejects
4. V0.7: proactive recommendations rendered on the detail panel (next action, risks, info gaps)
5. V0.8: extend text extraction to PDF + DOCX (pdf-parse + mammoth) for richer context
6. V1.x: pgvector-backed retrieval if context size demands it

---

## 4. Non-functional requirements

- **Performance:** tracker renders <200ms with <500 opportunities (well within Postgres + Next.js capabilities)
- **Security:** Anthropic + Supabase service-role keys never sent to browser
- **Accessibility:** keyboard navigation for tracker + intake form; visible focus states
- **Mobile:** v1 desktop-first; mobile responsive is a nice-to-have, not blocking

---

## 5. Acceptance criteria (per workflow)

| Workflow | Done when |
|---|---|
| W1 | New opportunity appears in the tracker immediately after save, with a generated UUID |
| W2 | Stage filter narrows the list and shows correct count per stage |
| W3 | Stage change in detail view persists to DB and reflects in the list |
| W4 | Pitch text generated, displayed, and "Copy" puts it on the clipboard |
| W5 | Pricing JSON parsed, equity verdict rendered conditionally per business rules |
| W6 | Uploaded file is retrievable + viewable in modal |

---

## 6. Open product questions

- Should "Closed Lost" opportunities be hidden by default in the tracker?
- Do we need an "Archive" status separate from "Closed Lost"?
- How is `retainerEst` resolved when AI estimate disagrees with manually-entered value? (Current spec: AI overrides on generation, user can edit after.)
