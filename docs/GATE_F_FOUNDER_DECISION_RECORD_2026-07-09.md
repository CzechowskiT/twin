# Gate F Founder Decision Record — 2026-07-09

**Type:** Founder decision record (docs only) — **not launch approval**  
**Branch:** `docs/gate-f-founder-decision-record-2026-07-09` → `cursor/phase1-monorepo-scaffold`  
**Post-merge baseline:** PR #471 @ `09b9963a` (guard/credentials batch) + PR #470 @ `ad7944b8` (Wave B/C activation)

**Related:** [Gate F review package](./GATE_F_FOUNDER_REVIEW_PACKAGE_2026-07-09.md) · [D7 final QA](./SEVEN_DAY_D7_FINAL_QA_2026-07-08.md) · [candidate readiness flow](./CANDIDATE_READINESS_WORKING_FLOW_2026-07-09.md) · [Gate F re-audit](./GATE_F_REAUDIT_RESULT_2026-07-07.md) · [P0 closure](./P0_CLOSURE_DECISION_2026-07-07.md) · [blocker register](./PUBLIC_LAUNCH_BLOCKER_REGISTER_2026-07-13.md)

---

## 1. Current evidence

| Item | Status | Evidence |
|------|--------|----------|
| **P0 performance** | **CLOSED** | [P0 closure decision](./P0_CLOSURE_DECISION_2026-07-07.md) |
| **Gate E (Phase 3B prod)** | **PASS** | Attempt 19 — **20/20** @ `80d981c` |
| **Seven-day D1–D7** | **Complete** | D7 QA **Ready for Gate F review** |
| **Candidate readiness working flow** | **PASS** | PR #429 — checklist → career/evidence/consent |
| **Deploy alignment** | **ACCEPTABLE_DOCS_ONLY_DRIFT** | prod `ae14bfb58fc0`; repo `09b9963a` (PR #471 tooling) |
| **Guard suite** | **PASS** | visible-guard #10 LIVE; Wave B/C 16/16; `verify:production-v3:077` credentialsSet=true |
| **Stabilization soak** | **PARTIAL** | GH #29312315268 PASS 54s — **no 60min evidence** (LB-106 OPEN) |
| **Public health** | **PASS** | `status=ok`, `db_ok=true`, head 077 |
| **Recruiter prod smoke** | **PASS** | 6-route sequential behavioral @ `ae14bfb5` — 2026-07-14 |
| **Authenticated candidate smoke** | **PARTIAL** | API login + Wave B endpoints 200; browser checklist pending |
| **Recruiter / company smoke** | **PASS (recruiter)** | Wave C sequential smoke 6/6 @ 2026-07-14; company not re-run |
| **Delegated apply** | **OFF** | Career compass copy; no live delegated submit CTA |
| **Auto-apply** | **PAUSED** | Homepage + onboarding copy; no live trigger CTA |
| **Launch** | **NO-GO** | Re-audit intentional FAIL row; no founder Launch GO |

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

This document records evidence and **blank founder choices** — it does **not** set Gate F YES or Launch GO.

---

## 2. Open decisions

> **Founder:** check **one** option per row. Record your choice in §3.

### 2.1 Gate F — re-audit sign-off

- [ ] **Gate F = YES** — accept evidence package; authorize doc refresh for PASS rows
- [ ] **Gate F = NO** — blockers remain; hold Gate F
- [ ] **Gate F = PENDING** — no Gate F decision yet (default)

### 2.2 Launch scope

- [ ] **Surface A** — candidate 8 / recruiter 5 / company 4 / marketing public (D7 minimum)
- [ ] **Surface B** — aggressive promotion of pilot modules
- [ ] **Other** — describe: _________________________________

### 2.3 Data room

- [ ] **Invite-only placeholder** (shipped preview)
- [ ] **Signed URLs** — build S3 presigned + access control
- [ ] **Hide** — remove from investor nav until ready

### 2.4 Stripe public checkout

- [ ] **Preview only** (`STRIPE_NOT_PUBLIC_LAUNCH` — shipped)
- [ ] **Enable later** — after separate Launch GO

### 2.5 Microsoft calendar

- [ ] **Coming soon** (shipped D6 badge)
- [ ] **Build live** — Graph OAuth write path

### 2.6 ATS sync

- [ ] **Coming soon** (honest integration rows)
- [ ] **Build live** — bidirectional writeback

### 2.7 Auto-apply

- [ ] **Paused** — remains off prod (default)
- [ ] **Future cohort** — unlock after founder + Gate policy

### 2.8 Delegated apply

- [ ] **OFF** — hard-false gateway (default)
- [ ] **Future pilot** — separate founder/product decision

### 2.9 Logo disclaimer

- [ ] **Accepted YES** — “Representative market context.” (shipped D1)
- [ ] **Accepted NO** — change legal placement

### 2.10 S9 — `ecdsa` PYSEC-2026-1325

- [ ] **ACCEPT WAIVER** — proceed toward Gate F with documented rationale
- [ ] **REQUIRE FIX** — block Gate F YES until patched
- [ ] **KEEP PENDING** — no S9 disposition yet

### 2.11 L6 — DSR self-service delete

- [ ] **PILOT WAIVER OK** — accept for controlled pilot
- [ ] **BLOCK PUBLIC LAUNCH** — require self-service delete before Launch GO
- [ ] **KEEP PENDING** — no L6 disposition yet

---

## 3. Founder decision table

| Decision | YES | NO | PENDING | Founder record |
|----------|:---:|:--:|:-------:|----------------|
| **Gate F** | [ ] | [ ] | [ ] | _________________ |
| **Launch GO** (separate) | [ ] | [ ] | [ ] | _________________ |

**Explicit:**

- [ ] **Launch GO remains a separate decision** — not implied by Gate F YES
- [ ] **No public launch announcement approved in this document**
- [ ] **Delegated apply stays OFF** until separate founder decision
- [ ] **Auto-apply stays PAUSED** on production

**Approver:** _________________________________  
**Decision date:** _________________________________  
**Notes:** _________________________________________

---

## 4. Explicit statements

| Statement | Stance |
|-----------|--------|
| **Gate F YES ≠ Launch GO** | Gate F is harness/evidence sign-off only |
| **Launch GO** | Requires **separate founder decision** |
| **Public launch** | Remains **NO-GO** until explicitly approved |
| **P0** | Remains **CLOSED** |
| **Gate E** | Remains **PASS** (20/20 attempt 19) |
| **Delegated apply** | **OFF** / **NOT LIVE** |
| **Auto-apply** | **PAUSED** |
| **H5c / H5d recruiter invites** | **HOLD** |

**Gate F YES does not grant Launch GO.**  
**Launch GO requires a separate founder decision.**  
**Public launch remains NO-GO** until explicitly approved.

---

## 5. M1–M12 smoke reference

Authenticated prod smoke @ `5ad8a150` — full table in [review package §5](./GATE_F_FOUNDER_REVIEW_PACKAGE_2026-07-09.md#5-manual-smoke-checklist-founder-morning).

**Evidence (2026-07-09 authenticated slice):**

- Candidate login via `/login/candidate` → `/dashboard` renders with live jobs feed.
- Readiness checklist: honest degradation when profile missing (`verified-readiness` 404).
- Career compass: working page with delegated-off copy.
- Evidence vault: auth/profile gate — re-check with seeded demo account.
- Consent: captured at registration; `/consent/gdpr` auth-gated.
- Recruiter/company: sign-in gates only — recruiter inbox token not in agent vault.
- Public investor + illustrative testimonials/case-studies: PASS.
- Delegated apply **OFF** and auto-apply **PAUSED** confirmed in product copy.

| Result | Count | Key items |
|--------|-------|-----------|
| **PASS** | 6 | M1 marketing, M2 login/dashboard, M4 career, M6 consent, M9 health, M12 paused copy |
| **FAIL** | 0 | — |
| **NEEDS_REVIEW** | 6 | M3 checklist (profile), M5 evidence, M7 recruiter, M8 company, M10–M11 marquee |

---

## 6. Launch stance footer

**P0:** CLOSED · **Gate E:** PASS · **Gate F:** PENDING · **Launch:** NO-GO

No Gate F YES decided by this document. No Launch GO claimed by this document.

```
GATE_F_FOUNDER_DECISION_RECORD_DATE: 2026-07-09
BATCH_UPDATE: 2026-07-14T06:45Z
AUTHENTICATED_SMOKE_DATE: 2026-07-09
AUTHENTICATED_SMOKE_REFRESH: 2026-07-14
DEPLOY_ALIGNMENT: ACCEPTABLE_DOCS_ONLY_DRIFT
FRONTEND_COMMIT: ad7944b8 (prod FE)
API_COMMIT: ae14bfb58fc0
REPO_HEAD: 09b9963a
CREDENTIALS_SET: true
STABILIZATION_MONITOR_RUN: 29312315268
STABILIZATION_60MIN_SOAK: OPEN
M_SMOKE_PASS: 6
M_SMOKE_FAIL: 0
M_SMOKE_NEEDS_REVIEW: 6
ENGINEERING_GATE_F_RECOMMENDATION: PENDING
CANONICAL_STANCE: P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO
DELEGATED_APPLY: OFF
AUTO_APPLY: PAUSED
```
