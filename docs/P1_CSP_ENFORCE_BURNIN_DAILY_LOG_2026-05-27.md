# CSP enforce burn-in — daily operator log

Pairs with `docs/P1_CSP_ENFORCE_BURNIN_CHECKLIST_2026-05-27.md`.
**Do not flip to enforce** until 72h of clean rows on the preview alias.

| Day (UTC) | Alias checked | Console violations | `csp_reports` new rows | Stripe/analytics blocked? | Sign-off |
| --------- | ------------- | ------------------ | ---------------------- | ------------------------- | -------- |
| 2026-05-27 | twin-sooty (prod report-only) | _pending manual_ | _SQL spot-check pending_ | n/a | — |

## Per-route spot check (day 1)

- [ ] `/`
- [ ] `/waitlist`
- [ ] `/demo`
- [ ] `/login/candidate`
- [ ] `/register/candidate`
- [ ] `/dashboard` (logged-out redirect only)
- [ ] `/status`

## Notes

- Report-only header must include `report-uri /api/v1/csp-report` (runtime test in `frontend/e2e/smoke.spec.ts`).
- Enforce flip is **docs-only plan** until founder approves — see `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`.
