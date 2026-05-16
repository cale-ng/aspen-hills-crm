@AGENTS.md

# Project rules

These rules apply to every change made in this repo. Loaded into every Claude Code session via this file.

## Documentation is part of the change

Any time you build, change, refactor, or debug something, update the relevant docs in the same commit. Treat docs as code — a PR with stale docs is incomplete.

| Doc | Update it when… |
|---|---|
| [`TECHNICAL_SPECIFICATIONS.md`](TECHNICAL_SPECIFICATIONS.md) | Architecture, stack, env vars, or major implementation decisions change |
| [`APP_REQUIREMENTS.md`](APP_REQUIREMENTS.md) | A workflow, feature, or acceptance criterion is added/changed/removed |
| [`DATA_DICTIONARY.md`](DATA_DICTIONARY.md) | Any DB column, table, index, bucket, or JSONB shape changes |
| [`TESTING_REQUIREMENTS.md`](TESTING_REQUIREMENTS.md) | Test standards, golden flows, CI steps, or tooling change |
| [`VERSION_HISTORY.md`](VERSION_HISTORY.md) | Any meaningful change ships — add a new dated entry (no entry = not meaningful enough) |

If a change touches none of the above, it's probably small enough to ship with just the code change — but always pause and consider before skipping.

## Definition of "meaningful" for version history

Add a `VERSION_HISTORY.md` entry when:
- A user-visible feature is added or removed
- A schema migration is applied
- A dependency is added, removed, or major-version bumped
- An architectural decision is reversed
- A bug is fixed that was visible to the user

Skip a version entry for: formatting, comments, internal refactors with no behavior change, dev-only tweaks.

## Before merging any change

The checks in [`TESTING_REQUIREMENTS.md`](TESTING_REQUIREMENTS.md) §1 (typecheck + lint + build) must pass. No exceptions.

## Source of truth

When the product spec and an implementation choice disagree, the spec at [`docs/aspen_hills_crm_spec.md`](docs/aspen_hills_crm_spec.md) wins by default. Flag the conflict and propose an update to one or the other — don't silently diverge.
