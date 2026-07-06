# Gate E Phase 3B — Attempt 17 (route-sharded, isolated runner) — FAIL (13/20 product failures, 7/20 PASS) — 2026-07-06

**Branch at run:** `cursor/phase1-monorepo-scaffold` @ `f7867f7890197ceeff625539a04e85d016d45fc8` (`f7867f78` — includes **PR #381** `e3f302bc` artifact upload fix and **PR #382** attempt 16 result doc).
**Founder decision:** Founder authorization: **YES** for Gate E Phase 3B route-sharded isolated-runner dispatch **attempt 17** — `confirm_gate_e=yes`, `confirm_prod_smoke=yes`, `confirm_no_launch_go=yes`.
**Workflow:** [`gate-e-phase3b-manual.yml`](../.github/workflows/gate-e-phase3b-manual.yml) (`workflow_dispatch`-only; 20 route matrix jobs + 1 aggregate job).

**Classification:** **`FAIL` — all 20 route jobs completed naturally (no runner infrastructure non-completion).** **7/20 PASS, 13/20 FAIL** on product harness assertions: **12 × `page-error:1`**, **1 × `DOM_FAIL` (`dom-fail:21092` on `/dashboard`)**. Compared to [attempt 16](./gate-e-phase3b-attempt16-result-2026-07-03.md) (7 PASS / 13 FAIL): product totals unchanged; **`/company/dashboard` flipped to PASS**; **`/company/candidates/demo-candidate-001/trust` regressed to FAIL** (`page-error:1`).

**PR #381 artifact-upload verification (this run):** **YES — VERIFIED** on SHA with `include-hidden-files: true`. Route zips contain `.diagnostics/`, `gate-e-attempt-status.json`, `playwright-report/`, `test-results/`; aggregate reports **`pass=7 fail=13 missing=0`** (not false `missing=20/20`). See §4.

**Public launch: NO-GO · P0: OPEN · Gate F: PENDING**

**Related:** [attempt 16 result](./gate-e-phase3b-attempt16-result-2026-07-03.md) · [attempt 15 result](./gate-e-phase3b-attempt15-result-2026-07-03.md) · [route-sharding plan](./GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03.md) · [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## 1. Dispatch

| Field | Value |
|---|---|
| Workflow | `gate-e-phase3b-manual.yml` |
| Trigger | `gh workflow run gate-e-phase3b-manual.yml --ref cursor/phase1-monorepo-scaffold -f confirm_gate_e=yes -f confirm_prod_smoke=yes -f confirm_no_launch_go=yes` |
| Run ID | `28808081386` |
| Run URL | https://github.com/CzechowskiT/twin/actions/runs/28808081386 |
| Head SHA | `f7867f7890197ceeff625539a04e85d016d45fc8` |
| PR #381 merge SHA | `e3f302bcf2521585fea68d2f52a4ef252cbba6af` (ancestor of run SHA) |
| Dispatched | 2026-07-06T16:48:10Z |
| Completed | 2026-07-06T18:04:54Z (≈1h17m) |
| Overall run status | `completed`, conclusion `failure` (13 route-level product failures) |
| Jobs | 20 route jobs + 1 aggregate (`success`) |
| Artifacts uploaded | **21/21** named artifacts (`gate-e-phase3b-evidence-<slug>-28808081386` × 20 + aggregate) |

### 1.1 Route-level table (20/20)

| # | Route | Job | Product | Classification | failReasons |
|---|---|---|---|---|---|
| 1 | `/` | success | **PASS** | PASS | — |
| 2 | `/demo` | success | **PASS** | PASS | — |
| 3 | `/for-companies` | success | **PASS** | PASS | — |
| 4 | `/dashboard` | failure | **FAIL** | `DOM_FAIL` | `dom-fail:21092` |
| 5 | `/dashboard/jobs` | success | **PASS** | PASS | — |
| 6 | `/dashboard/matches` | success | **PASS** | PASS | — |
| 7 | `/profile` | success | **PASS** | PASS | — |
| 8 | `/recruiter` | failure | **FAIL** | PASS¹ | `page-error:1` |
| 9 | `/recruiter/candidates/demo-candidate-001` | failure | **FAIL** | PASS¹ | `page-error:1` |
| 10 | `/recruiter/candidates/demo-candidate-001/trust` | failure | **FAIL** | PASS¹ | `page-error:1` |
| 11 | `/recruiter/candidates/demo-candidate-001/team` | failure | **FAIL** | PASS¹ | `page-error:1` |
| 12 | `/recruiter/candidates/demo-candidate-001/communication` | failure | **FAIL** | PASS¹ | `page-error:1` |
| 13 | `/recruiter/jobs/demo-role-001/pipeline` | failure | **FAIL** | PASS¹ | `page-error:1` |
| 14 | `/recruiter/integrations/ats/import-readiness` | failure | **FAIL** | PASS¹ | `page-error:1` |
| 15 | `/company/dashboard` | success | **PASS** | PASS | — |
| 16 | `/company/candidates/demo-candidate-001` | failure | **FAIL** | PASS¹ | `page-error:1` |
| 17 | `/company/candidates/demo-candidate-001/trust` | failure | **FAIL** | PASS¹ | `page-error:1` |
| 18 | `/company/candidates/demo-candidate-001/team` | failure | **FAIL** | PASS¹ | `page-error:1` |
| 19 | `/company/candidates/demo-candidate-001/communication` | failure | **FAIL** | PASS¹ | `page-error:1` |
| 20 | `/company/roles/demo-role-001/pipeline` | failure | **FAIL** | PASS¹ | `page-error:1` |

¹ Harness default `classification` stays `"PASS"` for `page-error:N` (see attempt 15 §1.1 footnote); authoritative product outcome is `routeStatus` / Playwright assertion (`FAIL`).

**Totals: 7 PASS, 13 FAIL, 0 MISSING (job-level), 0 infrastructure non-completion.**

**Aggregate job (`gate-e-phase3b-route-aggregate.json`):** `pass=7 fail=13 missing=0` — **authoritative** on this SHA (all `artifactFound: true`).

---

## 2. Product findings (vs attempt 16)

| Signal | Attempt 16 | Attempt 17 |
|---|---|---|
| PASS / FAIL | 7 / 13 | 7 / 13 |
| `page-error:1` routes | 12 | 12 |
| `/dashboard` DOM_FAIL | yes (`dom-fail:21092`) | yes (`dom-fail:21092`) |
| All `/recruiter/*` (7 routes) | 7/7 FAIL `page-error:1` | 7/7 FAIL `page-error:1` |
| `/company/dashboard` | FAIL `page-error:1` | **PASS** |
| `/company/candidates/demo-candidate-001/trust` | PASS | **FAIL** `page-error:1` |

**`page-error:1` routes (12):** `/recruiter`, all six other `/recruiter/*` routes in matrix, `/company/candidates/demo-candidate-001`, `/company/candidates/demo-candidate-001/trust`, `/company/candidates/demo-candidate-001/team`, `/company/candidates/demo-candidate-001/communication`, `/company/roles/demo-role-001/pipeline`.

**`/dashboard` DOM_FAIL:** **Confirmed** — diagnostics: `classification: DOM_FAIL`, `failReasons: ["dom-fail:21092"]`. Sibling `/dashboard/jobs` and `/dashboard/matches` **PASS**.

**Not fixed this run (report only):** prod `page-error:1` on recruiter/company surfaces; `/dashboard` DOM budget breach — no code changes dispatched.

---

## 3. Preconditions (all 20 routes)

Hard-ban inputs, static guards (including `npm run test:gate-e-artifact-upload-guard` — 7/7 pass in CI), `workers=1` / `retries=0`, public-health 10/10, HTTP smoke 10/10, pre-run cleanup, canonical command ran to completion on every route.

---

## 4. Artifact / PR #381 hidden-diagnostics fix

| Check | Result |
|---|---|
| Workflow SHA includes `include-hidden-files: true` | **YES** (2× in `gate-e-phase3b-manual.yml` @ `f7867f78`) |
| Upload step in run logs (sample: route `root`, job logs) | `include-hidden-files: true` |
| Route zip contains `.diagnostics/` | **YES** |
| Route zip contains `gate-e-attempt-status.json` | **YES** (under `.diagnostics/`) |
| Route zip contains `playwright-report/` + `test-results/` | **YES** |
| Aggregate marks real PASS/FAIL instead of MISSING | **YES** — `missing=0`, `artifactFound: true` per route |

**Verdict: PR #381 fix — YES, VERIFIED on attempt 17.**

**Local diagnostics paths (extract only, gitignored):** `.gate-e-attempt17-artifacts/gate-e-phase3b-evidence-<slug>-28808081386/`; aggregate at `.gate-e-attempt17-artifacts/gate-e-phase3b-evidence-aggregate-28808081386/gate-e-phase3b-route-aggregate.json`.

---

## 5. Gate F recommendation (Gate F remains **PENDING**)

Route-sharded evidence and **aggregate automation are now trustworthy** after PR #381. **Gate F stays PENDING** because Phase 3B product bar is not met (7/20 PASS): persistent prod `page-error:1` on recruiter/company surfaces and `/dashboard` DOM_FAIL remain P0-class blockers. Do **not** set Gate F YES or Launch GO from this run.

**Next engineering slice (after this doc):** root-cause `page-error:1` and `/dashboard` DOM_FAIL using downloadable `.diagnostics` from this run — **not** attempted in attempt 17.

---

## 6. Launch stance

**NO-GO** — Phase 3B not green (7/20 PASS). **P0 OPEN.** **Gate F PENDING.** No Launch GO claimed.
