# Investor demo script v1 — 15 minutes

**Duration:** 15 min total (2 + 10 + 2 + 1)  
**Demo date target:** ~30 May 2026  
**Production:** https://twin-sooty.vercel.app  
**Login:** `czechowski@protonmail.ch` + your prod password ([DEMO_LOGIN_FOR_FOUNDER.md](./DEMO_LOGIN_FOR_FOUNDER.md))

**North star (say once):**  
*TWIN returns you from time away to a **short calendar of acceptance-ready moments**—not thousands of CVs or interview spam.*

---

## Before the call (5 min prep, not counted)

- [ ] `./scripts/verify-investor-demo-ready.sh` → `READY`
- [ ] `./scripts/ops-refresh-recruiter-inbox.sh` if inbox was used recently
- [ ] Tabs open: Home → Demo → Dashboard → Calendar → Investor metrics → Recruiter inbox (token URL)
- [ ] Recruiter token from vault (not on slides)
- [ ] Backup: screenshot of `live_db` snapshot JSON if API flaky

---

## 0:00–2:00 — Opening (logged out)

| Show | Say |
|------|-----|
| https://twin-sooty.vercel.app/ | “TWIN is an autonomous career agent: find, match, apply, and schedule interviews while the candidate is away.” |
| Hero → **See demo** | “Prospects see ranked value before signup—reduces funnel friction.” |
| https://twin-sooty.vercel.app/demo | “This is live production data when seeded—matches, an application, an interview hold—not a mockup.” |

**If `/demo` shows static fallback:**  
*“Marketing-safe snapshot today; our demo user binds this to real DB rows after seed—we’ll show the logged-in view next.”*

---

## 2:00–12:00 — Live demo (logged in)

### Login (30 s)

| Show | Say |
|------|-----|
| `/login` | Log in as founder demo account |
| Lands on `/dashboard` | “GDPR consents and profile are production-ready—like a returning user.” |

### Candidate pipeline (3 min)

| Show | Say |
|------|-----|
| `/dashboard` job cards | “Each card is **match %** against skills—ranked pipeline, not inbox volume.” |
| Applied row → **Optimize CV** (if visible) | “Tailored package before the recruiter sees it—acceptance-ready, not spray-and-pray.” |
| Auto-apply strip | “Nightly sweep runs on Celery—agent works while you sleep.” |

**Empty feed fallback:** run `ensure-founder-demo-profile.py` on prod; or show `/demo` JSON.

### Calendar (2 min)

| Show | Say |
|------|-----|
| `/dashboard/calendar` | “Interview holds land on the calendar—Google or Microsoft OAuth, plus ICS for Apple users.” |
| Seeded slot + Meet/ICS | “One tap to export—universal fallback every calendar understands.” |

### Recruiter acceptance (2 min)

| Show | Say |
|------|-----|
| `/recruiter/inbox?company_slug=nova-hiring-pl` (+ token) | “Recruiter sees **pre-qualified** profiles—accept, decline, or reschedule—not blind CV sifting.” |
| Batch accept one row | “State moves to interview—feeds candidate calendar.” |

**Empty inbox fallback:** `./scripts/ops-refresh-recruiter-inbox.sh`.

### Investor lane (2.5 min)

| Show | Say |
|------|-----|
| Header → **Investor** persona | Switch workspace |
| `/investor/metrics` | “Live ops metrics—637 validated jobs, real applications and interviews, honest zeros on MRR until first paid sub.” |
| `/for-investors` → calculator | “Illustrative unit economics: 25% net placement take, referral tiers, founding cohort, calendar slot bonuses—scenario planning, not GAAP.” |
| `/investor/data-room` | “Public pack today; confidential uploads flip on when we wire S3—NDA path is in product.” |

### Persona pricing (1 min)

| Show | Say |
|------|-----|
| `/for-companies#persona-pricing` | “B2B procurement lanes—seat packs separate from candidate subscription.” |
| `/for-recruiters#persona-pricing` | “Recruiter RPO tiers—same north star: fewer profiles, more acceptances.” |

---

## 12:00–14:00 — Metrics & economics (2 min)

| Show | Say |
|------|-----|
| `/investor/metrics` or calculator KPIs | “Three revenue lines: subscription ($4.99/$9.99), placement success fee (50% of monthly salary gross, 25% net to TWIN after candidate share), and B2B seats.” |
| `/status` | “Ops dashboard—mail, Stripe, calendars, worker—what we check before every investor call.” |

**Key numbers (prod 2026-05-23):** 637 jobs · 12 applications · 3 interviews · Stripe checkout ready · 0 verified placements (pilot).

---

## 14:00–15:00 — Close (1 min)

| Say |
|-----|
| “We’re raising to scale the acceptance layer across EU boards—Poland wedge live, Microsoft + Google calendar, placement verification without CS ping-pong.” |
| “Happy to share deck + data room pack under NDA—calendar link for follow-up.” |

**CTA:** `/contact` or mailto with investor subject.

---

## Backup if prod fails

| Failure | Fallback |
|---------|----------|
| API 5xx | Show `/status` cached screenshot; walk `/demo` static + recorded Loom if available |
| Login fails | `/demo` no-login + explain seed password rotation |
| Recruiter token expired | Skip batch accept; show inbox UI screenshot |
| Stripe checkout error | “Checkout wired on prod—demo focuses on free tier + placement economics” |
| Calculator not updated on prod | Walk constants verbally: 25% placement, $15/$25/$100 referral, 1000 founding, $20 / 80,99 zł calendar |

---

## Do not show in 15 min

- Ops curl / terminal
- Scrape-all button on dashboard
- Stripe test card checkout (unless investor asks)
- GitHub/Apple login (not configured)

---

## Related docs

- [INVESTOR_DEMO_RUNBOOK.md](./INVESTOR_DEMO_RUNBOOK.md) — full 25–35 min script + seed
- [INVESTOR_DEMO_GAPS.md](./INVESTOR_DEMO_GAPS.md) — prioritized fixes
- [AUDIT_RESULTS_2026-05-23_claude.md](./AUDIT_RESULTS_2026-05-23_claude.md) — full audit
