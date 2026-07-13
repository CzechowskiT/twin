# Public launch functionality inventory — 2026-07-13

> **Path:** B++ (credentials UNSET) · **Audit batch:** extended pre-launch  
> **Stance:** P0 CLOSED · Gate E PASS · Gate F PENDING · Launch **NO-GO**

## Legend

| Status | Meaning |
|--------|---------|
| **LIVE** | Public-scope, production-ready, no pilot chrome required |
| **PILOT** | Works with honest pilot badge; founder-led cohort |
| **PREVIEW** | Demo/read-only; actions disabled |
| **COMING_SOON** | Visible with badge; no backend persistence |
| **PAUSED** | Intentionally disabled (e.g. auto-apply) |
| **LAUNCH_BLOCKER** | Must be GREEN or explicitly waived before public GO |
| **NOT_IN_TRAIN** | Open PR not merged; not on production |

---

## Marketing / public routes

| Route | Status | Evidence | Notes |
|-------|--------|----------|-------|
| `/` | LIVE | HTTP 200 prod | Homepage + Explore TWIN |
| `/for-candidates` | LIVE | Registry + HTTP 200 | Persona marketing |
| `/for-recruiters` | LIVE | Registry + HTTP 200 | Persona marketing |
| `/for-companies` | LIVE | Registry + HTTP 200 | Persona marketing |
| `/for-investors` | LIVE | Registry + HTTP 200 | Fundraising lane |
| `/investor` | LIVE | Registry + HTTP 200 | Executive room |
| `/investor/product-proof` | LIVE | Registry + HTTP 200 | Product proof |
| `/demo` | LIVE | Founder demo crosslinks | Interactive walkthrough |
| `/how-it-works` | LIVE | Registry + HTTP 200 | |
| `/faq` | LIVE | Registry + HTTP 200 | |
| `/status` | LIVE | Registry + HTTP 200 | Public status |
| `/privacy`, `/terms` | LIVE | Footer sitemap | Legal |
| `/waitlist` | LIVE | PUBLIC_SURFACE_HREFS | |
| `/dashboard/trust` | PILOT | HTTP 200 prod | Trust center — pilot smoke pending |

---

## Candidate (scoped launch: 8 primary)

| Module | Route | Status | Evidence |
|--------|-------|--------|----------|
| Dashboard | `/dashboard` | LIVE | Gate E 20/20 PASS |
| Jobs / offers | `/dashboard/jobs` | LIVE | Phase 3B PASS |
| Matches | `/dashboard/matches` | LIVE | Phase 3B PASS |
| Profile | `/profile` | LIVE | Export JSON LIVE |
| CV | `/profile/cv` | LIVE | |
| Applications | `/dashboard/applications` | LIVE | |
| Calendar (Google) | `/dashboard/calendar` | LIVE | Google OAuth configured prod |
| Identity | `/dashboard/identity` | PILOT | Preview flows |
| Career compass | `/dashboard/career` | PILOT | Wave B1 — smoke pending |
| Trust center | `/dashboard/trust` | PILOT | Wave B2 — persistence on scaffold |
| Referrals | `/dashboard/referrals` | NOT_IN_TRAIN | PR #448 OPEN — migration 073 |
| Activity timeline | `/dashboard/activity` | NOT_IN_TRAIN | PR #455 OPEN — migration 077 |

---

## Recruiter (scoped launch: 5 primary)

| Module | Route | Status | Evidence |
|--------|-------|--------|----------|
| Hub | `/recruiter` | LIVE | Phase 3B PASS |
| Inbox | `/recruiter/inbox` | LIVE | Phase 3B PASS |
| Pipeline | `/recruiter/pipeline` | LIVE | Phase 3B PASS |
| Jobs | `/recruiter/jobs` | LIVE | |
| Search | `/recruiter/search` | LIVE | |
| Workspace activation | `/recruiter/activation` | NOT_IN_TRAIN | PR #449 OPEN — C1 smoke pending |
| Talent pool + trust review | `/recruiter/talent-pool` | NOT_IN_TRAIN | PR #450 OPEN |
| Notification prefs | `/recruiter/settings/notifications` | NOT_IN_TRAIN | PR #452 CONFLICTING |
| Saved views | `/recruiter/saved-views` | NOT_IN_TRAIN | PR #453 OPEN |
| Activity timeline | `/recruiter/activity` | NOT_IN_TRAIN | PR #454 OPEN |
| Calendar | `/recruiter/calendar` | COMING_SOON | Hard ban |
| ATS import | `/recruiter/integrations` | COMING_SOON | `ATS_COMING_SOON_NO_LIVE_SYNC` |

---

## Company (scoped launch: 4 primary)

| Module | Route | Status | Evidence |
|--------|-------|--------|----------|
| Dashboard | `/company/dashboard` | LIVE | Phase 3B PASS |
| Roles | `/company/roles` | LIVE | |
| Pipeline | `/company/pipeline` | LIVE | Phase 3B PASS |
| Team | `/company/team` | PILOT | |
| Billing | `/company/billing` | PAUSED | Hidden module |
| Integrations | `/company/integrations` | COMING_SOON | |

---

## Investor / DD

| Module | Route | Status |
|--------|-------|--------|
| Public room | `/investor` | LIVE |
| Metrics | `/investor/metrics` | LIVE (honest labels) |
| Roadmap | `/investor/roadmap` | LIVE |
| Calculator | `/investor/calculator` | LIVE |
| Data room | `/investor/data-room` | PREVIEW |

---

## Hard-banned surfaces (never public launch without explicit founder GO)

| Surface | Ban |
|---------|-----|
| Auto-apply | PAUSED — UI + nightly tasks |
| Stripe LIVE checkout | Not configured for public |
| ATS writeback | `ATS_COMING_SOON_NO_LIVE_SYNC` |
| Microsoft Calendar write | `FORCE_MICROSOFT_CALENDAR_COMING_SOON` |
| External recruiter notifications | C3 in-app only |
| Board / admin | INTERNAL |

---

## Release train inventory (PRs #448–#460)

| PR | Scope | Mergeable | CI | Migration |
|----|-------|-----------|-----|-----------|
| #448 | B3 referrals | CLEAN | green | 073 |
| #449 | C1 activation | CLEAN | green | 071 |
| #450 | C2 talent pool | CLEAN | green | 072 |
| #451 | Integration tooling | CLEAN | **build fix pending push** | — |
| #452 | C3 notification prefs | **CONFLICTING** | green on branch | 074 (parent 072→073 fix required) |
| #453 | C4 saved views | CLEAN | green | 075 |
| #454 | C5 activity timeline | CLEAN | green | 076 |
| #455 | Candidate timeline | CLEAN | green | 077 |
| #456–#460 | Hardening guards | CLEAN | green | — |

**Integration sim 070–077:** PASS @ batch branch `c3d35c0` (temp branch deleted).

---

## Credential gates

| Credential | Agent env | Blocks |
|------------|-----------|--------|
| `DEMO_USER_PASSWORD` | UNSET | Wave B browser smoke |
| `RECRUITER_TOKEN` / `TWIN_RECRUITER_TOKEN` | UNSET | Wave C browser smoke |

**Smoke executed this batch:** NO (preflight only — no fake PASS).
