# Gate E Phase 3B — Attempt 16 (route-sharded, isolated runner) — FAIL (13/20 product failures, 7/20 PASS) — 2026-07-06

**Branch at run:** `cursor/phase1-monorepo-scaffold` @ `2898dd020deceef0cc415b64acbe1c4b71074e65` (`2898dd02`, merge of PR #380 — attempt 15 result doc only; **does not include** PR #381 `include-hidden-files: true` on `actions/upload-artifact@v4`, which remains on branch `ci/gate-e-upload-hidden-diagnostics` / commit `8be88c5b` at dispatch time).
**Founder decision:** Founder authorization: **YES** for Gate E Phase 3B route-sharded isolated-runner dispatch **attempt 16** — `confirm_gate_e=yes`, `confirm_prod_smoke=yes`, `confirm_no_launch_go=yes`.
**Workflow:** [`gate-e-phase3b-manual.yml`](../.github/workflows/gate-e-phase3b-manual.yml) (`workflow_dispatch`-only; 20 route matrix jobs + 1 aggregate job).

**Classification:** **`FAIL` — all 20 route jobs completed naturally (no runner infrastructure non-completion).** **7/20 PASS, 13/20 FAIL** on product harness assertions: **12 × `page-error:1`**, **1 × `DOM_FAIL` (`dom-fail:21092` on `/dashboard`)**. Compared to [attempt 15](./gate-e-phase3b-attempt15-result-2026-07-03.md) (8 PASS / 12 FAIL): three routes **flipped** — `/company/candidates/demo-candidate-001` and `/company/roles/demo-role-001/pipeline` regressed to FAIL; `/company/candidates/demo-candidate-001/trust` improved to PASS.

**PR #381 artifact-upload verification (this run):** **NOT EXERCISED** — CI upload step logged `include-hidden-files: false`; downloaded route artifacts contain **no** `frontend/.diagnostics/**` or `gate-e-attempt-status.json`; aggregate JSON reports **20/20 `missing`**. See §4.

**Public launch: NO-GO · P0: OPEN · Gate F: PENDING**

**Related:** [attempt 15 result](./gate-e-phase3b-attempt15-result-2026-07-03.md) · [route-sharding plan](./GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03.md) · [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## 1. Dispatch

| Field | Value |
|---|---|
| Workflow | `gate-e-phase3b-manual.yml` |
| Trigger | `gh workflow run gate-e-phase3b-manual.yml -f confirm_gate_e=yes -f confirm_prod_smoke=yes -f confirm_no_launch_go=yes` |
| Run ID | `28785075027` |
| Run URL | https://github.com/CzechowskiT/twin/actions/runs/28785075027 |
| Head SHA | `2898dd020deceef0cc415b64acbe1c4b71074e65` |
| Dispatched | 2026-07-06T10:29:51Z |
| Completed | 2026-07-06T11:47:01Z (≈1h17m) |
| Overall run status | `completed`, conclusion `failure` (13 route-level product failures) |
| Jobs | 20 route jobs + 1 aggregate (`success`) |
| Artifacts uploaded | **21/21** named artifacts (`gate-e-phase3b-evidence-<slug>-28785075027` × 20 + aggregate) |

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
| 15 | `/company/dashboard` | failure | **FAIL** | PASS¹ | `page-error:1` |
| 16 | `/company/candidates/demo-candidate-001` | failure | **FAIL** | PASS¹ | `page-error:1` |
| 17 | `/company/candidates/demo-candidate-001/trust` | success | **PASS** | PASS | — |
| 18 | `/company/candidates/demo-candidate-001/team` | failure | **FAIL** | PASS¹ | `page-error:1` |
| 19 | `/company/candidates/demo-candidate-001/communication` | failure | **FAIL** | PASS¹ | `page-error:1` |
| 20 | `/company/roles/demo-role-001/pipeline` | failure | **FAIL** | PASS¹ | `page-error:1` |

¹ Harness `classification` stays default `"PASS"` for `page-error:N` (see attempt 15 §1.1 footnote); authoritative field is `status` = `FAIL` from Playwright assertion text.

**Totals: 7 PASS, 13 FAIL, 0 MISSING (job-level), 0 infrastructure non-completion.**

**Aggregate job (`gate-e-phase3b-route-aggregate.json`):** `pass=0 fail=0 missing=20` — **not authoritative** for this attempt because hidden diagnostics were omitted from uploaded zips (§4).

---

## 2. Product findings (vs attempt 15)

| Signal | Attempt 15 | Attempt 16 |
|---|---|---|
| PASS / FAIL | 8 / 12 | 7 / 13 |
| `page-error:1` routes | 11 | 12 |
| `/dashboard` DOM_FAIL | yes (`dom-fail:21100`) | yes (`dom-fail:21092`) |
| All `/recruiter/*` (7 routes) | 7/7 FAIL `page-error:1` | 7/7 FAIL `page-error:1` |
| `/company/candidates/demo-candidate-001` (base) | PASS | **FAIL** `page-error:1` |
| `/company/candidates/demo-candidate-001/trust` | FAIL | **PASS** |
| `/company/roles/demo-role-001/pipeline` | PASS | **FAIL** `page-error:1` |

**`page-error:1` routes (12):** `/recruiter`, all six other `/recruiter/*` routes in matrix, `/company/dashboard`, `/company/candidates/demo-candidate-001`, `/company/candidates/demo-candidate-001/team`, `/company/candidates/demo-candidate-001/communication`, `/company/roles/demo-role-001/pipeline`.

**`/dashboard` DOM_FAIL:** **Confirmed** — Playwright log: `Error: /dashboard: DOM_FAIL dom-fail:21092` (threshold 15000). Sibling `/dashboard/jobs` and `/dashboard/matches` **PASS**.

**Exact `pageerror` message text:** still **not** in downloadable artifacts on this SHA (hidden `.diagnostics` not in zip).

---

## 3. Preconditions (all 20 routes)

Same as attempt 15: hard-ban inputs, static guards, `workers=1` / `retries=0`, public-health 10/10, HTTP smoke 10/10, pre-run cleanup, canonical command ran to completion on every route (exit 0 or assertion failure only).

---

## 4. Artifact / PR #381 hidden-diagnostics fix

| Check | Result |
|---|---|
| Workflow SHA includes `include-hidden-files: true` | **NO** (`2898dd02` predates `8be88c5b`) |
| Upload step in run logs | `include-hidden-files: false` |
| Route zip contains `.diagnostics/` | **NO** (local extract under `.gate-e-attempt16-artifacts/`, not committed) |
| Route zip contains `gate-e-attempt-status.json` | **NO** |
| Aggregate marks real PASS/FAIL instead of MISSING | **NO** — all 20 `artifactFound: false`, totals `missing=20` |

**Verdict: PR #381 fix — NOT VERIFIED on attempt 16** (wrong SHA). **Hidden diagnostics upload fix for this run: NO** (same omission class as attempt 15 §4).

**Local diagnostics paths (extract only, gitignored):** `.gate-e-attempt16-artifacts/gate-e-phase3b-evidence-<slug>-28785075027/` — playwright-report + test-results only per route; aggregate at `.gate-e-attempt16-artifacts/gate-e-phase3b-evidence-aggregate-28785075027/gate-e-phase3b-route-aggregate.json`.

---

## 5. Gate F recommendation (Gate F remains **PENDING**)

Do **not** set Gate F YES. Route-sharded evidence is **repeatable** and **complete at job level**, but **aggregate automation and rich diagnostics remain blocked** until a dispatch at SHA **≥ PR #381 merge** proves `include-hidden-files: true`. Product blockers unchanged: prod `page-error:1` on recruiter/company surfaces and `/dashboard` DOM budget breach.

**Next dispatch:** merge PR #381 (or equivalent) to `cursor/phase1-monorepo-scaffold`, then **attempt 17** on that SHA to validate artifact aggregation before prioritizing `page-error` root-cause work.

---

## 6. Launch stance

**NO-GO** — Phase 3B not green (7/20 PASS). **P0 OPEN.** **Gate F PENDING.** No Launch GO claimed.
