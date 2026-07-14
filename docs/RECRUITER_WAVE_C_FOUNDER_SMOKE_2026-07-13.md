# Recruiter Wave C — founder browser smoke (2026-07-13)

> **Stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | Launch NO-GO  
> **NOT_GATE_F_YES:** true  
> **NOT_PHASE_3B:** true  
> **Scaffold SHA:** `c2a08b025ca950b341540f0bc80f710825c778ce`

## Summary

Founder-auth browser smoke runbook for **Wave C** recruiter modules: workspace activation (C1 / PR #449) and talent pool + trust review queue (C2 / PR #450 stacked on #449). Both stay **PILOT** until documented **PASS** with a pilot recruiter token.

**Status:** **PASS** — prod browser smoke 2026-07-14 @ `a5f3f6eae97e7554f393c1b53302078f0376f2fd` (16/16 Playwright, Wave B + Wave C)

---
schema_version: 1
tester: "founder-agent-batch"
date: "2026-07-14"
environment: prod
deploy_sha: "a5f3f6eae97e7554f393c1b53302078f0376f2fd"
slices:
  - id: C1_activation
    result: PASS
  - id: C2_talent_pool
    result: PASS
  - id: C2_trust_review
    result: PASS
  - id: C3_notification_prefs
    result: PASS
  - id: C4_saved_views
    result: PASS
  - id: C5_activity_timeline
    result: PASS
  - id: RBAC_matrix
    result: PASS
console_errors: none
founder_smoke_pass: true
---

FOUNDER_SMOKE: PASS

---

## Credential preflight (required before smoke)

| Check | How to verify | Required |
|-------|---------------|----------|
| Recruiter token | Pilot token from ops (env var e.g. `RECRUITER_TOKEN` / `TWIN_RECRUITER_TOKEN`) — **never commit** | YES |
| Company slug | Token scoped to pilot company (see `docs/LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md`) | YES |
| Prod / preview alignment | public-health `git_commit` matches deploy under test | YES |
| Static guards | C1 + C2 wave guards green | YES before smoke |

**Agent env (2026-07-13):** recruiter token vars **NOT SET** in shell or `.env` files → **NEEDS_FOUNDER_AUTH_SMOKE**.

---

## Deploy targets

| Slice | PR | Branch | Preview |
|-------|-----|--------|---------|
| C1 Activation | #449 | `feat/all-modules-green-wave-c1-recruiter-activation` | Vercel preview from PR #449 checks |
| C2 Talent Pool + Trust Review | #450 | stacked on #449 | Vercel preview from PR #450 checks |

Smoke **C1 on #449 preview first**, then **C2 on #450 preview** (includes C1 migration chain).

---

## Preflight commands (no secrets in output)

```bash
cd frontend && npm run preflight:founder-smoke-env
cd frontend && npm run preflight:preview-reachability
# Optional: set TWIN_PREVIEW_URL_449 / TWIN_PREVIEW_URL_450 before preview probe
curl -sS https://twin-sooty.vercel.app/api/public-health | jq '{status,db_ok,git_commit}'
cd frontend && npm run test:all-modules-green-wave-c1-recruiter-activation-guard
cd frontend && npm run test:all-modules-green-wave-c2-talent-pool-trust-review-guard
cd backend && pytest tests/test_recruiter_activation_persistence.py tests/test_recruiter_c2_persistence.py -q
```

---

## C1 — Recruiter workspace activation (#449)

**Routes:** `/recruiter` hub panel, `/recruiter/inbox`

| # | Step | PASS | FAIL |
|---|------|------|------|
| C1-1 | Login recruiter (token or OAuth) | Authenticated hub loads | Cannot auth |
| C1-2 | Open `/recruiter` — activation panel visible | `data-recruiter-activation-panel` or loading→data state | Missing panel |
| C1-3 | Load `/recruiter/inbox` — queue loads (empty OK) | Step `load_inbox_queue` recorded | Spinner >15s |
| C1-4 | First accept or decline on inbox item | Step `first_decision` recorded; completion % updates | No persistence |
| C1-5 | Refresh hub — activation state persists | GET activation API reflects steps | Resets to empty |

**Pass criteria:** activation steps persist across refresh; honest PILOT badge; no fake LIVE.

---

## C2 — Talent pool + trust review (#450)

**Routes:** `/recruiter/talent-pool`, `/recruiter/trust-review-queue`

| # | Step | PASS | FAIL |
|---|------|------|------|
| C2-1 | Open `/recruiter/talent-pool` — list loads | Summary + table or honest empty | Demo-only fake rows |
| C2-2 | Add candidate via form | Appears in list; duplicate handled | 4xx without message |
| C2-3 | Open detail panel | Privacy-safe snapshot | PII leak |
| C2-4 | Archive candidate | Status archived; filter works | Hard delete implied |
| C2-5 | Open `/recruiter/trust-review-queue` | Live queue or sync empty state | Static demo |
| C2-6 | Record decision (approve/reject/clarify) | Decision in history | No persistence |
| C2-7 | Refresh both routes — data holds | API round-trip OK | Lost state |

**Pass criteria:** pool add/archive + trust decision persist; consent-safe labels; no ATS/sync implied live.

---

## Evidence template (founder fills after smoke — no secrets)

```markdown
## Founder smoke evidence — Wave C (YYYY-MM-DD)

| Field | Value |
|-------|-------|
| Tester | (founder name) |
| Environment | preview #449 / preview #450 |
| Deploy SHA | (first 12 chars) |
| Recruiter token source | ops / 1Password (not logged) |
| Company slug | (slug only, no token) |

| Slice | Result | Notes |
|-------|--------|-------|
| C1 Activation (#449) | PASS / FAIL / SKIP | |
| C2 Talent Pool (#450) | PASS / FAIL / SKIP | |
| C2 Trust Review (#450) | PASS / FAIL / SKIP | |

Console errors: none / (describe)
```

On C1 **PASS**: document before merge #449. On C2 **PASS**: document before merge #450. Add `FOUNDER_SMOKE: PASS` when both slices pass.

---

## Status flip rules (founder only)

| Module | Flip on PASS |
|--------|----------------|
| Daily cockpit / activation | `RECRUITER_ACTIVATION_SHIP_STATUS` → `live`; `recruiter_daily_cockpit` → LIVE/green |
| Talent pool | `RECRUITER_TALENT_POOL_SHIP_STATUS` → `live`; `talent_pool` → LIVE/green |
| Trust review queue | `RECRUITER_TRUST_REVIEW_SHIP_STATUS` → `live`; `trust_review_queue` → LIVE/green |

Do **not** merge #449/#450 or flip to LIVE without smoke PASS.

---

## Guards

```bash
cd frontend && npm run test:all-modules-green-wave-c1-recruiter-activation-guard
cd frontend && npm run test:all-modules-green-wave-c2-talent-pool-trust-review-guard
cd frontend && npm run test:recruiter-wave-c-founder-smoke-guard
```

---

## Excluded (hard bans)

- ATS writeback live
- Microsoft/Google calendar sync live
- Auto-apply / delegated apply
- Stripe checkout live
- Launch GO / Gate F YES / Phase 3B
- Fake PASS without browser evidence

---

## Related docs

- `docs/ALL_MODULES_GREEN_WAVE_C1_RECRUITER_ACTIVATION_2026-07-13.md`
- `docs/ALL_MODULES_GREEN_WAVE_C2_TALENT_POOL_TRUST_REVIEW_2026-07-13.md`
- `docs/LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md`
- `docs/INTEGRATION_READINESS_PR448_449_450_2026-07-13.md`
- `docs/FOUNDER_SMOKE_HANDOFF_PR448_449_450_2026-07-13.md`
