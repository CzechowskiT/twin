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
| 2026-06-01 | `scripts/audit-csp-headers.sh` + manual `curl -sI` on 8 routes (prod alias) | All HTTP 200; report-only + `report-uri`; prod still permissive `https:` wildcards | None in header probe | Medium | HOLD (report-only) | See `docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md` |
| 2026-06-01 (batch 2) | Narrowed CSP prepared in repo (`frontend/next.config.ts`); prod still permissive | Repo: explicit hosts + `frame-src`; prod unchanged until deploy | None in header probe | Medium | HOLD (report-only) | Deploy narrowed report-only to preview → start 72h log triage |
| 2026-06-02 | `scripts/audit-csp-headers.sh` + manual 8-route `curl -sI` + burn-in window doc | All HTTP 200; report-only + `report-uri`; narrowed allowlist signature observed; no enforce header | None in header probe | Medium (72h evidence window active) | STARTED (report-only burn-in) | Track Railway logs at 4h cadence; complete DevTools matrix and founder dry-run by window end |
| 2026-06-02 (fix) | Founder Railway `csp_report violation` triage (`connect-src`, `blocked-uri` = `twin-production-bcd9.up.railway.app`, `/dashboard`) | Report-only violations on direct API host; not user outage | Prod `NEXT_PUBLIC_API_URL` path — not extension noise | Medium until redeploy | **RESET** (burn-in clock) / **FIX** (repo `connect-src`) | Merge + deploy frontend; restart 72h after deploy; do **not** flip enforce |
| 2026-06-02 (restart) | Post-fix founder checks: public-health OK; Railway API health OK; dashboard OK; Railway logs — **no fresh** `csp_report` for `twin-production-bcd9.up.railway.app` | Prior window invalidated by `connect-src` gap; new clock after deploy | None post-fix in founder log triage | Medium (72h evidence in flight) | **STARTED** (report-only burn-in) | Window `2026-06-02T14:18:33Z` → `2026-06-05T14:18:33Z`; 4h Railway log cadence; see `docs/S2_CSP_BURNIN_WINDOW_2026-06-01.md` |
| 2026-06-02 (early checkpoint `14:32:09Z`) | Founder Railway log search `csp_report` (~14m after restart) | **No fresh** `csp_report` after `2026-06-02T14:18:33Z` restart; historical Jun 1 20:52–20:53 CEST `connect-src` Railway API — pre-fix | Historical `connect-src` gap — not extension noise | Medium (72h in flight) | **CONTINUE** (report-only HOLD) | Next 4h cadence `2026-06-02T18:18:33Z`; enforce **OFF**; S2 **NOT READY**; public launch **NO-GO** |
| 2026-06-02 (manual checkpoint `14:42:07Z`) | Founder dashboard smoke + routes (Dashboard, Jobs, Profile, Calendar, Demo) + Railway `csp_report` search | **No fresh** `csp_report` after restart; routes OK — no white screen/breaking errors; Jun 1 `connect-src` historical — fixed | None in founder spot check | Medium (72h in flight) | **CONTINUE** (report-only HOLD) | Next 4h cadence `2026-06-02T18:18:33Z`; enforce **OFF**; S2 **NOT READY**; public launch **NO-GO** |
| 2026-06-02 (clean checkpoint `15:42:41Z`) | Founder Railway `production/twin` deployment `37096ecc`; search `csp_report` | **No logs found** / no fresh reports after `2026-06-02T14:18:33Z`; dashboard OK; auto-apply paused; `nightly_auto_apply_beat_enabled=false` (prior evidence) | None in founder log search | Medium (72h in flight) | **CONTINUE** (report-only HOLD) | Next 4h cadence `2026-06-02T18:18:33Z`; enforce **OFF**; S2 **NOT READY**; public launch **NO-GO** |
| 2026-06-03 (agent checkpoint `08:00:23Z`) | `scripts/audit-csp-headers.sh` + `GET /api/public-health` + local CSP/security-header tests (~17h 42m into window; ~54h 18m left) | 8 routes: CSP-RO yes, enforce no, `report-uri` yes; health `ok`; beat **false** | None in automated probe | Medium (72h in flight; Railway logs **not** agent-accessible) | **CONTINUE** (report-only HOLD) | Founder backfill Railway `csp_report` for missed 4h cadence (`18:18`, `22:18`, `02:18`, `06:18` UTC); next founder `2026-06-03T10:18:33Z`; window end `2026-06-05T14:18:33Z` |
| 2026-06-03 (founder-directed `11:16:42Z`) | Agent: `audit-csp-headers.sh` + public-health; Railway: **founder UI only** (template in `docs/S2_CSP_BURNIN_WINDOW_2026-06-01.md` § 2026-06-03) | Headers PASS; health `ok`, nightly **false**; Railway count **pending founder** | None in agent probe | Medium (72h in flight) | **CONTINUE** (report-only HOLD) | Founder: Railway search `csp_report` from `2026-06-02T14:18:33Z`; Chrome DevTools checklist; next cadence `2026-06-03T14:18:33Z`; L6 audit started — `docs/L6_DSR_PRIVACY_AUDIT_2026-06-03.md` |

## Per-route spot check

- [x] `/` (2026-05-28 header evidence captured)
- [x] `/waitlist` (2026-05-28 header evidence captured)
- [x] `/demo` (2026-05-29 report-only header on prod alias)
- [x] `/login/candidate` (2026-05-29 report-only header on prod alias)
- [x] `/register/candidate` (2026-06-01 report-only header on prod alias)
- [x] `/dashboard` (2026-05-29 report-only header on prod alias; logged-out)
- [x] `/status` (2026-05-29 report-only header on prod alias)
- [x] `/dashboard/calendar` (2026-06-01 report-only header on prod alias; logged-out)
- [x] `/api/public-health` (2026-06-01 report-only header on prod alias)

## Notes

- Report-only header includes `report-uri /api/v1/csp-report` on checked routes (`/`, `/waitlist`) as of 2026-05-28.
- Report sink endpoint documentation: `docs/P1_CSP_REPORT_URI_WIRING_2026-05-27.md` and `docs/P1_CSP_REPORTING_ENDPOINT_2026-05-27.md`.
- Enforce flip is **docs-only plan** until founder approves — see `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`.
