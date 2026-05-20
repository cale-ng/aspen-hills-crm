# App Requirements — Aspen Hills CRM

> Living document. Update as requirements evolve. The canonical product spec lives in [`docs/aspen_hills_crm_spec.md`](docs/aspen_hills_crm_spec.md) — this file summarizes and tracks the build state against it.

**Last updated:** 2026-05-19 · **Version:** V0.3

---

## 1. Purpose

Internal CRM for **Aspen Hills Advisors LLC** to track inbound and outbound sales opportunities — brands that may become retainer clients. Each opportunity moves through a defined pipeline; AI generates pitches, pricing estimates, and equity-ask recommendations.

**Users (v1):** Cale only (single-tenant). v2 will add Cade Bradshaw + Keenan Stallings.

---

## 2. User workflows

### W1 — Log a new opportunity
1. Click "+ New Opportunity" in header
2. Fill the intake form (company, contact, industry, pain points, scope, fit, retainer estimate, stage)
3. Save → returns to tracker with the new opportunity selected

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

---

## 3. Functional requirements

### v1 (in scope)
- [x] Tracker view: list opportunities with stage pill, fit dot, retainer estimate
- [x] Pipeline stage filter bar (with per-stage counts)
- [ ] Fit filter (Strong / Good / Weak / All)
- [x] Detail panel: tabbed (Overview / Pricing & Equity / Sales Pitch / Files)
  - [x] Overview tab rendered
  - [ ] Pricing & Equity tab
  - [ ] Sales Pitch tab
  - [ ] Files tab
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
1. V0.x: extend the Files tab into a typed Context Library (kind tagging, text extraction on upload)
2. V0.x+1: opportunity-scoped chat agent with simple full-context-stuffing (no embeddings yet)
3. V0.x+2: proactive recommendations rendered on the detail panel
4. V0.x+3: proposal/contract draft generators
5. V1.x: pgvector-backed retrieval if context size demands it

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
