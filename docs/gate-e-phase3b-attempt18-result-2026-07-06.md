# Gate E Phase 3B — Attempt 18 (route-sharded, isolated runner) — FAIL (1/20 product failure, 19/20 PASS) — 2026-07-07

**Branch at run:** `cursor/phase1-monorepo-scaffold` @ `2808eabcec3b51fd0692cbf0f1936403d93ce84b` (`2808eab` — includes **PR #384** hydration / recruiter `page-error:1` fix).
**Founder decision:** Founder authorization: **YES** for Gate E Phase 3B route-sharded isolated-runner dispatch **attempt 18** — `confirm_gate_e=yes`, `confirm_prod_smoke=yes`, `confirm_no_launch_go=yes`.
**Workflow:** [`gate-e-phase3b-manual.yml`](../.github/workflows/gate-e-phase3b-manual.yml) (`workflow_dispatch`-only; 20 route matrix jobs + 1 aggregate job).

**Classification:** **`FAIL` — all 20 route jobs completed naturally (no runner infrastructure non-completion).** **19/20 PASS, 1/20 FAIL** on product harness assertions: **0 × `page-error:1`**, **1 × `DOM_FAIL` (`dom-fail:21094` on `/dashboard`)**. Compared to [attempt 17](./gate-e-phase3b-attempt17-result-2026-07-03.md) (7 PASS / 13 FAIL, 12 × `page-error:1`): **all 12 prior `page-error:1` routes flipped to PASS** after PR #384; `/dashboard` DOM_FAIL **remains** (node count 21092 → 21094, still over budget).

**PR #381 artifact-upload verification (this run):** **YES — VERIFIED** on SHA with `include-hidden-files: true`. All 20 route zips contain `.diagnostics/`; aggregate reports **`pass=19 fail=1 missing=0`**. See §4.

**Public launch: NO-GO · P0: OPEN · Gate F: PENDING**

**Related:** [attempt 17 result](./gate-e-phase3b-attempt17-result-2026-07-03.md) · [PR #384](https://github.com/CzechowskiT/twin/pull/384) · [route-sharding plan](./GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03.md)

---

## 1. PR #384 merge + Vercel alignment

| Field | Value |
|---|---|
| PR | [#384](https://github.com/CzechowskiT/twin/pull/384) — `fix: prevent recruiter page runtime error` |
| Merge status | **Already merged** before dispatch (no merge action required in this pipeline) |
| Merge SHA | `2808eabcec3b51fd0692cbf0f1936403d93ce84b` |
| Merged at | 2026-07-06T18:50:59Z |
| CI at merge | `backend-smoke` SUCCESS, `frontend-build` SUCCESS, Vercel SUCCESS |
| Scope | Frontend-only (hydration / persona shell); **no** backend/API/auth/DB/env changes |

**Vercel / prod frontend alignment (pre-dispatch):**

| Check | Value |
|---|---|
| `origin/cursor/phase1-monorepo-scaffold` HEAD | `2808eabcec3b51fd0692cbf0f1936403d93ce84b` |
| `GET /api/public-health` → `frontend_commit` | `2808eabcec3b51fd0692cbf0f1936403d93ce84b` |
| Alignment | **ALIGNED** (no poll wait required) |
| `public-health` `status` / `db_ok` | `ok` / `true` |
| `api_commit` (Railway) | `6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa` (expected divergence after frontend-only PR) |

---

## 2. Dispatch

| Field | Value |
|---|---|
| Workflow | `gate-e-phase3b-manual.yml` |
| Trigger | `gh workflow run gate-e-phase3b-manual.yml --ref cursor/phase1-monorepo-scaffold -f confirm_gate_e=yes -f confirm_prod_smoke=yes -f confirm_no_launch_go=yes` |
| Run ID | `28845161178` |
| Run URL | https://github.com/CzechowskiT/twin/actions/runs/28845161178 |
| Head SHA | `2808eabcec3b51fd0692cbf0f1936403d93ce84b` |
| PR #384 merge SHA | `2808eabcec3b51fd0692cbf0f1936403d93ce84b` (same as run SHA) |
| Dispatched | 2026-07-07T06:01:47Z |
| Completed | 2026-07-07T07:18:17Z (≈1h17m) |
| Overall run status | `completed`, conclusion `failure` (1 route-level product failure: `/dashboard`) |
| Jobs | 20 route jobs + 1 aggregate (`success`) |
| Artifacts uploaded | **21/21** named artifacts (`gate-e-phase3b-evidence-<slug>-28845161178` × 20 + aggregate) |

### 2.1 Route-level table (20/20)

| # | Route | Job | Product | Classification | failReasons |
|---|---|---|---|---|---|
| 1 | `/` | success | **PASS** | PASS | — |
| 2 | `/demo` | success | **PASS** | PASS | — |
| 3 | `/for-companies` | success | **PASS** | PASS | — |
| 4 | `/dashboard` | failure | **FAIL** | `DOM_FAIL` | `dom-fail:21094` |
| 5 | `/dashboard/jobs` | success | **PASS** | PASS | — |
| 6 | `/dashboard/matches` | success | **PASS** | PASS | — |
| 7 | `/profile` | success | **PASS** | PASS | — |
| 8 | `/recruiter` | success | **PASS** | PASS | — |
| 9 | `/recruiter/candidates/demo-candidate-001` | success | **PASS** | PASS | — |
| 10 | `/recruiter/candidates/demo-candidate-001/trust` | success | **PASS** | PASS | — |
| 11 | `/recruiter/candidates/demo-candidate-001/team` | success | **PASS** | PASS | — |
| 12 | `/recruiter/candidates/demo-candidate-001/communication` | success | **PASS** | PASS | — |
| 13 | `/recruiter/jobs/demo-role-001/pipeline` | success | **PASS** | PASS | — |
| 14 | `/recruiter/integrations/ats/import-readiness` | success | **PASS** | PASS | — |
| 15 | `/company/dashboard` | success | **PASS** | PASS | — |
| 16 | `/company/candidates/demo-candidate-001` | success | **PASS** | PASS | — |
| 17 | `/company/candidates/demo-candidate-001/trust` | success | **PASS** | PASS | — |
| 18 | `/company/candidates/demo-candidate-001/team` | success | **PASS** | PASS | — |
| 19 | `/company/candidates/demo-candidate-001/communication` | success | **PASS** | PASS | — |
| 20 | `/company/roles/demo-role-001/pipeline` | success | **PASS** | PASS | — |

**Totals: 19 PASS, 1 FAIL, 0 MISSING (job-level), 0 infrastructure non-completion.**

**Aggregate job (`gate-e-phase3b-route-aggregate.json`):** `pass=19 fail=1 missing=0` — **authoritative** on this SHA (all `artifactFound: true`).

---

## 3. `page-error:1` flip analysis vs attempt 17

| Signal | Attempt 17 (`28808081386`) | Attempt 18 (`28845161178`) |
|---|---|---|
| PASS / FAIL | 7 / 13 | **19 / 1** |
| `page-error:1` routes | **12** | **0** |
| `/dashboard` DOM_FAIL | yes (`dom-fail:21092`) | yes (`dom-fail:21094`) |
| All `/recruiter/*` (7 routes) | 7/7 FAIL `page-error:1` | **7/7 PASS** |
| Company candidate / pipeline (5 routes with `page-error:1` in att. 17) | 5/5 FAIL `page-error:1` | **5/5 PASS** |
| `/company/dashboard` | PASS | PASS |

**Routes that flipped FAIL → PASS (all were `page-error:1` in attempt 17):**

1. `/recruiter`
2. `/recruiter/candidates/demo-candidate-001`
3. `/recruiter/candidates/demo-candidate-001/trust`
4. `/recruiter/candidates/demo-candidate-001/team`
5. `/recruiter/candidates/demo-candidate-001/communication`
6. `/recruiter/jobs/demo-role-001/pipeline`
7. `/recruiter/integrations/ats/import-readiness`
8. `/company/candidates/demo-candidate-001`
9. `/company/candidates/demo-candidate-001/trust` (regressed in att. 17; **fixed** in att. 18)
10. `/company/candidates/demo-candidate-001/team`
11. `/company/candidates/demo-candidate-001/communication`
12. `/company/roles/demo-role-001/pipeline`

**Remaining product failure:** `/dashboard` only — `DOM_FAIL`, `pageErrorCount: 0`, `consoleErrorCount: 2` (HTTP 422 on resources in diagnostics). Sibling `/dashboard/jobs` and `/dashboard/matches` **PASS**.

**Verdict on PR #384 hypothesis:** **CONFIRMED** for recruiter + shared company persona surfaces (`page-error:1` eliminated on all 12 previously failing routes). **NOT** a fix for `/dashboard` DOM budget.

---

## 4. Artifact / PR #381 hidden-diagnostics fix

| Check | Result |
|---|---|
| Route zip contains `.diagnostics/` | **YES** (20/20) |
| Route zip contains `gate-e-attempt-status.json` | **YES** (under `.diagnostics/`) |
| Route zip contains `phase3b-controlled-multitab-*.json` | **YES** |
| Aggregate marks real PASS/FAIL instead of MISSING | **YES** — `missing=0` |

**Local diagnostics paths (extract only, gitignored):** `.gate-e-attempt18-artifacts/gate-e-phase3b-evidence-<slug>-28845161178/`; aggregate at `.gate-e-attempt18-artifacts/gate-e-phase3b-evidence-aggregate-28845161178/gate-e-phase3b-route-aggregate.json`.

---

## 5. Gate F recommendation (Gate F remains **PENDING**)

Phase 3B product bar is **not** met: **19/20 PASS** with persistent `/dashboard` `DOM_FAIL`. Recruiter/company `page-error:1` blockers from attempt 17 are **cleared** on prod at `2808eab`. **Gate F stays PENDING** until `/dashboard` DOM budget passes and any remaining P0 launch criteria are closed. Do **not** set Gate F YES or Launch GO from this run.

**Next engineering slice:** root-cause `/dashboard` `dom-fail:21094` (DOM node budget) using attempt 18 `.diagnostics` — separate from PR #384 scope.

---

## 6. Launch stance

**NO-GO** — Phase 3B not fully green (19/20 PASS; `/dashboard` FAIL). **P0 OPEN.** **Gate F PENDING.** No Launch GO claimed.
