# Aspen Hills Advisors — CRM Build Spec
> Claude Code handoff document. This spec defines the full data model, business logic, AI prompts, and UI behavior for a production CRM tool built for Aspen Hills Advisors LLC.

---

## 1. Business Context

**Aspen Hills Advisors LLC** is a fractional supply chain operations and product development firm serving CPG brands in sports nutrition, health/wellness supplements, beverages, and functional foods. Typical client revenue range: $3M–$15M.

The CRM tracks inbound and outbound **sales opportunities** — brands that may become retainer clients. Each opportunity needs to be logged, qualified, pitched, priced, and closed. The tool also generates AI-powered sales pitches, pricing estimates, and equity ask recommendations for each opportunity.

**Team:** Cale (owner), Cade Bradshaw (full-time), Keenan Stallings (fractional). Single-tenant for now — no multi-user auth required in v1.

---

## 2. Core Data Model

### Opportunity

```ts
interface Opportunity {
  id: string                    // UUID
  
  // Identity
  company: string               // Brand name — required
  contact: string               // Name, role, email
  website: string
  industry: string              // e.g. "Sports Nutrition", "Functional Beverage"
  revenue: string               // Free text, e.g. "$5M–$8M" or "Pre-launch"

  // Qualification
  currentPain: string           // Why they reached out / what's broken
  scopeNotes: string            // What they're asking for
  notes: string                 // Referral source, context, network notes
  fit: "high" | "medium" | "low"
  retainerEst: string           // Estimated monthly retainer in dollars

  // Pipeline
  stage: PipelineStage

  // AI-generated outputs (nullable until generated)
  pitch: string | null
  pricing: PricingEstimate | null

  // Files
  attachments: Attachment[]

  // Timestamps
  createdAt: string             // ISO date
  updatedAt: string             // ISO date
}
```

### Pipeline Stages

```ts
type PipelineStage =
  | "Qualifying"
  | "Pitching"
  | "Proposal Sent"
  | "Negotiating"
  | "Closed Won"
  | "Closed Lost"
```

Stage color mapping (use consistently across UI):
| Stage | Color | Background tint |
|---|---|---|
| Qualifying | `#94a3b8` | `rgba(148,163,184,0.12)` |
| Pitching | `#f59e0b` | `rgba(245,158,11,0.12)` |
| Proposal Sent | `#3b82f6` | `rgba(59,130,246,0.12)` |
| Negotiating | `#8b5cf6` | `rgba(139,92,246,0.12)` |
| Closed Won | `#10b981` | `rgba(16,185,129,0.12)` |
| Closed Lost | `#ef4444` | `rgba(239,68,68,0.12)` |

### Fit Assessment

```ts
type FitLevel = "high" | "medium" | "low"
// Labels: "Strong Fit" | "Good Fit" | "Weak Fit"
// Colors: #10b981 | #f59e0b | #ef4444
```

### Attachment

```ts
interface Attachment {
  name: string
  type: string          // MIME type
  size: string          // Human-readable, e.g. "2.4 MB"
  data: string | null   // base64 data URL (null for reference-only entries)
  isReference: boolean  // true = metadata only, no actual file stored
}
```

### PricingEstimate

```ts
interface PricingEstimate {
  buildPhaseMonthly: number       // Monthly retainer during build phase
  steadyStateMonthly: number      // Monthly retainer at steady state
  buildPhaseDuration: number      // Months (typically 2–3)
  hoursPerMonth: {
    build: number
    steady: number
  }
  scopeComplexity: "light" | "moderate" | "heavy"
  rationale: string               // 2–3 sentence plain-text explanation
  annualValue: number             // Total estimated year 1 revenue
  ftComparison: number            // Cost of equivalent FT headcount
  savingsVsFT: number             // ftComparison - annualValue

  equityTrigger: EquityTrigger
  equityRecommendation: EquityRecommendation
  warnings: string[]
}

interface EquityTrigger {
  verdict: "ask" | "consider" | "skip"
  confidence: "high" | "medium" | "low"
  score: number
  strongYesSignals: string[]
  strongNoSignals: string[]
  summary: string
  askTiming: string
  alternativeIfSkip: string
}

interface EquityRecommendation {
  percentageLow: number
  percentageHigh: number
  vestingYears: number
  cliffMonths: number
  structure: string
  rationale: string
}
```

---

## 3. AI Prompts

These are the exact system prompts used to generate AI outputs. Pass opportunity fields as user message context. Call the Anthropic API (`claude-sonnet-4-20250514`, `max_tokens: 1000`).

### 3a. Sales Pitch Generator

**System prompt:**
```
You are a strategic sales advisor for Aspen Hills Advisors LLC.
Aspen Hills is a fractional supply chain operations and product development firm serving brands in sports nutrition, health/wellness supplements, beverages, and functional foods — typically $3M–$15M in annual revenue.
The core offering is a plug-in fractional Director of Operations team. Founder has ~13 years of experience across NutriBolt, VShred/SculpNation, and YourSuper.
Key differentiators: deep category expertise, embedded team model, fast operational stand-up, strong manufacturer/3PL relationships, AI tooling layered into planning and visibility.
Cost value prop: FT Supply Chain Manager = $120–150K. Coordinator needed within 6–12 months = $55–70K more. Aspen Hills delivers both from day one at a fraction of that cost, scaling with the brand.
Write a concise, high-impact outbound sales pitch. Open with a sharp insight on their pain/stage. Reference Aspen Hills experience specifically. Weave in cost/team value prop naturally. Clear low-friction CTA. Tone: confident, peer-level operator. 150–200 words max. Plain paragraphs only. Respond with ONLY the pitch text.
```

**User message template:**
```
Generate a sales pitch:
Company: {company}
Industry: {industry}
Revenue/Stage: {revenue}
Pain Points: {currentPain}
Scope: {scopeNotes}
Context: {notes}
```

**Response:** Plain text pitch string. No parsing needed.

---

### 3b. Pricing & Equity Estimator

**System prompt:**
```
You are a pricing and equity strategist for Aspen Hills Advisors LLC.
Aspen Hills is a fractional supply chain operations and product development firm.

PRICING INPUTS:
- Scope complexity (functions: MRP, S&OP, procurement, inventory, vendor mgmt, product dev, 3PL, SKU mgmt, etc.)
- Brand revenue stage ($1-3M, $3-8M, $8-15M, $15M+)
- SKU count and product line complexity
- Retail vs DTC distribution complexity
- Build phase (months 1-3 heavier) vs steady state
- Hours estimated (light: 15-20h/mo, moderate: 20-30h/mo, heavy: 30-45h/mo)
- Aspen Hills blended rate: $175-275/hr depending on complexity and seniority mix
- FT market anchor: Supply Chain Director = $120-150K/yr; Coordinator = $55-70K/yr

EQUITY TRIGGER EVALUATION — score each signal and return a verdict:

STRONG YES signals (push toward asking):
- Founder has prior exit history or VC/CPG pedigree
- Brand has raised institutional capital or has clear exit trajectory
- Engagement is build-phase or embedded (not tactical/transactional)
- Expected engagement duration 6+ months
- Brand is pre-Series A or early growth (equity still cheap and meaningful)
- Aspen Hills is standing up core systems from scratch (foundational value)
- Role is strategic (Director-level scope, S&OP ownership, cross-functional)

STRONG NO signals (do not ask):
- Lifestyle brand with no stated exit intent, single owner-operator
- Project-based or short-term scope (<4 months)
- Brand is post-Series B or private equity owned (equity expensive/complicated)
- Distressed or turnaround situation
- Purely transactional scope (e.g. 3PL sourcing only, one product launch)
- Founder has expressed cash constraints — retainer discount more strategic than equity
- No signal of institutional involvement or growth ambition

EQUITY STRUCTURE (when asking):
- Light advisory: 0.1-0.25%, 2yr vest, 6mo cliff
- Embedded fractional ops: 0.25-0.5%, 2-3yr vest, 6mo cliff
- Founding/build-phase ops: 0.5-1.0%, 3yr vest, 6mo cliff
- Preferred structures: advisor shares, SAFEs, or option grants
- Framing: always position as alignment, not discount

Respond ONLY with a valid JSON object, no markdown, no extra text:
{
  "buildPhaseMonthly": number,
  "steadyStateMonthly": number,
  "buildPhaseDuration": number,
  "hoursPerMonth": { "build": number, "steady": number },
  "scopeComplexity": "light|moderate|heavy",
  "rationale": "string",
  "annualValue": number,
  "ftComparison": number,
  "savingsVsFT": number,
  "equityTrigger": {
    "verdict": "ask|skip|consider",
    "confidence": "high|medium|low",
    "score": number,
    "strongYesSignals": [],
    "strongNoSignals": [],
    "summary": "string",
    "askTiming": "string",
    "alternativeIfSkip": "string"
  },
  "equityRecommendation": {
    "percentageLow": number,
    "percentageHigh": number,
    "vestingYears": number,
    "cliffMonths": number,
    "structure": "string",
    "rationale": "string"
  },
  "warnings": []
}
```

**User message template:**
```
Estimate pricing for this engagement:
Company: {company}
Industry: {industry}
Est. Revenue / Stage: {revenue}
Current Pain Points: {currentPain}
Scope: {scopeNotes}
Context: {notes}
```

**Response:** JSON. Strip any markdown fences before `JSON.parse()`.

---

## 4. UI Structure

### Views
```
tracker       → pipeline list + filter bar (default view)
detail        → selected opportunity with tabbed detail panel (split with list)
intake        → new / edit opportunity form (full width)
```

### Tracker View
- Pipeline stage filter bar at top (click to toggle filter; shows count per stage)
- Fit filter (All / Strong / Good / Weak)
- Each row shows: company name, industry, attachment count, fit dot, stage pill, retainer estimate
- Click row → opens detail panel alongside list (list narrows to fixed width ~360px)
- `+ New Opportunity` button always visible in header

### Detail Panel — Tabs
```
Overview        → key info grid, pain points, scope notes, notes
Pricing & Equity → retainer estimate cards, savings bar, equity trigger verdict, equity terms
Sales Pitch     → AI pitch generator + copy to clipboard
Files           → attachment list + drag/drop upload zone
```

#### Overview Tab
- 2-col info grid: Contact, Fit, Est. Retainer, Date Added
- Pain Points block
- Scope Notes block
- Notes block
- Stage selector (inline button group — click to update stage without going to edit)

#### Pricing & Equity Tab
- "Run Estimate" button triggers AI pricing call
- **Retainer cards** (3-col grid):
  - Build Phase Monthly (with hours/mo)
  - Steady State Monthly (with hours/mo)
  - Est. Year 1 Value (with FT comparison)
- **Savings bar**: visual progress bar showing `savingsVsFT / ftComparison`
- **Scope complexity badge** + rationale text block
- **Equity Trigger card** (the core decision widget):
  - Verdict badge: `ask` (green ◆) / `consider` (amber ◈) / `skip` (gray ◇)
  - Confidence level
  - Summary paragraph
  - Two-column signal breakdown: For Equity (green) vs Against Equity (red)
  - When to raise it (if ask/consider)
  - Better alternative (if skip or consider fallback)
- **Equity Terms card** (only renders if verdict is `ask` or `consider`):
  - Equity range %, vesting years, cliff months
  - Structure description
  - How to frame the ask
- **Warnings** block (amber) for any pricing flags

#### Sales Pitch Tab
- Generate / Regenerate button
- Generated pitch rendered in styled text block
- Copy to clipboard button

#### Files Tab
- List of attached files with icon, name, size, view/remove actions
- View opens modal: PDF renders in iframe, images render inline
- Drag-and-drop zone + click-to-browse
- Max 10MB per file; supported: PDF, images, Word docs

### Intake Form (New / Edit)
Fields:
- Company Name* (required)
- Primary Contact (name / role / email)
- Website
- Industry / Category
- Est. Annual Revenue
- Current Pain Points (textarea)
- Scope Notes (textarea)
- Additional Notes (textarea)
- Pipeline Stage (select)
- Fit Assessment (select: Strong / Good / Weak)
- Est. Monthly Retainer ($)
- Attachments (drag/drop or browse, multiple files)

---

## 5. Seed Data

Log this opportunity on first load if no data exists:

```json
{
  "id": "belove-001",
  "company": "Be LOVE™",
  "contact": "Taylor · taylor@drink.love",
  "website": "drink.love",
  "industry": "Functional Beverage / Electrolytes",
  "revenue": "Early growth — Target, HEB, Life Time distribution",
  "currentPain": "Hiring full-time Supply Chain Manager (~$120-150K) to own end-to-end supply chain: MRP, S&OP, procurement, inventory strategy, vendor management, SKU rationalization, production planning. 8+ SKUs across two product lines. Retail footprint at Target/HEB creating real ops pressure.",
  "scopeNotes": "Full fractional ops team from Aspen Hills covers SCM + coordinator layer from day one at fraction of FT cost. AI tooling explicitly called out in JD — strong model alignment.",
  "stage": "Pitching",
  "fit": "high",
  "retainerEst": "7500",
  "notes": "Founded by Kurt Seidensticker (Vital Proteins founder, Ghost Energy/Koia investor) and Leslie Scofield (Toms, Aviator Nation, Summit Series). Austin-based. Progressive Grocer Best New Product 2025. Contact: taylor@drink.love",
  "attachments": [
    { "name": "Be_LOVE_Supply_Chain_Manager.pdf", "type": "application/pdf", "size": "Job description", "data": null, "isReference": true }
  ]
}
```

Also log this second opportunity:

```json
{
  "id": "husk-001",
  "company": "Husk",
  "contact": "Sarah Goldschmid · Co-Founder · sarah@drinkhusk.com",
  "website": "drinkhusk.com",
  "industry": "Functional Food / Fiber Supplements",
  "revenue": "Pre-launch",
  "currentPain": "Launching clean label fiber powder drink mix. Need co-packer identification for pilot run plus fractional operational support. Found Aspen Hills via Startup CPG Slack channel.",
  "scopeNotes": "Dual scope: (1) co-packer sourcing for pilot launch, (2) ongoing fractional ops support post-launch. Pre-launch = build from scratch opportunity.",
  "stage": "Qualifying",
  "fit": "high",
  "notes": "Inbound via Aspen Hills website contact form. Co-founder outreach = direct decision-maker access. Pre-launch stage is prime equity ask territory.",
  "attachments": []
}
```

---

## 6. Storage

**v1 recommendation:** SQLite via better-sqlite3 for local persistence. Schema mirrors the Opportunity interface above.

**Tables:**
```sql
CREATE TABLE opportunities (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  contact TEXT,
  website TEXT,
  industry TEXT,
  revenue TEXT,
  current_pain TEXT,
  scope_notes TEXT,
  notes TEXT,
  fit TEXT DEFAULT 'medium',
  retainer_est TEXT,
  stage TEXT DEFAULT 'Qualifying',
  pitch TEXT,
  pricing_json TEXT,       -- JSON blob of PricingEstimate
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  name TEXT,
  type TEXT,
  size TEXT,
  data TEXT,               -- base64 or file path
  is_reference INTEGER DEFAULT 0,
  created_at TEXT
);
```

**Alt v1:** JSON flat file (`opportunities.json`) if SQLite feels heavy for a single-user local tool. Either works.

---

## 7. Tech Stack Recommendation

If building with Claude Code as a local web app:

```
Backend:   Node.js + Express (or Fastify)
Database:  SQLite (better-sqlite3) or JSON flat file
Frontend:  React + Vite
Styling:   Tailwind CSS
AI calls:  Anthropic SDK (@anthropic-ai/sdk)
File storage: Local filesystem with base64 fallback
```

If building as a hosted web app:
```
Backend:   Next.js (API routes handle Anthropic calls server-side — keeps API key safe)
Database:  PlanetScale (MySQL) or Supabase (Postgres)
Frontend:  React (Next.js pages)
Styling:   Tailwind CSS
```

**Important:** Anthropic API calls must be made server-side to keep the API key out of the browser. In the current Claude artifact version, calls go client-side because the key is injected by the Claude platform — in a real build, route all AI calls through a backend endpoint.

---

## 8. API Endpoint Shape (if building with Express backend)

```
GET    /api/opportunities              → list all, supports ?stage=&fit= filters
POST   /api/opportunities              → create new
GET    /api/opportunities/:id          → get single
PATCH  /api/opportunities/:id          → update fields
DELETE /api/opportunities/:id          → delete

POST   /api/opportunities/:id/pitch    → trigger AI pitch generation, save + return
POST   /api/opportunities/:id/pricing  → trigger AI pricing estimate, save + return

GET    /api/opportunities/:id/attachments        → list attachments
POST   /api/opportunities/:id/attachments        → upload file (multipart)
DELETE /api/opportunities/:id/attachments/:attId → remove attachment
```

---

## 9. Business Rules & Logic

### Retainer estimate auto-update
When a pricing estimate is generated, `retainerEst` on the opportunity should be updated to `steadyStateMonthly` from the pricing result (can be overridden manually).

### Equity terms visibility
Only render equity percentage, vesting, cliff, and framing language when `equityTrigger.verdict` is `"ask"` or `"consider"`. If verdict is `"skip"`, show only the alternative recommendation.

### Fit dot color
- `high` → `#10b981` (green)
- `medium` → `#f59e0b` (amber)
- `low` → `#ef4444` (red)

### Stage update
Stage can be updated directly from the detail view without opening the edit form. PATCH `/api/opportunities/:id` with `{ stage }`.

### Pipeline count
Header pipeline bar shows count of opportunities per stage. Clicking a stage filters the list. Click again to clear filter.

### Attachment file size limit
Max 10MB per file. Accepted types: PDF, PNG, JPG, JPEG, WEBP, DOCX, XLSX.

---

## 10. Design Language

The existing artifact uses a dark-mode aesthetic with a CPG/premium brand feel. Key tokens:

```css
--bg-base: #0c0f0a
--bg-surface: #0e1209
--bg-elevated: #111408
--border-subtle: #1a1e12
--border-default: #1e2518
--border-active: #2a3020
--text-primary: #e8e4d9
--text-secondary: #c8d4b0
--text-muted: #5a6a45
--text-dim: #3a4a2a
--accent-primary: #c8e06b    /* Aspen Hills green */
--accent-hover: #daf07a
--font-mono: 'DM Mono', 'Courier New', monospace
--font-display: 'Playfair Display', serif  /* headers only */
```

This design language is a reference point — Claude Code can adapt to a different stack or component library while preserving the information hierarchy and feature set.

---

## 11. Future Features (not in v1)

- **Email integration** — parse inbound form submissions (Squarespace, Typeform) directly into opportunities
- **Activity log** — timestamped notes per opportunity (call summary, email sent, follow-up scheduled)
- **Follow-up reminders** — flag stale opportunities (no update in X days)
- **Proposal generator** — AI-drafted SOW/proposal from pricing estimate
- **Revenue dashboard** — pipeline value, closed won MRR, projected ARR
- **Multi-user** — seat-based access for Cade and Keenan with role permissions
- **Brokerage commission tracking** — separate from retainer pipeline, track referral fees and commission deals
- **Contact enrichment** — auto-pull LinkedIn/company data on new opportunities
```
