# Founder authenticated persona smoke runbook — 2026-06-12

**Owner:** TWIN Persona Audit Closure  
**Branch:** `fix/persona-audit-p0-p1-closure-2026-06-12`  
**Purpose:** Manual PASS/PARTIAL/FAIL checklists per persona after login — complements HTTP-only smoke and CI guards (no creds in pipeline).

**Hard bans (unchanged):** Public launch **NO-GO** · auto-apply **PAUSED** · delegated apply **NOT LIVE** · recruiter calendar sync **NOT LIVE** · no fake traction · external invites **0**.

**Pre-flight (all personas):**

```bash
curl -sS https://twin-sooty.vercel.app/api/public-health | jq '{status,db_ok,git_commit}'
cd frontend && npm run test:trust-language-guard && npm run test:i18n-coverage
```

| Pre | Criterion | PASS |
| --- | --------- | ---- |
| P0 | `status: ok`, `db_ok: true` | Required |
| P1 | `git_commit` matches deploy under test | Required |
| P2 | `test:i18n-coverage` green on release commit | Required |

---

## 1 — Candidate

**Login:** `/login/candidate`  
**Workspace home:** `/workspace/candidate` or `/dashboard`

| # | Route | PASS | PARTIAL | FAIL |
| - | ----- | ---- | ------- | ---- |
| C1 | `/login/candidate` | Form + OAuth options load ≤10s; invalid creds show localized error | OAuth slow but email works | Infinite spinner or no error on bad creds |
| C2 | `/dashboard` (auth) | NBA cards + readiness from real API | Partial data / slow load | Blank shell, 401 loop, fake metrics |
| C3 | `/dashboard/calendar` | Week grid loads; no hung **Ładowanie wydarzeń…** (see §Calendar #124) | Empty week with honest copy | Events spinner >15s, false **POŁĄCZONO** on stale token |
| C4 | `/dashboard/applications` | Timeline rows from API or honest empty | Slow | Leaked PII or invented statuses |
| C5 | `/dashboard/evidence` | Vault list or empty state | — | Claims “verified” without proof |
| C6 | `/dashboard/interview-prep` | App picker + generate or empty | AI fallback only | Guaranteed-offer copy |
| C7 | `/profile` | Profile form loads | — | Cross-persona leak |
| C8 | `/dashboard/settings/auto-apply` | **PAUSED** copy visible | — | Live auto-apply CTA |

**Unauth (UX):** `/dashboard` shows sign-in required card → redirects to `/login/candidate` (not blank nav shell).

---

## 2 — Recruiter

**Login:** `/login/recruiter`  
**Workspace home:** `/workspace/recruiter` or `/recruiter/inbox`

| # | Route | PASS | PARTIAL | FAIL |
| - | ----- | ---- | ------- | ---- |
| R1 | `/login/recruiter` | Email or OAuth sign-in works | Slow bootstrap | Cannot authenticate |
| R2 | `/recruiter/inbox` | Queue + segments + accept/decline | Demo seed only | Empty with no copy, PII leak |
| R3 | `/recruiter/pipeline` | Board stages from API | Empty honest | Fake pipeline counts |
| R4 | `/recruiter/search` | Filters + results or empty | Demo pool only | External sourcing implied live |
| R4b | `/recruiter/talent-radar` | Summary panel + grouped premium cards or empty; **Prepare draft** opens solid modal (`bg-slate-950/85`, copy-only badge, no bleed-through) | Pilot / internal data only; fit bands + trust footer | Auto outreach or “AI picks best” implied; draft CTA does nothing |
| R4c | `/recruiter/talent-radar/digest` | Unique-candidate summary + deduplicated sections (max 5); **Kopiuj podsumowanie** / **Skopiowano** only (no send) | Pilot; period selector; trust chips; +X więcej w Radarze | Email send or auto outreach implied |
| R4d | `/recruiter/talent-pool` | Summary + quality + source coverage or empty; link to import | Pilot; CSV internal pool only | Live ATS sync or external sourcing implied |
| R4e | `/recruiter/talent-pool/import` | CSV paste → preview → commit | Duplicate detection; no email/phone columns | Auto outreach or live sync implied |
| R5 | `/recruiter/analytics` | Charts from workspace data | Sparse data | Market-wide fake traction |
| R6 | `/recruiter/integrations` | Readiness rows; no “all connected” | ATS stub only | Fake live badges |
| R7 | `/recruiter/calendar` | **NOT LIVE** placeholder only | — | OAuth sync implied live |
| R8 | Inbox panels | Scorecard + scheduling panels in inbox (no `/recruiter/scorecard` route) | Copy-to-clipboard only | Email send implied |

**Unauth:** `/recruiter/inbox` → sign-in card → `/login/recruiter`.

---

## 3 — Company

**Login:** `/login/company`  
**Workspace home:** `/company/dashboard`

| # | Route | PASS | PARTIAL | FAIL |
| - | ----- | ---- | ------- | ---- |
| B1 | `/login/company` | Sign-in works | — | Cannot authenticate |
| B2 | `/company/dashboard` | Hiring dashboard metrics or honest empty | Demo slug only | Fake revenue |
| B3 | `/company/roles` | Roles list / CRUD per permissions | Read-only mode clear | 404 |
| B4 | `/company/roles/new` | Create form | — | 404 |
| B5 | `/company/pipeline` | Pipeline quality metrics | Sparse | Benchmark fiction |
| B6 | `/company/team` | Team tokens / permissions | — | 404 |
| B7 | `/company/billing` | Plan + usage; billing **NOT LIVE** | — | Checkout live |
| B8 | `/company/integrations` | Readiness page; planned/not-live rows | — | 404 or “all connected” |
| B8b | `/company/talent-pool` | Executive summary + quality + source coverage or empty; **next best action** + **readiness guide** + premium workspace selector | Pilot; links to recruiter import; role-aware Radar CTAs with recruiter-permissions hint | PII fields or auto outreach implied |
| B9 | Roles → pipeline flow | Create role → see pipeline activity | Manual only | Broken API chain |

**Unauth:** `/company/dashboard` → sign-in card → `/login/company`.

---

## 4 — Investor

**Login:** `/login/investor`  
**Public room (no auth):** `/investor`

| # | Route | PASS | PARTIAL | FAIL |
| - | ----- | ---- | ------- | ---- |
| I1 | `/investor` (public) | Honest executive view; NO-GO visible | — | Fake traction, launch GO |
| I2 | `/login/investor` | Sign-in works | — | Cannot authenticate |
| I3 | `/investor/metrics` | Reality dashboard after auth | Sparse metrics | Inflated KPIs |
| I4 | `/investor/roadmap` | Founder updates | — | 404 |
| I5 | `/investor/data-room` | Request access flow | — | Open confidential docs |
| I6 | `/workspace/investor` | Gated hub | — | Blank shell unauth |

**Unauth gated:** sign-in card → `/login/investor`.

---

## 5 — Calendar P0 #124 (Candidate only)

**Route:** `/dashboard/calendar` (authenticated, Google or Microsoft connected)

| # | Check | PASS | FAIL |
| - | ----- | ---- | ---- |
| K1 | Week events finish loading ≤15s | Events or honest empty week | Stuck **Ładowanie wydarzeń…** |
| K2 | Provider cards match health | **POŁĄCZONO** only when `health: ok` | False connected on stale token |
| K3 | Retry / reconnect | Actionable on 502/transient | Logout loop |

**CI guard:** `npm run test:candidate-calendar-week-events-loading`  
**Production PASS:** only after founder confirms K1–K3 on prod with real OAuth — automated tests alone are **PARTIAL**.

---

## 6 — Sign-off

| Persona | Result | Founder | Date |
| ------- | ------ | ------- | ---- |
| Candidate | | | |
| Recruiter | | | |
| Company | | | |
| Investor | | | |
| Calendar #124 prod | | | |

**STOP rules:** If P0 health fails or recruiter inbox (R2) FAIL → no external invites / demos until fixed.

*No secrets in this doc — use founder creds from secure store only.*
