# Public launch readiness matrix — 2026-07-13

> **Auditor:** autonomous pre-launch batch (Path B++)  
> **Branch HEAD:** `c3d35c0` (`chore/extended-integration-batch-2026-07-13`)  
> **Verdict:** **Public launch NO-GO** (unchanged)

---

## Executive gates

| Gate | Status | Evidence |
|------|--------|----------|
| P0 | **CLOSED** | `P0_CLOSURE_DECISION_2026-07-07.md` |
| Gate E | **PASS** | Phase 3B attempt 19 — 20/20 |
| Gate F | **PENDING** | Founder decision not recorded |
| Launch | **NO-GO** | `LAUNCH_STANCE = noGo` |
| Phase 3B local | **BLOCKED** | Isolated runner only |
| O7 DR drill | **PARTIAL** | 2026-06-01 PASS; post-scaffold re-drill pending |

---

## A — Security

| Check | Status | Evidence |
|-------|--------|----------|
| CSP enforce live | ✅ | `vercel.json` security headers + prior S2 PASS |
| Security headers guard | ✅ | `npm run test:security-headers` |
| No secrets in repo | ✅ | Spot check batch |
| Wave C3–C5 matrix | ✅ | `SECURITY_MATRIX_WAVE_C3_C5_2026-07-13.md` |
| Drain signature / DRAIN_SECRET | ⚠️ | No Vercel drains configured (Hobby path) |
| R-019 self-service delete | ⚠️ OPEN | Manual DSR waiver only |

---

## B — Database / migrations

| Check | Status | Evidence |
|-------|--------|----------|
| Prod `db_ok` | ✅ | `public-health` @ twin-sooty |
| Alembic head prod | `c2a08b0` scaffold (070) | Not 077 until train merges |
| Integration sim 070–077 | ✅ PASS | `sim:integration-070-077` |
| #452 migration parent | ⚠️ | `074` down_revision `072` on branch — fix to `073` at rebase |
| Duplicate revision guard | ✅ | `test:alembic-duplicate-revision-guard` |

---

## C — Frontend build / deploy

| Check | Status | Evidence |
|-------|--------|----------|
| Local `npm run build` | ✅ PASS | After batch fixes |
| Vercel project linked | ✅ | `twin` / root `frontend` |
| Latest preview (#451 branch) | ✅ Ready | `twin-84awyjvkq` |
| Recent preview errors | ⚠️ | 2 ERROR previews last 1h (other branches) |
| Prod FE URL | `https://twin-sooty.vercel.app` | 200 OK |
| Env vars (counts) | Prod+Preview: 2 · Dev: 0 | `NEXT_PUBLIC_API_URL`, `RECRUITER_INBOX_TOKEN` |

---

## D — Founder smoke / credentials

| Check | Status | Evidence |
|-------|--------|----------|
| Env preflight | UNSET | `preflight:founder-smoke-env` |
| Prod reachability | ✅ | `preflight:preview-reachability` |
| Wave B smoke (B1/B2/B3) | **BLOCKED** | No `DEMO_USER_PASSWORD` |
| Wave C smoke (C1–C5) | **BLOCKED** | No recruiter token |
| Fake PASS prevention | ✅ | Guards enforce no PASS without doc |

---

## E — Release train (#448–#460)

| Check | Status |
|-------|--------|
| #449→#450→#448 order documented | ✅ |
| #451 tooling sim | ✅ PASS |
| #452 CONFLICTING | ⚠️ LAUNCH_BLOCKER for C3 merge |
| #456–#460 hardening | ✅ CI green; merge after tooling |
| Rebase playbook 448–460 | ✅ `FINAL_RELEASE_TRAIN_REBASE_PLAYBOOK_448_460_2026-07-13.md` |

---

## F — i18n / a11y (public surfaces)

| Check | Status | Evidence |
|-------|--------|----------|
| Wave critical i18n/a11y guard | ✅ | `test:wave-critical-i18n-a11y-guard` |
| Public route registry | ✅ | `test:public-route-reference-guard` (after `/dashboard/trust` crosslink fix) |
| Pilot limits code | ✅ | `CONTROLLED_PILOT_PRIMARY_LIMITS` restored 8/5/4 |

---

## G — Observability

| Check | Status |
|-------|--------|
| Vercel drains | None (use Dashboard / CLI logs) |
| `@vercel/analytics` | Not detected in package.json |
| `@vercel/speed-insights` | Not detected |
| PostHog MCP | Available; not exercised this batch |

---

## H — Legal / privacy

| Check | Status | Evidence |
|-------|--------|----------|
| Export self-service | ✅ LIVE | `/me/export.json` |
| Delete self-service | ⚠️ Manual | L6 waiver; R-019 open |
| Cookie consent | ✅ | `test:cookie-consent` |
| Privacy audit | See | `PRELAUNCH_PRIVACY_COMPLIANCE_AUDIT_2026-07-13.md` |

---

## Canonical stance

`P0_CLOSED | Gate_E_PASS | Gate_F_PENDING | Launch_NO-GO | Phase_3B_BLOCKED_LOCAL | Path_B++`
