# Technical Specifications — Aspen Hills CRM

> Living document. Update any time the architecture or a major implementation decision changes.

**Last updated:** 2026-05-15 · **Version:** V0.2

---

## 1. Stack overview

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) | Unified frontend + API routes; server-side AI calls keep API keys out of the browser |
| Language | **TypeScript 5** | Type safety across data layer + UI |
| Styling | **Tailwind CSS v4** + CSS custom properties | Design tokens from spec mapped to CSS vars + Tailwind theme |
| Database | **Supabase (Postgres)** | Free tier covers v1; native JSONB for pricing; pgcrypto for UUIDs |
| File storage | **Supabase Storage** (`attachments` bucket) | Co-located with DB |
| AI | **Anthropic SDK** (`@anthropic-ai/sdk`) | Default model: `claude-sonnet-4-6` (configurable via `ANTHROPIC_MODEL`) |
| Hosting | **TBD** — Vercel recommended for v1 (integrates with the GitHub repo, free tier) |
| Auth | **None in v1** — single-tenant tool, RLS disabled. Will revisit when adding Cade/Keenan. |

---

## 2. Project structure

```
Aspen Hills CRM/
├─ src/
│  ├─ app/                     # Next.js App Router
│  │  ├─ layout.tsx           # Root layout (fonts, theme wrapper)
│  │  ├─ page.tsx             # Tracker page (server component)
│  │  ├─ globals.css          # Tailwind import + design tokens
│  │  └─ api/                 # Route handlers (POST endpoints for AI + mutations)
│  ├─ components/
│  │  ├─ CRMApp.tsx           # Top-level client shell (manages view state)
│  │  ├─ Header.tsx
│  │  ├─ PipelineFilter.tsx
│  │  ├─ OpportunityList.tsx
│  │  ├─ DetailPanel.tsx
│  │  └─ ui/                  # Primitives (StagePill, FitDot, …)
│  └─ lib/
│     ├─ types.ts             # Domain types + display metadata
│     ├─ data.ts              # Server-only data access layer
│     ├─ seed.ts              # Initial opportunities (used as fallback if Supabase unset)
│     └─ supabase/server.ts   # Service-role Supabase client (server only)
├─ supabase/
│  ├─ schema.sql              # DB schema; run in Supabase SQL editor (initial)
│  └─ reset.sql               # Drop + recreate (used to fix a half-applied initial schema)
├─ scripts/
│  ├─ seed.ts                 # Idempotent seeder; run via `dotenv -e .env.local -- npx tsx scripts/seed.ts`
│  └─ inspect.ts              # Column availability utility
├─ docs/
│  └─ aspen_hills_crm_spec.md # Original product spec
├─ public/                    # Static assets
├─ .env.local.example         # Template for env vars
├─ TECHNICAL_SPECIFICATIONS.md (this file)
├─ APP_REQUIREMENTS.md
├─ DATA_DICTIONARY.md
├─ TESTING_REQUIREMENTS.md
├─ VERSION_HISTORY.md
└─ CLAUDE.md                  # Project rules loaded into every Claude Code session
```

---

## 3. Data flow

```
[Browser]  ←→  [Next.js Server Component / Route Handler]  ←→  [Supabase Postgres / Storage]
                                  │
                                  └─→  [Anthropic API]   (for /api/opportunities/:id/pitch and /pricing)
```

- Reads happen in **Server Components** via `src/lib/data.ts`.
- Writes happen in **Route Handlers** under `src/app/api/...` (server-side, can use service-role key).
- AI calls happen **server-side only** — Anthropic API key is never exposed to the browser.

---

## 4. Environment variables

Stored in `.env.local` (git-ignored). Template at `.env.local.example`.

| Variable | Used by | Visibility |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Server + client | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client (future) | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | **Secret** |
| `ANTHROPIC_API_KEY` | Server only | **Secret** |
| `ANTHROPIC_MODEL` | Server only | Public (defaults to `claude-sonnet-4-6`) |

---

## 5. Key implementation decisions

| Decision | Date | Why |
|---|---|---|
| Next.js 16 + App Router (not Pages) | 2026-05-15 | Server Components allow direct DB reads without an API layer; reduces boilerplate |
| Service-role key for v1 DB access | 2026-05-15 | Single-tenant tool, no auth yet — service role + disabled RLS keeps things simple. **Must revisit before adding multi-user.** |
| Seed-data fallback in `src/lib/data.ts` | 2026-05-15 | Lets the UI render before Supabase is wired up |
| Design tokens as CSS variables (not Tailwind config) | 2026-05-15 | Matches the source spec exactly; portable to other tools |
| AI calls server-side only | 2026-05-15 | Anthropic key would otherwise leak to the browser |
| Pricing stored as JSONB | 2026-05-15 | Nested structure (equity trigger, recommendation) doesn't justify separate tables for v1 |

---

## 6. Open questions / future work

- **Auth:** add Supabase Auth when Cade/Keenan need access; enable RLS at that point.
- **CI:** GitHub Actions for build + lint on every PR (see `TESTING_REQUIREMENTS.md`).
- **Deployment:** wire to Vercel; preview deploys per PR.
- **Email ingestion** (future feature in spec §11).
