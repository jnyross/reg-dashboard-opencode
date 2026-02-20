# Activity Log

## 2026-02-19
- Initialized Phase 2 Ralph run: real data ingestion + 3-engine comparison.
- Forked MVP codebase into codex/, claude/, opencode/ subdirectories.
- Created plan.md, PRD.json, guardrails, and specs lookup.
- Engine choice: all 3 (Codex + Claude + OpenCode) building same feature independently.
- Comparison metric: output quality.

## 2026-02-20 (STRICT RALPH MODE)
- Opened law-centric refactor execution track.
- Created TASKLIST.md with ordered mandatory checklist (schema -> migration -> API -> UI -> tests -> deploy/live proof).
- Implemented law-centric data model:
  - Added `src/laws.ts` with canonical title extraction, deterministic `law_key`, `laws` + `law_updates` schema creation, event→law migration sync, and duplicate merge routine.
  - Added `law_id` linking from `regulation_events` to canonical `laws` records.
- Wired ingestion path to persist law updates (`upsertAnalyzedItem` now writes to law snapshot + update timeline).
- Added law-first API surface:
  - `GET /api/laws`
  - `GET /api/laws/:id` (includes `updateTimeline`)
  - `GET /api/brief` switched to top laws.
- Switched dashboard interactions to law-first behavior in `web/app.js` + tab copy in `web/index.html`.
- Added/updated tests for law model and law APIs:
  - `tests/law-key.test.ts`
  - `tests/laws-updates.test.ts` (proves 1 law -> many updates)
  - updated backend/e2e tests for law-first brief + endpoints.
- Validation: `npm test -- --runInBand` (pass), `npm run build` (pass).
- Local DB sanity check: law sync over 419 events produced multiple laws with `update_count > 1`.
