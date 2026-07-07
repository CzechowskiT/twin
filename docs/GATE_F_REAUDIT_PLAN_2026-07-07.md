# Gate F Re-audit Plan — 2026-07-07

**Branch:** `cursor/phase1-monorepo-scaffold` @ post **PR #390** (founder review note)  
**Package type:** Re-audit plan + static guards — **not launch approval**  
**Gate E:** **YES / PASS** — prod Phase 3B **20/20 PASS** (attempt 19)  
**Gate F:** **PENDING** — this plan **prepares** row-by-row re-audit; does **not** set Gate F YES  
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Phase 3B:** **PASS** (prod 20/20 @ attempt 19)

**Related:** [Gate F decision package](./GATE_F_DECISION_PACKAGE_2026-07-06.md) · [founder review note](./GATE_F_FOUNDER_REVIEW_NOTE_2026-07-07.md) · [attempt 19](./gate-e-phase3b-attempt19-result-2026-07-06.md) · [launch gate checklist](./PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md) · [production reality matrix](./PRODUCTION_REALITY_MATRIX_2026-05-27.md)

---

## 1. Purpose

Re-audit the [public launch gate checklist](./PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md) and [production reality matrix](./PRODUCTION_REALITY_MATRIX_2026-05-27.md) **after Gate E attempt 19 PASS (20/20)**. This plan maps every checklist and capability row to current evidence, assigns audit status, and records required founder/operator actions.

**This plan does NOT:**

- Approve **public launch** (**Launch GO**)
- Close **P0 performance** (**P0 CLOSED**)
- Set **Gate F = YES** automatically
- Mutate production, backend, API, auth, DB, or env configuration
- Re-run Phase 3B or local Playwright
- Substitute for **RSS multitab manual smoke** (separate P0 dependency)

Gate E PASS (20/20) is the **evidence baseline** for product harness routes; founder must still complete row-by-row verification and answer the Gate F decision prompt in §8.

---

## 2. Evidence baseline (Gate E attempt 19 — PASS 20/20)

| Field | Value |
|-------|-------|
| **Classification** | **PASS** — 20/20 routes, 0 infrastructure non-completion |
| **Workflow run** | [`28849996684`](https://github.com/CzechowskiT/twin/actions/runs/28849996684) |
| **Head SHA** | `80d981c7336807b7abd44580f101391b6952ff8b` |
| **Dispatched** | 2026-07-07T07:42:34Z |
| **Completed** | 2026-07-07T08:59:03Z |
| **Artifacts** | **21/21** uploaded (20 route + 1 aggregate) |
| **Aggregate** | `pass=20 fail=0 partial=0 missing=0` |
| **Product signals** | 0 × `page-error:1`; `/dashboard` DOM **3356** nodes (≤ 15000 budget); `public-health` `ok` / `db_ok=true` |
| **Detail** | [attempt 19 result](./gate-e-phase3b-attempt19-result-2026-07-06.md) |

**Prior gate chain (unchanged):** Gate B **YES** · Gate C **36/36 PASS** local · Gate D **36/36 PASS** prod · Gate E **20/20 PASS** prod Phase 3B.

---

## 3. Row-by-row audit table

**Legend:** `PASS` = evidence green on current prod SHAs · `FAIL` = blocker documented · `NEEDS_REVIEW` = founder/operator manual verification required · `NOT_APPLICABLE` = out of scope for public launch or superseded by pilot waiver

### 3.1 Public launch gate checklist — Security (S1–S11)

| Source document | Checklist item | Current evidence | Status | Owner | Required next action |
|-----------------|----------------|------------------|--------|-------|----------------------|
| PUBLIC_LAUNCH_GATE_CHECKLIST | **S1** CSP report-only wired, sink live | S1 gate shipped; `/api/v1/csp-report` live | **PASS** | Engineering | Spot-check CSP headers on prod |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **S2** CSP enforce ≥72h, 0 violations | Enforce PR #32 @ `6862999`; post-enforce smoke PASS `2026-06-05T16:20:13Z` | **PASS** | Founder | Confirm no post–attempt 19 CSP regressions |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **S3** LLM mutation rate-limit Layer 2 | `28a50a0` shipped | **PASS** | Engineering | Runtime SHA verify on `80d981c` |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **S4** CV/voice upload rate limits | `ff22f3a` + docs | **PASS** | Engineering | Re-run upload limit tests if API SHA drift |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **S5** Stripe `event.id` dedup | Alembic `050_stripe_webhook_events` on prod (2026-05-29) | **PASS** | Founder/ops | Read-only `alembic_version` re-check |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **S6** Auto-apply sweep gate 10+ tests | `test_auto_apply_trigger_sweep_admin_gate.py` | **PASS** | Engineering | `pytest` on scaffold HEAD |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **S7** Public health regression tests | `test_public_health_regression.py` | **PASS** | Engineering | CI smoke green |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **S8** No secrets in repo | One-shot verified 2026-05-29 | **NEEDS_REVIEW** | Founder | `gh secret list` + `git grep` before launch |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **S9** No HIGH CVEs in baseline | Baseline doc + safety/npm audit | **NEEDS_REVIEW** | Founder | Re-run `safety check` + `npm audit` |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **S10** OAuth callback rate-limit | `1efd8b1` on auth + calendar + ATS | **PASS** | Engineering | Runtime SHA verify |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **S10b** Mutation caps + saved-jobs | `1c731fc` + tests | **PASS** | Engineering | O2/O6 SHA alignment check |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **S10c** Cookie consent + recruiter inbox limits | `67a22dc` + tests | **PASS** | Engineering | O2/O6 SHA alignment check |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **S11** Verified Candidate readiness gate | Founder prod smoke 2026-05-29; attempt 19 `/dashboard` 0 × `page-error:1` | **PASS** | Founder | Optional spot-check readiness card post–#387 |

### 3.2 Public launch gate checklist — Operational (O1–O10)

| Source document | Checklist item | Current evidence | Status | Owner | Required next action |
|-----------------|----------------|------------------|--------|-------|----------------------|
| PUBLIC_LAUNCH_GATE_CHECKLIST | **O1** Smoke workflow green (latest 5 commits) | PR #390 merge CI SUCCESS (backend-smoke, frontend-build) | **NEEDS_REVIEW** | Ops | `gh run list --workflow smoke.yml --limit 5` on prod SHAs |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **O2** `public-health` ok + `db_ok=true` | Attempt 19: `ok` / `db_ok=true` @ SHA `80d981c` | **PASS** | Ops | Refresh checklist row SHA from `df15618` → `80d981c` |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **O3** Celery worker active | celery-status endpoint documented green | **NEEDS_REVIEW** | Ops | `curl …/health/celery-status` on current prod |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **O4** Stripe webhook reachable | Audit doc + signature gate | **PASS** | Engineering | No change unless billing deploy |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **O5** Calendar OAuth (Google + Microsoft; Apple partial) | Google FULL prod smoke 2026-05-29; Microsoft LIVE; Apple partial — waiver `2026-06-03` | **NEEDS_REVIEW** | Founder | Confirm copy does not overpromise Apple; waiver still valid |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **O6** Vercel canonical alias + drift guard | Drift documented; canonical project correct | **NEEDS_REVIEW** | Ops | `bash scripts/check-vercel-canonical-alias.sh` |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **O7** Backup/restore exercised | Staging drill PASS 2026-06-01 | **PASS** | Founder | O7 re-drill post–#108/#110 noted BLOCKED in matrix — confirm still acceptable |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **O8** Incident response runbook | `INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` | **PASS** | Engineering | Named on-call current |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **O8b** Launch-day monitoring runbook | `LAUNCH_DAY_MONITORING_ROLLBACK_RUNBOOK_2026-06-04.md` | **PASS** | Engineering | Records public NO-GO — still accurate |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **O9** Security risk register current | `SECURITY_RISK_REGISTER_2026-05-27.md` | **PASS** | Engineering | Refresh if new risks since attempt 19 |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **O10** Vercel canonical re-link fixed or workaround | Workaround documented | **NEEDS_REVIEW** | Ops | Reconcile with O6 drift check |

### 3.3 Public launch gate checklist — Legal / privacy (L1–L7)

| Source document | Checklist item | Current evidence | Status | Owner | Required next action |
|-----------------|----------------|------------------|--------|-------|----------------------|
| PUBLIC_LAUNCH_GATE_CHECKLIST | **L1** GDPR consent on signup | Register + `/gdpr-consent` | **PASS** | Engineering | — |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **L2** Cookie consent banner PL+EN | `COOKIE_CONSENT.md` + component | **PASS** | Engineering | — |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **L3** Privacy + Terms smoke | Playwright smoke routes | **PASS** | Engineering | Attempt 19 includes `/privacy`, `/terms` routes |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **L4** Scraping compliance terms | `SCRAPING_COMPLIANCE.md` | **PASS** | Engineering | — |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **L5** Auto-apply consent auditable | Model + API tests | **PASS** | Engineering | Auto-apply **PAUSED** — policy not harness |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **L6** Data subject export/delete | Export LIVE; delete manual; waiver `2026-06-03` | **NEEDS_REVIEW** | Founder | Pilot waiver OK; self-service delete future — confirm for public launch |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **L7** Placement verification self-serve | `PLACEMENT_VERIFICATION.md` | **PASS** | Engineering | — |

### 3.4 Public launch gate checklist — Pilot readiness (P1–P7)

| Source document | Checklist item | Current evidence | Status | Owner | Required next action |
|-----------------|----------------|------------------|--------|-------|----------------------|
| PUBLIC_LAUNCH_GATE_CHECKLIST | **P1** Controlled pilot operating manual | `CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` | **PASS** | Engineering | — |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **P2** Pilot intake + tracker | Template + `PILOT_TRACKER.csv` | **PASS** | Founder | — |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **P3** Pilot offer copy reviewed | `PILOT_OFFER_FINAL.md` | **PASS** | Founder | — |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **P4** Pilot pricing verified | B2B pricing docs | **PASS** | Founder | — |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **P5** Pilot kill-switch tested | Auto-apply sweep admin gate tests | **PASS** | Engineering | — |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **P6** Founder authenticated prod smoke | 8/8 routes PASS 2026-05-29; attempt 19 deep-link routes 0 × `page-error:1` | **NEEDS_REVIEW** | Founder | Re-smoke authenticated subpages post–PR #384/#387 |
| PUBLIC_LAUNCH_GATE_CHECKLIST | **P7** Limited recruiter pilot pack | H5b PASS; H5c/H5d **HOLD**; 0/3–5 invited | **NEEDS_REVIEW** | Founder | Public launch blocked; pilot GO unchanged |

### 3.5 Production reality matrix — Capability claims (selected rows)

| Source document | Checklist item | Current evidence | Status | Owner | Required next action |
|-----------------|----------------|------------------|--------|-------|----------------------|
| PRODUCTION_REALITY_MATRIX | Public marketing pages | Attempt 19: `/`, `/demo`, `/for-companies`, `/for-recruiters` PASS | **PASS** | Engineering | Copy & claims audit still required |
| PRODUCTION_REALITY_MATRIX | Status / public-health proxy | Attempt 19 `ok` / `db_ok=true` @ `80d981c` | **PASS** | Ops | Update matrix stale SHA refs |
| PRODUCTION_REALITY_MATRIX | Candidate dashboard `/dashboard` | Attempt 19: DOM **3356** nodes; 0 × `page-error:1` | **PASS** | Engineering | PR #387 dashboard-dom-budget |
| PRODUCTION_REALITY_MATRIX | Workspace deep-link routes (20 Phase 3B) | Attempt 19: **20/20 PASS**, aggregate `pass=20` | **PASS** | Engineering | No further isolated-runner unless regression |
| PRODUCTION_REALITY_MATRIX | Auto-apply nightly | `nightly_auto_apply_beat_enabled=false` | **PASS** | Ops | Policy **PAUSED** — correct for launch NO-GO |
| PRODUCTION_REALITY_MATRIX | Delegated apply | Hard-false gateway; NOT LIVE | **PASS** | Engineering | No overclaim in copy |
| PRODUCTION_REALITY_MATRIX | Recruiter calendar sync | Placeholder — **NOT LIVE** | **PASS** | Founder | Confirm marketing does not claim live sync |
| PRODUCTION_REALITY_MATRIX | Recruiter inbox + H5 cohort | R1–R5 PASS; H5c/H5d **HOLD** | **NEEDS_REVIEW** | Founder | External invites **not sent** — correct |
| PRODUCTION_REALITY_MATRIX | P0 browser memory / multi-tab | Phase 3B CDP heap PASS; **RSS multitab manual NOT documented** | **NEEDS_REVIEW** | Founder | **Separate P0 track** — see §7 |
| PRODUCTION_REALITY_MATRIX | Public launch announcement | Gate checklist + matrix | **FAIL** | Founder | Public **NO-GO** — founder limited-launch decision pending |
| PRODUCTION_REALITY_MATRIX | CSP enforce mode | S2 PASS post-enforce 2026-06-05 | **PASS** | Founder | Matrix header stale "READY FOR FOUNDER DECISION" — refresh |
| PRODUCTION_REALITY_MATRIX | Lighthouse / perf budgets | Not re-run post–PR #387 | **NEEDS_REVIEW** | Founder | P0-4 criterion — separate from Gate F harness |

### 3.6 Gate E harness cross-cut (attempt 19 product signals)

| Source document | Checklist item | Current evidence | Status | Owner | Required next action |
|-----------------|----------------|------------------|--------|-------|----------------------|
| gate-e-phase3b-attempt19 | All 20 Phase 3B routes | Run `28849996684`, SHA `80d981c`, **20/20 PASS** | **PASS** | Engineering | Archive diagnostics; monitor for regression |
| gate-e-phase3b-attempt19 | Hydration `page-error:1` | **0** routes with `page-error:1` (attempt 18→19) | **PASS** | Engineering | PR #384 hydration fix held |
| gate-e-phase3b-attempt19 | `/dashboard` DOM budget | **3356** nodes ≤ 15000 (was 21094) | **PASS** | Engineering | PR #387 dashboard-dom-budget |
| gate-e-phase3b-attempt19 | `frontend_commit` alignment | Aligned @ `80d981c` | **PASS** | Ops | Record in launch checklist O2 row |

---

## 4. Audit summary (draft — not founder-approved)

| Status | Count (checklist + matrix rows above) |
|--------|---------------------------------------|
| **PASS** | 35 |
| **NEEDS_REVIEW** | 14 |
| **FAIL** | 1 (public launch announcement — intentional NO-GO) |
| **NOT_APPLICABLE** | 0 |

**Draft verdict:** Product harness and security baseline largely **PASS** on attempt 19 evidence. **NEEDS_REVIEW** rows require founder/operator manual steps before Gate F may move to YES. **Public launch remains NO-GO.**

This summary is **informational only** — not Gate F YES, not Launch GO.

---

## 5. Explicit non-goals

| Claim | Stance |
|-------|--------|
| **Launch GO** | **NOT claimed** — public launch **NO-GO** |
| **P0 CLOSED** | **NOT claimed** — P0 **OPEN** |
| **Gate F YES** | **NOT claimed** — Gate F **PENDING** |
| Phase 3B re-run | **NOT in scope** — attempt 19 PASS sufficient unless regression |
| Backend/API/auth/DB/env mutation | **FORBIDDEN** |
| Playwright / prod mutation | **FORBIDDEN** in this package |

No Launch GO. No P0 CLOSED. No Gate F YES claimed by this document.

---

## 6. Gate F decision outputs (scenarios)

### 6.1 Gate F YES candidate

Founder accepts attempt 19 evidence and completes **NEEDS_REVIEW** rows (§3) with documented PASS/FAIL updates. Engineering publishes refreshed checklist + matrix rows on current prod SHAs. **Still not Launch GO** — separate founder decision.

### 6.2 Gate F NO

Founder identifies blockers in §3 (e.g. stale O6/O10 drift, L6/O5 waiver insufficient for public launch, P6 not re-smoked). Gate F stays **NO**; re-audit paused; blockers logged in decision record.

### 6.3 Gate F PENDING (default)

No founder answer yet. This plan is **preparatory** — row-by-row table ready for execution after founder authorizes re-audit per [decision package §6](./GATE_F_DECISION_PACKAGE_2026-07-06.md).

---

## 7. P0 dependency (separate from Gate F)

**RSS multitab manual smoke** on prod workspace routes (real Chrome 8–12 tabs) remains a **separate founder track** per [P0_BROWSER_MEMORY_MULTITAB_PERFORMANCE_2026-06-16.md](./P0_BROWSER_MEMORY_MULTITAB_PERFORMANCE_2026-06-16.md).

| Item | Gate E attempt 19 | P0 closure |
|------|-------------------|------------|
| Phase 3B CDP heap harness | **MET** — 20/20 PASS | Necessary but **not sufficient** |
| RSS multitab manual smoke | **NOT MET** — not documented | **Required** before P0 CLOSED |
| Lighthouse / perf budgets post–#387 | **NOT MET** | Founder or gated perf pass |

P0 cannot be closed without RSS multitab manual smoke evidence and a **separate founder P0 closure record**. Gate F YES does **not** close P0.

---

## 8. Founder decision required

> **Based on the re-audit evidence, should Gate F move to YES, NO, or remain PENDING?**

| Answer | Meaning |
|--------|---------|
| **Gate F = YES** | Founder accepts re-audit completion; authorize doc refresh for PASS rows; **still not Launch GO** |
| **Gate F = NO** | Blockers remain; hold re-audit |
| **Gate F = PENDING** | No action (default) |

### Explicit non-conflation

- **Gate F = YES is not Launch GO.**
- **P0 remains OPEN** until RSS multitab manual smoke and separate P0 closure.
- **Launch GO** requires P0 closure **and** Gate F re-audit **and** separate public-launch founder decision.

### Decision record template

```
Gate F Re-audit Decision — 2026-07-07
=====================================
Founder decision date: ____________________
Approver: _________________________________

Gate F (re-audit complete):     PENDING | YES | NO

Gate E attempt 19 (20/20) accepted:  PENDING | YES | NO

P0 performance:                  OPEN | CLOSED  (separate)

Public launch:                   NO-GO | GO     (separate)

NEEDS_REVIEW rows completed:     yes / no — list: ___________

Notes:
_____________________________________________
_____________________________________________
```

---

## 9. Recommended execution order (after founder Gate F = YES)

1. Refresh O2/O6/O10 prod SHA and smoke history on checklist rows.
2. Complete S8/S9 security re-runs.
3. Founder authenticated P6 spot-check post–#384/#387.
4. Copy & claims audit against [PUBLIC_LAUNCH_COPY_CLAIMS_AUDIT_2026-06-04.md](./PUBLIC_LAUNCH_COPY_CLAIMS_AUDIT_2026-06-04.md).
5. Publish updated gate stance doc — **still NO-GO** until P0 + launch decisions.
6. **Separately:** RSS multitab manual smoke for P0 track.

---

## 10. Launch stance footer

**Public launch: NO-GO · P0: OPEN · Gate F: PENDING · Phase 3B: PASS (20/20 attempt 19)**

No Launch GO. No P0 CLOSED. No Gate F YES claimed by this document.
