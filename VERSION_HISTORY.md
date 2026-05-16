# Version History — Aspen Hills CRM

> Every meaningful update lands here. Versions increment as `V0.1 → V0.2 → V0.3` for v0 series, then `V1.0` at first production launch.

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
