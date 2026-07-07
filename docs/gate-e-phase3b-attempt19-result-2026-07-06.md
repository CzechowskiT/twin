# Gate E Phase 3B — Attempt 19 (route-sharded, isolated runner) — PASS (20/20) — 2026-07-07

**Branch at run:** `cursor/phase1-monorepo-scaffold` @ `80d981c7336807b7abd44580f101391b6952ff8b` (`80d981c` — scaffold HEAD after **PR #387** DOM budget fix + **PR #386** attempt-18 docs).
**Founder decision:** Founder authorization: **YES** for Gate E Phase 3B route-sharded isolated-runner dispatch **attempt 19** — `confirm_gate_e=yes`, `confirm_prod_smoke=yes`, `confirm_no_launch_go=yes`.
**Workflow:** [`gate-e-phase3b-manual.yml`](../.github/workflows/gate-e-phase3b-manual.yml) (`workflow_dispatch`-only; 20 route matrix jobs + 1 aggregate job).

**Classification:** **`PASS` — all 20 route jobs completed naturally with product harness PASS.** **20/20 PASS**, **0 × `page-error:1`**, **0 × `DOM_FAIL`**. Compared to [attempt 18](./gate-e-phase3b-attempt18-result-2026-07-06.md) (19/20 PASS, `/dashboard` `dom-fail:21094`): **`/dashboard` DOM budget fixed** (`domNodes` **3356** ≤ **15000**).

**PR #387 merge + deploy:** **YES — merged in this pipeline**; Vercel `frontend_commit` aligned to **PR #387 merge SHA** (`b009c552`) before dispatch; prod later advanced to `80d981c` (docs-only #386 atop #387).

**Public launch: NO-GO · P0: OPEN · Gate F: PENDING**

**Related:** [attempt 18 result](./gate-e-phase3b-attempt18-result-2026-07-06.md) · [PR #387](https://github.com/CzechowskiT/twin/pull/387) · [PR #386](https://github.com/CzechowskiT/twin/pull/386) · [route-sharding plan](./GATE_E_PHASE3B_ROUTE_SHARDING_PLAN_2026-07-03.md)

---

## 1. PR #387 / #386 merge + Vercel alignment

| Field | Value |
|---|---|
| PR #387 | [#387](https://github.com/CzechowskiT/twin/pull/387) — `fix: reduce dashboard dom size for gate e` |
| PR #387 merge SHA | `b009c552d2dd9cb8d10ae8a40bfd64ee5dfa1812` |
| PR #387 merged at | 2026-07-07T07:40:10Z |
| PR #387 CI at merge | `backend-smoke` SUCCESS, `frontend-build` SUCCESS, Vercel SUCCESS |
| PR #387 scope | Frontend-only; **no** backend/API/auth/DB/env/`smoke.yml` changes; `PHASE3B_DOM_FAIL` remains **15000**; `/dashboard` remains in Phase 3B registry |
| PR #386 | [#386](https://github.com/CzechowskiT/twin/pull/386) — attempt-18 docs (merged immediately after #387) |
| PR #386 merge SHA | `80d981c7336807b7abd44580f101391b6952ff8b` |

**Vercel / prod frontend alignment (pre-dispatch, post-#387):**

| Check | Value |
|---|---|
| Poll target (`frontend_commit`) | `b009c552d2dd9cb8d10ae8a40bfd64ee5dfa1812` (PR #387 merge SHA) |
| Poll URL | `GET https://twin-sooty.vercel.app/api/public-health` |
| Aligned at | 2026-07-07T07:42:23Z (poll attempt 2, ~75s interval) |
| `public-health` `status` / `db_ok` | `ok` / `true` |
| `api_commit` (Railway) | `6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa` (expected divergence after frontend-only PR) |

**At Gate E run time:** preflight recorded `frontendCommitActual` = `80d981c7336807b7abd44580f101391b6952ff8b` (Vercel had picked up docs-only #386; **includes #387 DOM fix**), `frontendCommitMismatch: false`.

---

## 2. Dispatch

| Field | Value |
|---|---|
| Workflow | `gate-e-phase3b-manual.yml` |
| Trigger | `gh workflow run gate-e-phase3b-manual.yml --ref cursor/phase1-monorepo-scaffold -f confirm_gate_e=yes -f confirm_prod_smoke=yes -f confirm_no_launch_go=yes` |
| Run ID | `28849996684` |
| Run URL | https://github.com/CzechowskiT/twin/actions/runs/28849996684 |
| Head SHA (workflow checkout) | `80d981c7336807b7abd44580f101391b6952ff8b` |
| PR #387 merge SHA (product fix) | `b009c552d2dd9cb8d10ae8a40bfd64ee5dfa1812` |
| Dispatched | 2026-07-07T07:42:34Z |
| Completed | 2026-07-07T08:59:03Z (≈1h17m wall; includes runner queue) |
| Overall run status | `completed`, conclusion **`success`** |
| Jobs | 20 route jobs (all success) + 1 aggregate (success) |
| Artifacts uploaded | **21/21** (`gate-e-phase3b-evidence-<slug>-28849996684` × 20 + aggregate) |

### 2.1 Route-level table (20/20)

| # | Route | Job | Product | Classification | Notes |
|---|---|---|---|---|---|
| 1 | `/` | success | **PASS** | PASS | domNodes=2607 |
| 2 | `/demo` | success | **PASS** | PASS | domNodes=2006 |
| 3 | `/for-companies` | success | **PASS** | PASS | domNodes=1952 |
| 4 | `/dashboard` | success | **PASS** | PASS | domNodes=**3356** (was **21094** in attempt 18) |
| 5 | `/dashboard/jobs` | success | **PASS** | PASS | domNodes=1392 |
| 6 | `/dashboard/matches` | success | **PASS** | PASS | domNodes=5714 |
| 7 | `/profile` | success | **PASS** | PASS | domNodes=2495 |
| 8 | `/recruiter` | success | **PASS** | PASS | domNodes=982 |
| 9 | `/recruiter/candidates/demo-candidate-001` | success | **PASS** | PASS | domNodes=937 |
| 10 | `/recruiter/candidates/demo-candidate-001/trust` | success | **PASS** | PASS | domNodes=888 |
| 11 | `/recruiter/candidates/demo-candidate-001/team` | success | **PASS** | PASS | domNodes=982 |
| 12 | `/recruiter/candidates/demo-candidate-001/communication` | success | **PASS** | PASS | domNodes=916 |
| 13 | `/recruiter/jobs/demo-role-001/pipeline` | success | **PASS** | PASS | domNodes=955 |
| 14 | `/recruiter/integrations/ats/import-readiness` | success | **PASS** | PASS | domNodes=1025 |
| 15 | `/company/dashboard` | success | **PASS** | PASS | domNodes=1002 |
| 16 | `/company/candidates/demo-candidate-001` | success | **PASS** | PASS | domNodes=949 |
| 17 | `/company/candidates/demo-candidate-001/trust` | success | **PASS** | PASS | domNodes=901 |
| 18 | `/company/candidates/demo-candidate-001/team` | success | **PASS** | PASS | domNodes=995 |
| 19 | `/company/candidates/demo-candidate-001/communication` | success | **PASS** | PASS | domNodes=929 |
| 20 | `/company/roles/demo-role-001/pipeline` | success | **PASS** | PASS | domNodes=968 |

**Totals: 20 PASS, 0 FAIL, 0 PARTIAL, 0 MISSING (job-level).**

**Aggregate job (`gate-e-phase3b-route-aggregate.json`):** `pass=20 fail=0 partial=0 missing=0` — **authoritative** on this SHA (all `artifactFound: true`).

---

## 3. `/dashboard` DOM analysis vs attempt 18

| Signal | Attempt 18 (`28845161178`) | Attempt 19 (`28849996684`) |
|---|---|---|
| `/dashboard` product status | **FAIL** (`DOM_FAIL`) | **PASS** |
| `domNodes` | **21094** (`dom-fail:21094`) | **3356** |
| `page-error:1` (all routes) | **0** | **0** |
| Fix | — | **PR #387** — home dashboard preview caps (`dashboard-dom-budget.ts`) |

**Diagnostics path:** `.gate-e-attempt19-artifacts/gate-e-phase3b-evidence-dashboard-28849996684/.diagnostics/phase3b-controlled-multitab-dashboard.json` — `status: PASS`, `pageErrors: []`, `domNodes: 3356`.

**Verdict on PR #387 hypothesis:** **CONFIRMED** — `/dashboard` DOM budget passes without raising `PHASE3B_DOM_FAIL` (still **15000**).

---

## 4. Artifact verification

| Check | Result |
|---|---|
| Route zip contains `.diagnostics/` | **YES** (20/20) |
| Aggregate marks PASS/FAIL | **YES** — `pass=20 fail=0 missing=0` |
| Local extract (gitignored) | `.gate-e-attempt19-artifacts/` |

---

## 5. Gate E Phase 3B verdict

**Gate E Phase 3B prod browser harness: PASS (20/20 routes).** This closes the attempt-18 `/dashboard` DOM blocker on prod at the aligned frontend.

---

## 6. Gate F recommendation (Gate F remains **PENDING**)

Phase 3B route harness is green, but **founder launch bar / P0 closure** is out of scope for this run. **Gate F stays PENDING** pending explicit founder Gate F review and remaining P0 items. Do **not** set Gate F YES or Launch GO from this document alone.

---

## 7. Launch stance

**NO-GO** for public launch (founder stance unchanged). **P0 OPEN.** **Gate F PENDING.** No Launch GO or P0 CLOSED claimed.
