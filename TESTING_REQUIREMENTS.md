# Testing Requirements — Aspen Hills CRM

> Living document. Update as test coverage expands or standards change.

**Last updated:** 2026-05-15 · **Version:** V0.1

---

## 1. The baseline (every change)

Before any PR is merged, the following must pass:

| Check | Command | Notes |
|---|---|---|
| TypeScript typecheck | `npx tsc --noEmit` | Zero errors |
| Lint | `npm run lint` | Zero errors; warnings reviewed |
| Production build | `npm run build` | Must succeed; no runtime errors during page generation |

These are enforced locally and (once added) in GitHub Actions on every push.

---

## 2. Test categories

### A. Smoke tests (golden paths — must always pass)

These cover the core workflows from `APP_REQUIREMENTS.md`. As features land, each gets a test:

| ID | Workflow | Status |
|---|---|---|
| S-1 | Tracker page renders with seed data | ⚠ manual |
| S-2 | Stage filter narrows the list and shows correct counts | ⚠ manual |
| S-3 | Clicking a row opens detail panel with overview content | ⚠ manual |
| S-4 | "+ New Opportunity" form creates a row in Supabase | ⏳ pending feature |
| S-5 | AI pitch generation produces non-empty text | ⏳ pending feature |
| S-6 | AI pricing generation returns valid JSON matching `PricingEstimate` shape | ⏳ pending feature |
| S-7 | File upload writes to Storage and creates `attachments` row | ⏳ pending feature |
| S-8 | Stage change in detail view persists to DB | ⏳ pending feature |

Legend: ✅ automated · ⚠ manual · ⏳ pending feature

### B. Regression tests
Any bug we fix gets a test that would have caught it. No exceptions.

### C. Schema tests
Migrations applied to a fresh Supabase project should produce the same schema as the live DB. Verify by re-running `supabase/schema.sql` on a clean project.

### D. AI output validation
`/api/opportunities/:id/pricing` returns JSON — must be parsed and validated against the `PricingEstimate` Zod schema before saving. Reject malformed responses with a 502.

---

## 3. Testing tools (planned)

| Layer | Tool | Why |
|---|---|---|
| Unit | **Vitest** | Fast, native TS support, plays well with Next.js 16 |
| Component | **Vitest + Testing Library** | Same runtime as unit; renders client components |
| E2E / smoke | **Playwright** | Real browser; covers golden paths |
| Schema | Plain SQL diff | Run `schema.sql` against a fresh Supabase project monthly |

These get added incrementally — not blocking v1 launch, but each smoke test must move from ⚠ manual → ✅ automated before V1.0.

---

## 4. CI (GitHub Actions)

Workflow file: `.github/workflows/ci.yml` (to be added).

On every push and PR to `main`:
1. `npm ci`
2. `npx tsc --noEmit`
3. `npm run lint`
4. `npm run build`
5. (later) `npm test`

Secrets configured in GitHub repo settings:
- `ANTHROPIC_API_KEY` (for AI-touching tests; can be a low-budget key)
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (against a staging project — never prod)

---

## 5. Definition of done for any change

- [ ] All baseline checks pass (typecheck + lint + build)
- [ ] If touching a workflow listed in section A, the corresponding smoke test passes
- [ ] If fixing a bug, a regression test is added
- [ ] Relevant markdown docs updated (`TECHNICAL_SPECIFICATIONS.md`, `APP_REQUIREMENTS.md`, `DATA_DICTIONARY.md`)
- [ ] `VERSION_HISTORY.md` entry added if change is meaningful (feature, schema change, dep upgrade)

---

## 6. Open questions

- Where do we store fixture data for tests? (`tests/fixtures/` proposed)
- Should AI calls in tests use real API or fixtures? (Lean fixtures by default; one nightly job hits real API)
