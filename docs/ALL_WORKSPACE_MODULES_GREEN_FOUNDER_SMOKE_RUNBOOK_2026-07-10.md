# All workspace modules GREEN — Founder smoke runbook — 2026-07-10

**Type:** Manual smoke checklist — **not launch approval**  
**Branch:** `docs/post-wave3-founder-green-smoke`  
**Parent plan:** [ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md](./ALL_WORKSPACE_MODULES_GREEN_PLAN_2026-07-09.md)  
**Post-Wave-3 readiness:** [ALL_WORKSPACE_MODULES_GREEN_POST_WAVE3_READINESS_2026-07-10.md](./ALL_WORKSPACE_MODULES_GREEN_POST_WAVE3_READINESS_2026-07-10.md)  
**PR #443 merge SHA:** `e9cd074dada320713a94e77b28f905781ab7c3e2`  
**Prior persona runbook:** [FOUNDER_AUTHENTICATED_PERSONA_SMOKE_RUNBOOK_2026-06-12.md](./FOUNDER_AUTHENTICATED_PERSONA_SMOKE_RUNBOOK_2026-06-12.md)

**Canonical stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | **Launch NO-GO**

**Hard bans:** NO Launch GO · NO Gate F YES · NO Gate E · NO Phase 3B · NO prod mutation · NO secrets in this doc

---

## 1. Purpose

Manual founder smoke for **every visible GREEN module** in authenticated workspace hubs after Wave 1–3. Complements static guards and Gate E harness — **does not** approve Gate F or public launch.

**Pre-flight (required before any module smoke):**

```bash
curl -sS https://twin-sooty.vercel.app/api/public-health | jq '{status,db_ok,frontend_commit,api_commit}'
```

| Pre | Criterion | PASS |
| --- | --------- | ---- |
| P0 | `status: ok`, `db_ok: true` | Required |
| P1 | `frontend_commit` ≥ PR #443 merge SHA `e9cd074d` | Required — **ALIGNED** (Vercel @ `e9cd074d`) |
| P2 | Workspace hub shows **only** GREEN modules (no Pilot/Preview/Coming soon/Paused cards) | Required |

**Prod URL:** https://twin-sooty.vercel.app

---

## 2. Workspace GREEN inventory (visible modules only)

```
WORKSPACE_GREEN_VISIBLE_MODULES: candidate=9, recruiter=5, company=3, investor=4, total=21
WORKSPACE_GREEN_PRIMARY_LIMITS: candidate=10, recruiter=5, company=3, investor=4
```

| Persona | Count | Module IDs (hub cards) |
|---------|-------|------------------------|
| **Candidate** | 9 | profile, jobs, matches, career_compass, identity, calendar, applications, evidence, interview_prep |
| **Recruiter** | 5 | inbox, pipeline, jobs, search, analytics |
| **Company** | 3 | company_dashboard, roles, pipeline |
| **Investor** | 4 | metrics, roadmap, calculator, contact |

**Hidden from workspace (Wave 1–3 — must NOT appear in hub/nav):** referrals, trust_center, plan_payments, auto_apply, trust_review_queue, daily_cockpit, talent_pool, talent_radar, talent_radar_digest, integrations (recruiter + company), calendar (recruiter), billing (company), hiring_cockpit, hiring_command_center, team, data_room, placement, login (investor public preview).

**Moved to roadmap outside workspace:** trust_center → `/investor/roadmap#candidate-trust-center`; recruiter/company integrations → `/investor/roadmap#recruiter-integrations` / `#company-integrations`; investor login → `/investor/roadmap#investor-public-login`.

---

## 3. Global invariant checks (all personas)

Run once per smoke session **before** module-by-module checks.

| # | Invariant | PASS | FAIL |
| --- | --------- | ---- | ---- |
| G1 | Auto-apply **OFF** / **PAUSED** copy on candidate settings | Visible paused state; no live nightly CTA | Live auto-apply implied |
| G2 | Delegated apply **NOT LIVE** anywhere in workspace | No delegated-apply CTA | Delegated apply implied live |
| G3 | Billing hidden from workspace (candidate plan_payments, company billing) | No billing cards in hub | Billing card visible |
| G4 | Integrations outside workspace (recruiter + company) | Hub has zero integration cards; roadmap link only | Integration card in hub |
| G5 | Trust center outside workspace (candidate) | No trust_center card; roadmap anchor works | Trust card in hub |
| G6 | Investor login outside workspace | No login preview card in `/investor` grid or workspace hub | Login card in workspace |
| G7 | Data room hidden from investor workspace | No data_room card in `/workspace/investor` | data_room card visible |
| G8 | No yellow/orange Pilot/Preview/Coming soon/Paused/Not live badges on workspace module cards | All visible cards = Live or no warning badge | Any warning badge on hub card |
| G9 | Launch NO-GO visible on investor surfaces | Honest NO-GO / not-live copy where applicable | Launch GO claimed |

**Invariant status:** `NEEDS_FOUNDER_AUTH_SMOKE` (not executed — prod deploy pending at doc creation)

---

## 4. Credentials & seeded data (gap analysis)

**No secrets in this section.** See [DEMO_LOGIN_FOR_FOUNDER.md](./DEMO_LOGIN_FOR_FOUNDER.md).

| Resource | Available for founder smoke? | Notes |
|----------|------------------------------|-------|
| Candidate credentials (`demo@twin.career`) | **YES** | Password via secure channel (Signal/1Password) — not in repo |
| Recruiter inbox token + `company_slug` | **NO** | `RECRUITER_INBOX_TOKEN` not in founder vault — M7 NEEDS_REVIEW |
| Company dashboard access (recruiter token path) | **NO** | Same token gate as inbox — M8 NEEDS_REVIEW |
| Investor authenticated access | **PARTIAL** | `demo@twin.career` may work post-seed; invite-only for dedicated investor accounts |
| Seeded demo data (5 jobs, calendar slot, applications) | **YES** (if seed run) | `scripts/seed-investor-demo.py` on prod — verify `GET /api/v1/demo/snapshot` → `sample_data: true` |

**Credential gap flag:** `NEEDS_FOUNDER_AUTH_SMOKE` — recruiter + company modules blocked until token provisioned.

---

## 5. Candidate — 9 GREEN modules

**Login:** `/login/candidate`  
**Workspace home:** `/workspace/candidate` or `/dashboard`  
**Credentials:** `demo@twin.career` (secure password)  
**Seeded data:** Alex Kowalski profile, 5 matched jobs, demo applications, calendar hold (post-seed)

| ID | Route | Expected value | Primary action | PASS | FAIL | Evidence | Status |
|----|-------|----------------|----------------|------|------|----------|--------|
| M-C01 profile | `/profile` | Profile form with name, CV, consent checkboxes | Edit and save profile field | Form loads ≤10s; real API data or honest empty | Blank shell, 401 loop | Screenshot + URL | NEEDS_FOUNDER_AUTH_SMOKE |
| M-C02 jobs | `/dashboard/jobs` | Scraped job list from BE | Open job detail | Jobs list or honest empty; no fake counts | Invented traction | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |
| M-C03 matches | `/dashboard/matches` | Ranked matches from matching BE | Review top match | Matches or honest empty state | Fake match scores | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |
| M-C04 career_compass | `/dashboard/career` | Career compass API content | View career insights | Page loads; honest copy | Guaranteed-offer language | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |
| M-C05 identity | `/dashboard/identity` | Identity / verification settings | View identity panel | Settings load | Cross-persona leak | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |
| M-C06 calendar | `/dashboard/calendar` | Week grid + provider status | Connect or view events | Events load ≤15s or honest empty; no hung **Ładowanie wydarzeń…** | Stuck spinner, false **POŁĄCZONO** | Screenshot + provider state | NEEDS_FOUNDER_AUTH_SMOKE |
| M-C07 applications | `/dashboard/applications` | Application timeline from API | Open application row | Real rows or honest empty | Invented statuses | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |
| M-C08 evidence | `/dashboard/evidence` | Evidence vault list | View evidence items | Vault or empty; no false “verified” | Claims verified without proof | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |
| M-C09 interview_prep | `/dashboard/interview-prep` | Interview prep generator | Select app + generate | Generator or honest empty | Guaranteed-offer copy | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |

**Hub check:** `/workspace/candidate` shows exactly **9** green cards — no referrals, trust_center, plan_payments, auto_apply.

---

## 6. Recruiter — 5 GREEN modules

**Login:** `/login/recruiter`  
**Workspace home:** `/workspace/recruiter` or `/recruiter/inbox`  
**Credentials:** **NEEDS_FOUNDER_AUTH_SMOKE** — requires `X-Twin-Recruiter-Token` + `company_slug` (see [RECRUITER_INBOX.md](./RECRUITER_INBOX.md))  
**Seeded data:** Demo inbox rows if token + slug configured

| ID | Route | Expected value | Primary action | PASS | FAIL | Evidence | Status |
|----|-------|----------------|----------------|------|------|----------|--------|
| M-R01 inbox | `/recruiter/inbox` | Queue with accept/decline | Accept or decline candidate | Queue loads; segments visible | Empty with no copy, PII leak | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |
| M-R02 pipeline | `/recruiter/pipeline` | Pipeline board stages | Move or view stage | Board from API or honest empty | Fake pipeline counts | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |
| M-R03 jobs | `/recruiter/jobs` | Job management list | Create or edit job | Jobs CRUD UI loads | 404 or fake jobs | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |
| M-R04 search | `/recruiter/search` | Candidate search filters | Run search | Results or honest empty | External sourcing implied live | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |
| M-R05 analytics | `/recruiter/analytics` | Workspace analytics charts | View chart section | Charts from workspace data; **Live** badge (Wave 2A) | Preview badge or market-wide fake traction | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |

**Hub check:** `/workspace/recruiter` shows exactly **5** green cards — no talent_*, integrations, calendar, cockpits.

---

## 7. Company — 3 GREEN modules

**Login:** `/login/company`  
**Workspace home:** `/company/dashboard`  
**Credentials:** **NEEDS_FOUNDER_AUTH_SMOKE** — company dashboard uses recruiter-token gate  
**Seeded data:** Demo company slug if token provisioned

| ID | Route | Expected value | Primary action | PASS | FAIL | Evidence | Status |
|----|-------|----------------|----------------|------|------|----------|--------|
| M-B01 company_dashboard | `/company/dashboard` | Hiring dashboard metrics | View KPI cards | Metrics or honest empty | Fake revenue / traction | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |
| M-B02 roles | `/company/roles` | Roles list / CRUD | Open role or create | Roles list loads | 404 | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |
| M-B03 pipeline | `/company/pipeline` | Pipeline quality metrics | View pipeline summary | Pipeline UI loads | Benchmark fiction | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |

**Hub check:** `/workspace/company` shows exactly **3** green cards — no talent_pool, team, cockpits, billing, integrations.

---

## 8. Investor — 4 GREEN modules

**Login:** `/login/investor` (deep link preserved; **not** workspace card — Wave 3 Slice 3)  
**Workspace home:** `/workspace/investor`  
**Credentials:** PARTIAL — `demo@twin.career` or invite-only investor account  
**Seeded data:** Illustrative metrics copy (D5 controlled)

| ID | Route | Expected value | Primary action | PASS | FAIL | Evidence | Status |
|----|-------|----------------|----------------|------|------|----------|--------|
| M-I01 metrics | `/investor/metrics` | Reality dashboard (illustrative) | View metrics sections | Honest illustrative copy; NO-GO visible | Inflated KPIs / launch GO | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |
| M-I02 roadmap | `/investor/roadmap` | Founder updates + outside-workspace modules | Scroll trust/integrations/login sections | Roadmap loads; Wave 3 anchors present | 404 | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |
| M-I03 calculator | `/investor/calculator` | Illustrative financial model | Adjust calculator inputs | Calculator interactive | Fake audited financials | Screenshot | NEEDS_FOUNDER_AUTH_SMOKE |
| M-I04 contact | `mailto:` deck contact | External mailto CTA | Click contact | mailto opens | Broken link | N/A | NEEDS_FOUNDER_AUTH_SMOKE |

**Hub check:** `/workspace/investor` shows exactly **4** green cards — no data_room, placement, login preview.

**Outside-workspace deep links (verify NOT in hub, but routes work):**

| Surface | Route | Expected |
|---------|-------|----------|
| Trust center roadmap | `/investor/roadmap#candidate-trust-center` | Section visible; no workspace card |
| Integrations roadmap | `/investor/roadmap#recruiter-integrations` | Section visible |
| Investor login preview | `/login/investor` | Invite-only badge + roadmap note; not hub card |

---

## 9. Sign-off matrix

| Persona | Modules | PASS count | FAIL count | NEEDS_REVIEW | Founder | Date |
|---------|---------|------------|------------|--------------|---------|------|
| Candidate | 9 | | | 9 | | |
| Recruiter | 5 | | | 5 | | |
| Company | 3 | | | 3 | | |
| Investor | 4 | | | 4 | | |
| Global invariants G1–G9 | 9 | | | 9 | | |

**STOP rules:**

- P0 health fails → stop all smoke
- P1 deploy not aligned → **do not claim prod smoke PASS**
- Recruiter inbox (M-R01) FAIL → no external recruiter invites
- Any G8 FAIL (non-green badge in hub) → Wave regression — file P0

---

## 10. Launch stance footer

```
FOUNDER_SMOKE_RUNBOOK_STANCE: P0_CLOSED|Gate_E_PASS|Gate_F_PENDING|Launch_NO-GO
NOT_LAUNCH_GO: true
NOT_GATE_F_YES: true
NOT_PHASE_3B: true
FOUNDER_SMOKE_EXECUTED: false
FOUNDER_SMOKE_READINESS: NOT_READY — recruiter/company credentials gap
RECOMMENDATION: READY_FOR_FOUNDER_SMOKE — static prep complete; execute after recruiter token provisioned
```

*No secrets in this doc — use founder creds from secure store only.*
