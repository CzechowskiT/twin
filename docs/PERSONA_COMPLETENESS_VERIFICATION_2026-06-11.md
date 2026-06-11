# Persona completeness verification — 2026-06-11

**Owner:** TWIN Persona Completeness Verification Owner  
**Audit branch:** `audit/persona-completeness-verification-2026-06-11`  
**Scaffold HEAD (verified):** `cd4b698` — merge PR #85 (investor roadmap) on `cursor/phase1-monorepo-scaffold`  
**Production API git_commit (2026-06-11T16:37Z):** `474df8869ae861e93f1f48b8ea1d4c36bae48b18` — **2 commits behind scaffold**  
**Production FE:** https://twin-sooty.vercel.app · **API:** https://twin-production-bcd9.up.railway.app  
**Method:** `git ls-tree` on committed scaffold (not dirty working tree); route grep; test scripts; production `curl` smoke; forbidden-claims grep.  
**Scope:** Candidate · Recruiter · Company · Investor personas — code, routes, tests, docs, production.

**Hard bans (preserved):** Public launch **NO-GO** · auto-apply **PAUSED** · delegated apply **NOT LIVE** · recruiter calendar sync **NOT LIVE** · no fake traction · external invites **0** · H5c/H5d **HOLD**.

---

## 1 — Executive summary

| Persona | Verdict | Production | Scaffold (`cd4b698`) | Demo-ready? |
| ------- | ------- | ---------- | -------------------- | ----------- |
| **Candidate** | **PARTIAL** | Core dashboard + calendar + transparency **LIVE** at `474df88` | Same + polish slices 0–7; no dedicated timeline/evidence routes | **Yes** for 5–10 warm outreach (§1+§2 founder QA) — not mass GTM |
| **Recruiter** | **PARTIAL** | Inbox decision console **LIVE**; calendar placeholder **NOT LIVE** | + message drafts (inbox panel); no pipeline/search/analytics/scheduling/audit/scorecards | **Yes** for Slot-1 visual review (H5c pack) — inbox only |
| **Company** | **FAIL** | No `/company/*` workspace routes (404) | No committed company workspace — WIP exists only on unmerged/local branches | **No** — cannot demo company hiring dashboard |
| **Investor** | **PARTIAL** | Calculator, metrics, data-room **LIVE**; roadmap page returns HTTP 200 (likely newer FE deploy vs API commit lag) | + `/investor/roadmap` committed PR #85 | **Yes** for doc-backed metrics narrative — no traction claims |

### Launch & demo stance

| Gate | Status |
| ---- | ------ |
| **Public launch** | **NO-GO** (unchanged) |
| **Controlled recruiter pilot (H5b)** | Prior **PASS** — inbox path |
| **H5c Slot-1 visual review** | **READY** (inbox on prod) — default **HOLD**, no invites sent |
| **5–10 candidate warm outreach** | **READY** after founder runs premium QA checklist on prod |
| **Full four-persona demo** | **NOT READY** — Company FAIL; Recruiter expansion not merged |

### Top blockers

1. **Company persona:** zero merged routes/API/UI — largest gap vs founder intent.
2. **Recruiter expansion slices** (pipeline, search, analytics, scheduling, audit, scorecards): exist as WIP/unmerged branches and dirty trees — **not on scaffold, not on production**.
3. **Production deploy lag:** API reports `474df88`; scaffold at `cd4b698` (message drafts + investor roadmap not yet on API health surface).
4. **`test:i18n-coverage` FAIL** on scaffold — **120** missing overlay keys (message drafts + roadmap additions).
5. **Branch hygiene:** 17/18 named `feature/*-2026-06-11` branches are empty pointers at scaffold — work lives in WIP trees, not reviewable PRs.

---

## 2 — Persona-by-persona matrix

Legend: **M** = merged on scaffold · **P** = partial · **N** = not found on scaffold · **Prod** = production smoke at audit time · **Test** = automated test on scaffold · **Doc** = committed doc.

### Candidate

| Feature | Scaffold | Prod | Routes / surfaces | Tests | Docs | Notes |
| ------- | -------- | ---- | ----------------- | ----- | ---- | ----- |
| Dashboard / Today NBA | M | 200 | `/dashboard` | `test:dashboard-next-best-action` PASS | Premium polish plan | Deterministic mission cards |
| Match quality groups | M | 200 | `#dashboard-matches` | `test:match-quality-groups` PASS | PR #54 | Strong / Worth reviewing / Low |
| Application transparency | M | 200 | Dashboard `<details>` panel | `test:candidate-transparency` PASS | `CANDIDATE_APPLICATION_TRANSPARENCY_2026-06-07` | Two-column shared/not shared |
| Calendar + OAuth | M | 200 | `/dashboard/calendar` | `test:candidate-calendar-*` PASS | Calendar health fixes | Google + Microsoft |
| Acceptance queue | M | 200 | `/dashboard/acceptance` | backend `test_acceptance_queue` | — | |
| Auto-apply settings (paused) | M | 200 | `/dashboard/settings/auto-apply` | `test:dashboard-ux-safety` PASS | Pause plan docs | **PAUSED** copy |
| Billing / referrals | M | 200 | `/dashboard/billing`, referrals | pricing tests | — | Candidate-only Stripe |
| **Application timeline CRM** | N | **404** | No `/dashboard/applications` | **MISSING** `test:candidate-application-timeline-crm` | WIP uncommitted | Transparency panel only — not full CRM timeline |
| **Profile evidence vault** | N | **404** | No `/dashboard/evidence` | **MISSING** | WIP branch only | Backend migration `048` exists; no vault UI |
| **Interview prep page** | P | N/A | Modal in calendar via career-assistant API | backend `test_career_assistant` | — | No dedicated `/dashboard/interview-prep/[id]` route on scaffold |

### Recruiter

| Feature | Scaffold | Prod | Routes / surfaces | Tests | Docs | Notes |
| ------- | -------- | ---- | ----------------- | ----- | ---- | ----- |
| Decision console inbox | M | 200 | `/recruiter/inbox` | `test:recruiter-inbox-decision` PASS | Premium card redesign docs | Accept/decline contract preserved |
| Jobs list | M | 200 | `/recruiter/jobs` | backend `test_recruiter_inbox` 8 passed | — | |
| Workspace hub | M | 200 | `/workspace/recruiter` | `persona-access` in calendar routing PASS | — | |
| Calendar placeholder | P | 200 | `/recruiter/calendar` | `persona-access` PASS | — | **NOT LIVE** — no sync claims |
| ATS integrations stub | P | 200 | `/recruiter/integrations/ats` | backend `test_integrations_ats` | — | Readiness UI only |
| **Message drafts** | M | **Not deployed** | Inbox panel (no new route) | `test:recruiter-candidate-message-drafts` PASS | `RECRUITER_CANDIDATE_MESSAGE_DRAFTS_MVP_2026-06-11` | PR #83 on scaffold; prod API still `474df88` |
| **Pipeline board** | N | **404** | — | **MISSING** | WIP only | `recruiter-pipeline-mvp` unmerged |
| **Candidate search** | N | **404** | — | **MISSING** | WIP worktree | |
| **Analytics** | N | **404** | — | **MISSING** | WIP only | |
| **Manual scheduling** | N | N/A | No schedule API on scaffold | **MISSING** | WIP only | Calendar page stays placeholder |
| **Compliance audit trail** | N | N/A | — | **MISSING** | WIP only | |
| **Notes / scorecards** | N | N/A | — | **MISSING** | — | Migration in WIP extract only |
| **Integrations readiness panel** | N | N/A | — | **MISSING** | WIP only | ATS stub only on scaffold |

### Company

| Feature | Scaffold | Prod | Routes / surfaces | Tests | Docs | Notes |
| ------- | -------- | ---- | ----------------- | ----- | ---- | ----- |
| Company login (marketing) | M | 200 | `/login/company` | — | — | Not a workspace |
| **Roles management** | N | **404** | — | **MISSING** | WIP uncommitted | `company.py` API in WIP only |
| **Pipeline quality metrics** | N | **404** | — | **MISSING** | WIP only | |
| **Hiring dashboard** | N | **404** | — | **MISSING** | WIP only | |
| **Billing / plan usage** | N | **404** | — | **MISSING** | WIP only | Candidate billing exists; no company lane |
| **Team permissions** | N | N/A | — | **MISSING** | WIP only | |

### Investor

| Feature | Scaffold | Prod | Routes / surfaces | Tests | Docs | Notes |
| ------- | -------- | ---- | ----------------- | ----- | ---- | ----- |
| Investor portal home | M | 200 | `/investor` | — | — | |
| Calculator | M | 200 | `/investor/calculator` | `test:investor-calculator` PASS | — | |
| Metrics dashboard | M | 200 | `/investor/metrics` | — | — | Doc-backed; no fake traction guard in `investor-metrics-reality.ts` |
| Data room | M | 200 | `/investor/data-room` | — | — | |
| Placement economics | M | 200 | `/investor/placement` | — | — | |
| **Roadmap + founder updates** | M | 200 | `/investor/roadmap` | `test:investor-roadmap-founder-updates` PASS | `INVESTOR_ROADMAP_FOUNDER_UPDATES_2026-06-11` | PR #85; prod HTTP 200 (FE may be ahead of API git_commit) |
| **Metrics reality hardening** | N | N/A | — | **MISSING** | WIP only | Basic metrics exist |
| **Data room request-access flow** | N | N/A | — | **MISSING** | WIP only | |

### Cross-cutting (sections A–D from launch matrix)

| Area | Status | Evidence |
| ---- | ------ | -------- |
| **A — Security / CSP** | PASS (prior audits) | Enforce live; `test:security-headers` PASS |
| **B — Database** | PASS (prod `db_ok: true` at audit) | Was `false` in earlier curl same session — re-verify |
| **C — Auth** | PASS | Role-choice-first; OAuth configured on health |
| **D — Calendar** | PARTIAL | Candidate Google/Microsoft PASS; recruiter calendar **NOT LIVE**; Apple/iCal partial with waiver |

---

## 3 — Route inventory

### Scaffold (`cd4b698`) — committed `page.tsx` routes

**Candidate:** `/dashboard`, `/dashboard/calendar`, `/dashboard/career`, `/dashboard/identity`, `/dashboard/billing`, `/dashboard/acceptance`, `/dashboard/referrals`, `/dashboard/settings/auto-apply`, `/workspace/candidate`, `/workspace/candidate/jobs`, `/login/candidate`, `/register/candidate`

**Recruiter:** `/recruiter/inbox`, `/recruiter/jobs`, `/recruiter/calendar`, `/recruiter/integrations/ats`, `/workspace/recruiter`, `/login/recruiter`, `/register/recruiter`

**Company:** `/login/company` only — **no `/company/*` workspace**

**Investor:** `/investor`, `/investor/calculator`, `/investor/metrics`, `/investor/data-room`, `/investor/placement`, `/investor/roadmap`, `/workspace/investor`, `/login/investor`, `/register/investor`

**Marketing / shared:** `/`, `/demo`, `/login`, `/register`, `/pricing`, persona landing pages, etc. (82 total `page.tsx`)

### Production smoke (2026-06-11T16:37Z)

| Route | HTTP | Notes |
| ----- | ---- | ----- |
| `/` | 200 | |
| `/demo` | 200 | |
| `/login` | 200 | |
| `/dashboard` | 200 | Auth redirect OK |
| `/dashboard/applications` | **404** | Not shipped |
| `/dashboard/evidence` | **404** | Not shipped |
| `/recruiter/inbox` | 200 | |
| `/recruiter/calendar` | 200 | NOT LIVE copy expected |
| `/recruiter/pipeline` | **404** | |
| `/recruiter/search` | **404** | |
| `/recruiter/analytics` | **404** | |
| `/company/pipeline` | **404** | |
| `/company/roles` | **404** | |
| `/investor` | 200 | |
| `/investor/metrics` | 200 | |
| `/investor/data-room` | 200 | |
| `/investor/roadmap` | 200 | Scaffold has route; API git_commit still `474df88` |
| `/api/public-health` | 200 | `db_ok: true`, `git_commit: 474df88` |

### BFF API routes on scaffold

`/api/public-health`, `/api/recruiter/inbox`, `/api/recruiter/inbox/[id]/respond`, `/api/recruiter/inbox/respond-batch`, `/api/recruiter/jobs`, `/api/v1/[[...path]]`, ops-admin routes — **no** `/api/recruiter/pipeline`, `/api/recruiter/search`, `/api/recruiter/analytics`, `/api/company/*` on scaffold.

---

## 4 — Test inventory

### Toolchain (scaffold `cd4b698`, clean tree)

| Check | Result |
| ----- | ------ |
| `npm run lint` | **PASS** |
| `npx tsc --noEmit` | **PASS** (clean tree) |
| `npm run build` | **PASS** (clean tree; fails if WIP files pollute tree) |

### Guard / persona tests run (scaffold)

| Script | Result |
| ------ | ------ |
| `test:pii-data-visibility` | **PASS** |
| `test:trust-language-guard` | **PASS** |
| `test:i18n-global-chrome-guard` | **PASS** |
| `test:og-bundle-guard` | **PASS** |
| `test:dashboard-next-best-action` | **PASS** |
| `test:match-quality-groups` | **PASS** |
| `test:candidate-transparency` | **PASS** |
| `test:recruiter-inbox-decision` | **PASS** |
| `test:guided-empty-state` | **PASS** |
| `test:interactive-demo` | **PASS** |
| `test:auth-role-choice` | **PASS** |
| `test:recruiter-candidate-message-drafts` | **PASS** |
| `test:investor-roadmap-founder-updates` | **PASS** |
| `test:candidate-calendar-routing` | **PASS** |
| `test:security-headers` | **PASS** |
| `test:verified-readiness-guard` | **PASS** |
| `test:dashboard-ux-safety` | **PASS** |
| `test:i18n-premium-product` | **PASS** |
| `test:i18n-rendered-homepage-guard` | **PASS** |
| `test:i18n-visual-copy-guard` | **PASS** |
| `test:i18n-coverage` | **FAIL** — 120 missing keys |

### MVP test scripts — **MISSING on scaffold** (not in `package.json` / not committed)

`test:candidate-application-timeline-crm`, `test:candidate-profile-evidence-vault`, `test:recruiter-pipeline-mvp`, `test:recruiter-scheduling-mvp`, `test:recruiter-candidate-search-mvp`, `test:recruiter-analytics-mvp`, `test:recruiter-audit-trail-mvp`, `test:recruiter-notes-scorecards`, `test:recruiter-integrations-readiness`, `test:company-jobs-roles-management-mvp`, `test:company-pipeline-quality-metrics`, `test:company-billing-plan-usage-readiness`, `test:company-hiring-dashboard-mvp`, `test:company-team-permissions-mvp`, `test:investor-metrics-reality-dashboard`, `test:investor-data-room-request-access`

### Backend pytest (spot check)

| Module | Result |
| ------ | ------ |
| `tests/test_recruiter_inbox.py` | **8 passed** |
| `tests/test_company_roles.py` | **MISSING on scaffold** |
| `tests/test_recruiter_pipeline.py` | **MISSING on scaffold** |
| `tests/test_recruiter_scheduling.py` | **MISSING on scaffold** |
| `tests/test_recruiter_audit_trail.py` | **MISSING on scaffold** |
| `tests/test_candidate_profile_evidence_vault.py` | **MISSING on scaffold** |

---

## 5 — Docs inventory

### Committed on scaffold (`cd4b698`)

| Doc | Persona | Matches code? |
| --- | ------- | ------------- |
| `FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md` | All | **Yes** for shipped polish slices |
| `PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` | All | **Yes** — NO-GO stance |
| `H5C_GO_SMALL_1_PREP_PACK_2026-06-11.md` | Recruiter | **Yes** for inbox demo |
| `RECRUITER_CANDIDATE_MESSAGE_DRAFTS_MVP_2026-06-11.md` | Recruiter | **Yes** on scaffold |
| `INVESTOR_ROADMAP_FOUNDER_UPDATES_2026-06-11.md` | Investor | **Yes** on scaffold |
| Recruiter inbox polish docs (2026-06-11) | Recruiter | **Yes** on prod inbox |
| i18n fix docs (2026-06-11) | Cross | **Yes** |

### Documented but **NOT merged** (WIP / uncommitted only)

Company roles, pipeline quality, billing readiness, hiring dashboard, team permissions; recruiter pipeline, scheduling, analytics, search, audit trail, scorecards, integrations readiness; candidate timeline CRM, evidence vault, interview prep MVP; investor metrics reality, data room request-access.

**Audit rule applied:** docs claiming MVP **done** without scaffold routes/tests marked **NOT FOUND** or **WIP ONLY**.

---

## 6 — Production smoke plan (founder checklist)

Run within 7 days of any external touch. All must pass for H5c Slot-1 or candidate outreach.

```bash
# Health
curl -sS https://twin-sooty.vercel.app/api/public-health | jq '{status,git_commit,db_ok,stripe_checkout_ready,recruiter_inbox_configured}'

# Core routes (expect 200; 404 = not shipped)
for r in / /demo /login /dashboard /recruiter/inbox /recruiter/calendar \
  /investor/metrics /investor/data-room /investor/roadmap; do
  echo -n "$r "; curl -sS -o /dev/null -w "%{http_code}\n" "https://twin-sooty.vercel.app$r"
done

# Must 404 until merged (confirm no half-deploy)
for r in /recruiter/pipeline /recruiter/search /company/roles /dashboard/evidence; do
  echo -n "$r "; curl -sS -o /dev/null -w "%{http_code}\n" "https://twin-sooty.vercel.app$r"
done
```

| # | Check | Pass criteria |
| - | ----- | ------------- |
| PS1 | `db_ok: true` | Stable across 3 curls 5 min apart |
| PS2 | `/recruiter/inbox` | 200; Nova PL queue; segments + premium cards |
| PS3 | Hard bans | No auto-apply live, no public GO, no AI-hires |
| PS4 | `/recruiter/calendar` | NOT LIVE copy only |
| PS5 | Accept/decline | Interview/rejected rows — badge only |
| PS6 | `/dashboard` | Today NBA + match groups + transparency |
| PS7 | Forbidden claims | `npm run test:trust-language-guard` green on release commit |
| PS8 | Deploy parity | Note API `git_commit` vs expected scaffold HEAD |
| PS9 | Company routes | Still 404 — do **not** demo company workspace |
| PS10 | i18n | PL spot-check inbox + dashboard; ES/DE chrome |

**If PS1 or PS2 fails:** STOP — no external invites.

---

## 7 — Gaps (blunt categories)

### NOT MERGED — founder-requested MVP slices

- **Company entire persona** — roles, pipeline, dashboard, billing, team: WIP only.
- **Recruiter pipeline, search, analytics, scheduling, audit trail, scorecards** — WIP/unmerged; production 404.
- **Candidate timeline CRM page, evidence vault, interview-prep route** — not on scaffold.

### DOCS ≠ DONE

Multiple `*MVP_2026-06-11.md` files exist only in uncommitted trees or reference branches with **zero commits** — treating them as shipped would be false.

### BRANCH HYGIENE

18 named `feature/*-2026-06-11` branches; only **message-drafts** (PR #83) and **investor-roadmap** (PR #85) merged to scaffold. Remainder are empty labels or local WIP.

### PRODUCTION LAG

Production API at `474df88`; scaffold at `cd4b698`. Message drafts and roadmap not reflected in API health commit hash.

### CI / i18n DEBT

`test:i18n-coverage` fails with **120** missing keys after recent merges — blocks confident locale rollout for new surfaces.

### WORKING TREE CHAOS

Parallel agents left untracked `company/`, `recruiter/pipeline/`, `recruiter/analytics/` files that **break build** when present but are **not** on scaffold — merge discipline required.

---

## 8 — Recommended merge / fix order

1. **Fix `test:i18n-coverage`** — regenerate premium overlays for message-drafts + roadmap keys (blocks CI confidence).
2. **Promote production deploy** to `cd4b698`+ after i18n green — message drafts + investor roadmap.
3. **Company roles MVP** — first company route (`/company/roles`) + `backend/app/api/company.py` + tests (unblocks persona entirely).
4. **Company pipeline quality** — depends on roles API.
5. **Recruiter pipeline MVP** — natural extension of inbox; includes BFF routes.
6. **Recruiter manual scheduling** — inbox panel + API; keep calendar page NOT LIVE until OAuth story clear.
7. **Recruiter candidate search** — separate PR after pipeline.
8. **Candidate application timeline** — `/dashboard/applications` + CRM test script.
9. **Recruiter analytics + audit trail** — compliance narrative for pilot expansion.
10. **Evidence vault + interview prep pages** — candidate parity.

**Do not merge until:** empty feature branch renamed or deleted; WIP extracted to real PRs; `build` + `test:i18n-coverage` green.

**Do not enable:** auto-apply, delegated apply, recruiter calendar sync, public launch GO, external invites — without explicit founder gate.

---

## Hard bans verification

| Ban | Verified |
| --- | -------- |
| No public launch GO | **CONFIRMED** — matrices and docs unchanged |
| Auto-apply PAUSED | **CONFIRMED** — health + dashboard copy |
| Delegated apply NOT LIVE | **CONFIRMED** |
| Recruiter calendar NOT LIVE | **CONFIRMED** — placeholder only |
| No fake traction | **CONFIRMED** — trust-language + investor metrics guards |
| No external invites | **CONFIRMED** — H5c HOLD |

---

*Generated by Persona Completeness Verification Owner — audit-only, no product changes.*
