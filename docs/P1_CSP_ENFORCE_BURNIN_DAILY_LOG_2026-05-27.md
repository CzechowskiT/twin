# CSP enforce burn-in — daily operator log

Pairs with `docs/P1_CSP_ENFORCE_BURNIN_CHECKLIST_2026-05-27.md`.
**Do not flip to enforce** until 72h of clean rows on the preview alias and explicit founder sign-off.

## Daily burn-in decision log schema

| Date (UTC) | Source | Observed reports | False positives | Blocking risk | Decision | Next action |
| ---------- | ------ | ---------------- | --------------- | ------------- | -------- | ----------- |
| 2026-05-27 | Manual header check (prod alias) | Pending DB sink review | Unknown | Medium (insufficient evidence) | HOLD (report-only) | Collect `csp_reports` sample + route checks |
| 2026-05-28 | `curl -sI` read-only checks on `/` and `/waitlist` | Header present: `content-security-policy-report-only` with `report-uri /api/v1/csp-report` | None observed in this check | Medium (no 72h clean evidence pack yet) | HOLD (report-only) | Keep daily log cadence; gather DB sink evidence and false-positive triage |
| 2026-05-29 | `curl -sI` on `/` and `/dashboard` (prod) | Same report-only CSP + `report-uri`; no `Content-Security-Policy` enforce header | None in header probe | Medium (72h + DB sink still open) | HOLD (report-only) | Do **not** flip enforce; `pytest tests/test_csp_report*.py` 9 passed |
| 2026-05-29 (batch 2) | `curl -sI` on `/`, `/dashboard`, `/login/candidate`, `/demo`, `/status` (prod alias) | All HTTP 200; `content-security-policy-report-only` on every route; **no** enforce `Content-Security-Policy` header | None in header probe | Medium (72h clean window + DB sink triage still open) | HOLD (report-only) | Complete per-route spot check; keep enforce blocked per S2 checklist |

## Per-route spot check

- [x] `/` (2026-05-28 header evidence captured)
- [x] `/waitlist` (2026-05-28 header evidence captured)
- [x] `/demo` (2026-05-29 report-only header on prod alias)
- [x] `/login/candidate` (2026-05-29 report-only header on prod alias)
- [ ] `/register/candidate`
- [x] `/dashboard` (2026-05-29 report-only header on prod alias; logged-out)
- [x] `/status` (2026-05-29 report-only header on prod alias)

## Notes

- Report-only header includes `report-uri /api/v1/csp-report` on checked routes (`/`, `/waitlist`) as of 2026-05-28.
- Report sink endpoint documentation: `docs/P1_CSP_REPORT_URI_WIRING_2026-05-27.md` and `docs/P1_CSP_REPORTING_ENDPOINT_2026-05-27.md`.
- Enforce flip is **docs-only plan** until founder approves — see `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`.
