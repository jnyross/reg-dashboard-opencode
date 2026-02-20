# TASKLIST — STRICT RALPH MODE (OpenCode law-centric refactor)

## Required artifacts
- [x] .ralph/specs-lookup-table.md present
- [x] .ralph/guardrails.md present
- [x] plan.md present
- [x] activity.md present
- [x] PRD.json present
- [x] TASKLIST.md present

## Law-centric backlog (ordered)
- [x] Schema: add `laws` + `law_updates` tables (+ indexes/constraints)
- [x] Canonical law extraction (stable canonical title + normalization)
- [x] `law_key` generation and persistence
- [x] Backfill/migration from `regulation_events` -> `laws`/`law_updates`
- [x] Merge duplicate laws by `law_key`
- [x] Add `/api/laws` endpoints (list/detail/update timeline)
- [x] Make `/api/brief` law-first (top laws, not raw event rows)
- [x] Law-first UI (laws list + update timeline in detail modal)
- [x] Tests: prove 1 law -> many updates path
- [ ] Build + tests + deploy + live validation
- [ ] Live proof: `/api/laws` reachable and sample law has `update_count > 1`
- [ ] Self-score >= 95
