# Gate C Browser Validation Result — 2026-06-28

**Branch at run:** `cursor/phase1-monorepo-scaffold` @ `62138dc`  
**Founder decision:** Gate C = **YES** — local browser only (`test:p0-no-headless-final-state-browser`)  
**Gate D/E/F:** **PENDING**  
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Phase 3B:** **HARD BLOCKED**

---

## 1. Deploy alignment (Part A)

| Field | Value |
|-------|-------|
| **repo_head** | `62138dccd986bb068e717a9dafee38f822e94c66` |
| **prod_frontend_commit** | `62138dccd986bb068e717a9dafee38f822e94c66` |
| **prod_api_commit** | `6d6d1e54f85f8f00fe1727f32cef700e9c2a20aa` |
| **public-health** | `status=ok`, `db_ok=true` |
| **alignment_status** | **ALIGNED** — prod FE matches scaffold HEAD (PR #332 merge) |

### HTTP smoke (14 routes, prod read-only)

All **HTTP 200** on `https://twin-sooty.vercel.app`:

| # | Route | Status |
|---|-------|--------|
| 1 | `/` | 200 |
| 2 | `/how-it-works` | 200 |
| 3 | `/demo` | 200 |
| 4 | `/status` | 200 |
| 5 | `/login/candidate` | 200 |
| 6 | `/register/candidate` | 200 |
| 7 | `/dashboard` | 200 |
| 8 | `/dashboard/calendar` | 200 |
| 9 | `/recruiter/inbox` | 200 |
| 10 | `/recruiter/calendar` | 200 |
| 11 | `/recruiter/jobs` | 200 |
| 12 | `/privacy` | 200 |
| 13 | `/terms` | 200 |
| 14 | `/api/public-health` | 200 |

---

## 2. Static gates (Part C) — all PASS before browser

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run test:p0-no-headless-final-state` | **PASS** (10/10) |
| `npm run test:p0-route-weight-inventory` | **PASS** (7/7) |
| `npm run test:p0-performance-guardrails` | **PASS** (15/15) |
| `npm run test:phase3b-controlled-multitab` | **PASS** (9/9) |
| `npm run test:p0-browser-memory-multitab-performance` | **PASS** (16/16) |
| `npm run test:hiring-journey` | **PASS** (25/25) |
| `npm run test:landing-auth-shell` | **PASS** (6/6) |
| `npm run test:homepage-nav` | **PASS** (13/13) |
| `npm run test:persona-workspace-gate-auth` | **PASS** (3/3) |
| `npm run build` | **PASS** |

---

## 3. Local browser validation (Part D) — **PASS**

**Command:**

```bash
cd frontend
PLAYWRIGHT_ENABLE_BROWSER_TESTS=1 PLAYWRIGHT_ENABLE_WEBSERVER=1 \
  npm run test:p0-no-headless-final-state-browser -- --workers=1
```

| Field | Value |
|-------|-------|
| **Mode** | Local only (`PLAYWRIGHT_ENABLE_WEBSERVER=1`) — **no prod browser** |
| **Workers** | 1 |
| **Routes** | 36 (`P0_CRITICAL_ALL_ROUTES`) |
| **Total / pass / fail** | **36 / 36 / 0** |
| **Duration** | **44.5s** |
| **Port / base URL** | `http://127.0.0.1:3000` (Playwright webServer via `npm run start:e2e`) |
| **Traces** | `trace: on-first-retry` — none (no retries) |
| **Screenshots** | none (pass, no failure artifacts) |

### Failure category counts (A–G)

| Cat | Meaning | Count |
|-----|---------|-------|
| A | Stuck skeleton final state | 0 |
| B | Chrome-only shell (no main) | 0 |
| C | Route timeout | 0 |
| D | Auth mismatch / wrong gate | 0 |
| E | Stale JWT regression | 0 |
| F | HTTP 404 / blank title | 0 |
| G | Other | 0 |

### Per-route result (36/36 PASS)

| # | Route | Result | Duration |
|---|-------|--------|----------|
| 1 | `/` | PASS | 640ms |
| 2 | `/demo` | PASS | 819ms |
| 3 | `/for-companies` | PASS | 12.6s |
| 4 | `/dashboard` | PASS | 1.1s |
| 5 | `/dashboard/jobs` | PASS | 621ms |
| 6 | `/dashboard/matches` | PASS | 669ms |
| 7 | `/dashboard/trust` | PASS | 670ms |
| 8 | `/dashboard/trust/controls` | PASS | 939ms |
| 9 | `/profile` | PASS | 686ms |
| 10 | `/dashboard/profile` | PASS | 646ms |
| 11 | `/dashboard/cv` | PASS | 937ms |
| 12 | `/dashboard/hiring-journey` | PASS | 658ms |
| 13 | `/profile/hiring-journey` | PASS | 945ms |
| 14 | `/recruiter` | PASS | 973ms |
| 15 | `/recruiter/candidates/demo-candidate-001` | PASS | 1.1s |
| 16 | `/recruiter/candidates/demo-candidate-001/trust` | PASS | 780ms |
| 17 | `/recruiter/candidates/demo-candidate-001/team` | PASS | 770ms |
| 18 | `/recruiter/candidates/demo-candidate-001/communication` | PASS | 1.1s |
| 19 | `/recruiter/candidates/demo-candidate-001/collaboration` | PASS | 1.1s |
| 20 | `/recruiter/jobs/demo-role-001/pipeline` | PASS | 1.1s |
| 21 | `/recruiter/jobs/demo-role-001/team` | PASS | 1.1s |
| 22 | `/recruiter/jobs/demo-role-001/tasks` | PASS | 1.1s |
| 23 | `/recruiter/integrations/ats/import-readiness` | PASS | 971ms |
| 24 | `/recruiter/hiring-journey` | PASS | 966ms |
| 25 | `/company/dashboard` | PASS | 686ms |
| 26 | `/company/candidates/demo-candidate-001` | PASS | 1.1s |
| 27 | `/company/candidates/demo-candidate-001/trust` | PASS | 1.1s |
| 28 | `/company/candidates/demo-candidate-001/team` | PASS | 751ms |
| 29 | `/company/candidates/demo-candidate-001/communication` | PASS | 1.1s |
| 30 | `/company/candidates/demo-candidate-001/collaboration` | PASS | 1.1s |
| 31 | `/company/roles/demo-role-001/pipeline` | PASS | 876ms |
| 32 | `/company/roles/demo-role-001/team` | PASS | 776ms |
| 33 | `/company/roles/demo-role-001/tasks` | PASS | 774ms |
| 34 | `/company/integrations/ats/import-readiness` | PASS | 974ms |
| 35 | `/company/hiring-journey` | PASS | 647ms |
| 36 | `/board/hiring-journey` | PASS | 962ms |

**Slowest route:** `/for-companies` (12.6s paint settle — still PASS, auth/demo content visible).

---

## 4. Explicit non-claims

- **P0 performance:** remains **OPEN** (Gate C PASS does not close P0)
- **Public launch:** remains **NO-GO**
- **Gate E / Phase 3B:** remains **PENDING / HARD BLOCKED** — no multitab run
- **Gate D:** **PENDING** — no prod browser smoke executed
- **Default CI:** Playwright remains **DISABLED** in `smoke.yml`

---

## 5. Next step (founder)

Gate C local PASS unlocks **consideration** of Gate D (prod browser boundary) and Gate E (Phase 3B) — each requires **separate explicit YES**. Do not run Phase 3B or prod browser without founder gate approval.
