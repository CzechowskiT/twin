# Gate E Phase 3B — Attempt 18 (route-sharded, post-PR #384 hydration fix) — FAIL (1/20 product failure, 19/20 PASS) — 2026-07-06

**Branch at run:** `cursor/phase1-monorepo-scaffold` @ `2808eabcec3b51fd0692cbf0f1936403d93ce84b` (`2808eabc` — **PR #384** merge SHA: hydration mismatch fix for React #418 / `page-error:1`).
**Founder decision:** Founder authorization: **YES** for Gate E Phase 3B route-sharded isolated-runner dispatch **attempt 18** — `confirm_gate_e=yes`, `confirm_prod_smoke=yes`, `confirm_no_launch_go=yes`.
**Workflow:** [`gate-e-phase3b-manual.yml`](../.github/workflows/gate-e-phase3b-manual.yml) (`workflow_dispatch`-only; 20 route matrix jobs + 1 aggregate job).

**Classification:** **`FAIL` — all 20 route jobs completed naturally (no runner infrastructure non-completion).** **19/20 PASS, 1/20 FAIL** on product harness assertions: **0 × `page-error:1`**, **1 × `DOM_FAIL` (`dom-fail:21067` on `/dashboard`)**. Compared to [attempt 17](./gate-e-phase3b-attempt17-result-2026-07-03.md) (7 PASS / 13 FAIL): **+12 PASS**, all prior **`page-error:1` routes flipped to PASS** after PR #384 deploy alignment.

**PR #384 hydration-fix verification (this run):** **YES — VERIFIED**. All 12 routes that failed with `page-error:1` on attempt 17 now **PASS** (7 `/recruiter/*` + 5 `/company/*`). `/dashboard` **DOM_FAIL remains** (separate root cause, out of scope for #384).

**Public launch: NO-GO · P0: OPEN · Gate F: PENDING**

**Related:** [attempt 17 result](./gate-e-phase3b-attempt17-result-2026-07-03.md) · [PR #384](https://github.com/CzechowskiT/twin/pull/384) · [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## 1. Dispatch

| Field | Value |
|---|---|
| Workflow | `gate-e-phase3b-manual.yml` |
| Trigger | `gh workflow run gate-e-phase3b-manual.yml --ref cursor/phase1-monorepo-scaffold -f confirm_gate_e=yes -f confirm_prod_smoke=yes -f confirm_no_launch_go=yes` |
| Run ID | `28816379338` |
| Run URL | https://github.com/CzechowskiT/twin/actions/runs/28816379338 |
| Head SHA | `2808eabcec3b51fd0692cbf0f1936403d93ce84b` |
| PR #384 merge SHA | `2808eabcec3b51fd0692cbf0f1936403d93ce84b` (same as run SHA) |
| Dispatched | 2026-07-06T19:06:35Z |
| Completed | ≈1h17m |
| Overall run status | `completed`, conclusion `failure` (1 route-level product failure) |
| Jobs | 20 route jobs + 1 aggregate (`success`) |
| Artifacts uploaded | **21/21** named artifacts (`gate-e-phase3b-evidence-<slug>-28816379338` × 20 + aggregate) |

### 1.1 Route-level table (20/20)

| # | Route | Job | Product | Classification | failReasons |
|---|---|---|---|---|---|
| 1 | `/` | success | **PASS** | PASS | — |
| 2 | `/demo` | success | **PASS** | PASS | — |
| 3 | `/for-companies` | success | **PASS** | PASS | — |
| 4 | `/dashboard` | failure | **FAIL** | `DOM_FAIL` | `dom-fail:21067` |
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

**Aggregate job:** `pass=19 fail=1 missing=0` (expected; aggregate job `success`).

---

## 2. PR #384 fix verification — `page-error:1` flip analysis

| Signal | Attempt 17 | Attempt 18 |
|---|---|---|
| PASS / FAIL | 7 / 13 | **19 / 1** |
| `page-error:1` routes | 12 | **0** |
| `/dashboard` DOM_FAIL | yes (`dom-fail:21092`) | yes (`dom-fail:21067`) |
| All `/recruiter/*` (7 routes) | 7/7 FAIL `page-error:1` | **7/7 PASS** |
| All `/company/*` with prior `page-error:1` (5 routes) | 5/5 FAIL | **5/5 PASS** |

### Routes that flipped from FAIL (`page-error:1`) → PASS (12)

1. `/recruiter`
2. `/recruiter/candidates/demo-candidate-001`
3. `/recruiter/candidates/demo-candidate-001/trust`
4. `/recruiter/candidates/demo-candidate-001/team`
5. `/recruiter/candidates/demo-candidate-001/communication`
6. `/recruiter/jobs/demo-role-001/pipeline`
7. `/recruiter/integrations/ats/import-readiness`
8. `/company/candidates/demo-candidate-001`
9. `/company/candidates/demo-candidate-001/trust`
10. `/company/candidates/demo-candidate-001/team`
11. `/company/candidates/demo-candidate-001/communication`
12. `/company/roles/demo-role-001/pipeline`

**Verdict: PR #384 hydration mismatch fix — YES, VERIFIED in production Phase 3B.**

### Remaining failure

**`/dashboard` DOM_FAIL:** **Confirmed** — `dom-fail:21067` (attempt 17: `dom-fail:21092`; same class of failure, different DOM node count). Sibling routes `/dashboard/jobs` and `/dashboard/matches` **PASS**. Not addressed by PR #384; requires separate fix slice.

---

## 3. Artifact evidence (PR #381 still valid)

Route artifacts uploaded with `include-hidden-files: true` (21/21). Per-route zips include `.diagnostics/`, `gate-e-attempt-status.json`, `playwright-report/`, `test-results/`. Aggregate does not show false `missing=20/20`.

---

## 4. Gate F recommendation (Gate F remains **PENDING**)

Phase 3B improved from **7/20 → 19/20 PASS**. Recruiter and company workspace chrome hydration blockers are **cleared**. **Gate F stays PENDING** because `/dashboard` DOM_FAIL remains (1/20 FAIL). Do **not** set Gate F YES or Launch GO from this run.

**Next engineering slice:** root-cause `/dashboard` DOM_FAIL (`dom-fail:21067`) using attempt 18 `.diagnostics` for route `dashboard` — separate authorization if Gate E re-run needed after fix.

---

## 5. Launch stance

**NO-GO** — Phase 3B not fully green (19/20 PASS; `/dashboard` DOM_FAIL). **P0 OPEN.** **Gate F PENDING.** No Launch GO claimed.
