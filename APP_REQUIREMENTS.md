# App Requirements — Aspen Hills CRM

> Living document. Update as requirements evolve. The canonical product spec lives in [`docs/aspen_hills_crm_spec.md`](docs/aspen_hills_crm_spec.md) — this file summarizes and tracks the build state against it.

**Last updated:** 2026-05-15 · **Version:** V0.1

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
- [ ] Inline stage selector on detail panel
- [ ] Intake form (new + edit)
- [ ] AI pitch generation (server-side `/api/opportunities/:id/pitch`)
- [ ] AI pricing/equity generation (server-side `/api/opportunities/:id/pricing`)
- [ ] File attachments via Supabase Storage (max 10MB, PDF/PNG/JPG/JPEG/WEBP/DOCX/XLSX)
- [ ] Seed initial opportunities (Be LOVE™, Husk) on first run
- [ ] Auto-update `retainerEst` from pricing result

### Out of scope for v1
See spec §11 (Future Features) — email ingestion, activity log, follow-up reminders, proposal generator, revenue dashboard, multi-user/auth, brokerage commission tracking, contact enrichment.

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
