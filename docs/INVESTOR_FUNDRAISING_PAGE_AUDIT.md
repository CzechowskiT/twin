# Investor fundraising page audit

**Purpose:** Align TWIN’s public investor surfaces with what Polish/EU/global angels, Y Combinator, venture capital, and private equity reviewers expect in the first 90 seconds — without vanity metrics or slide-deck fiction.

**North star (all audiences):** Return from time away to a **short calendar of acceptance-ready moments** — candidates see slots worth showing up for; recruiters see profiles already matched to the bar. Every investor-facing line should trace to that outcome or to honest Phase 1 scope.

**Live surfaces (repo):** `/for-investors`, `/for-investors/yc`, `/investor/metrics` (workspace), `/investor/data-room`, `GET /api/v1/public/mvp-stats`, FAQ → Investors tab.

---

## Angels (Poland / EU / global) — 90-second scan

Angels (especially PL/EU) typically check, in order:

| Signal | What they want | TWIN response |
|--------|----------------|---------------|
| **Founder clarity** | One sentence: what changes for the user | Hero: calendar of acceptance vs inbox spam |
| **Stage honesty** | Pre-seed / seed, not pretending Series B | “Phase 1 MVP” + early-stage labels on low counts |
| **Traction shape** | Real usage, not ARR fiction | Live `mvp-stats`: jobs corpus, users, applications, interviews — labeled beta/pilot |
| **Market wedge** | Why Poland/EU first | PL boards (pracuj.pl, rocketjobs.pl) + EU expansion path in roadmap |
| **Legal / GDPR** | Cookie consent, DPA path | Privacy, cookie settings, in-product placement verification (no CS ping-pong) |
| **Ask / cap table** | Dilution, SAFE, cap | FAQ: cap table N/A pre-round; contact for deck — no fake cap table |
| **Warm intro path** | Email or 1-click deck | Mailto + `/contact` with investor subject; data room CTA |

**90s pass criteria:** Hero + traction strip + “what’s live vs next” + security one-liner + CTA. Avoid: inflated MAU, “$10M ARR” placeholders, anonymous testimonials.

---

## Y Combinator — traction, clarity, demo, team, market

YC partners and alumni angels weight:

| Dimension | Expectation | TWIN implementation |
|-----------|-------------|---------------------|
| **Traction** | Growth or deep engagement in a wedge | Public metrics JSON + dashboard; honest “pilot-shaped” copy |
| **Clarity** | Problem → solution → why now in &lt;30s | One-liner north star; lane boundaries (candidate / recruiter / company / investor) |
| **Demo** | Works in browser | `/demo`, seeded investor walkthrough (`docs/INVESTOR_DEMO_RUNBOOK.md`), `/status` |
| **Team** | Who builds; domain insight | About + contact; no fake “advisory board” |
| **Market** | Large outcome; credible entry | EU hiring + cross-board layer; job boards as supply, TWIN as acceptance layer |
| **YC-specific route** | Fast path for YC reviewers | `/for-investors/yc`: demo links, 1-page metrics, FAQ anchor |

**YC red flags we avoid:** Vanity KPIs, mixing investor calculator with employer procurement pricing, claiming full ATS replacement on day one.

---

## Venture capital — metrics, moat, GTM, unit economics

VC diligence (seed / Series A) expects:

| Area | Question | Honest Phase 1 answer |
|------|----------|------------------------|
| **Metrics** | MAU, retention, revenue | MAU proxy = registered users (labeled); revenue pre-scale — Stripe wiring “configurable”; placement verification for success-fee logic |
| **Moat** | Defensibility | Cross-board normalization, consent-gated automation, acceptance UX, calendar-synced outcomes — not listing inventory alone |
| **GTM** | Wedge and expansion | Poland-first boards → EU corporates; parallel recruiter/company lanes |
| **Unit economics** | CAC, LTV, take rate | Placeholder honesty: success-fee / subscription models in **illustrative** investor calculator only — not audited forecasts |
| **Technical** | Stack, security | FastAPI, Celery, Postgres; GDPR consent; ops on `/status` |
| **Data room** | Deck, financials, cap table | Public pack (metrics, OpenAPI, status); confidential behind request + NDA stub |

**VC pass:** `/investor/metrics` + calculator + FAQ (dilution, stage, Poland+EU). **Fail:** Presenting calculator outputs as GAAP forecasts.

---

## Private equity — later-stage signals (honest if pre-revenue)

PE (or growth funds) look for EBITDA, cohort retention, payback — **not applicable at pre-revenue MVP**. Site must say so explicitly:

| PE signal | Pre-revenue stance |
|-----------|-------------------|
| Recurring revenue | Not yet — Stripe checkout “configurable”; pilot pricing via waitlist/founders terms |
| Net retention | N/A — disclose pilot cohort size from `mvp-stats` |
| Margin structure | Placement verification designed to avoid manual CS tennis (margin-positive at scale) |
| Exit / leverage | Out of scope for Phase 1 page |

**PE FAQ:** Stage = Phase 1 MVP; financials and cap table in data room on request; no pretend LBO narrative.

---

## Implementation checklist (this pass)

- [x] `/for-investors` — hero, live traction, roadmap, security/GDPR, data room CTA, deck contact
- [x] `/for-investors/yc` — YC reviewer fast path
- [x] `/investor/metrics` — MAU proxy, config flags, early-stage labels
- [x] FAQ investors — angels / VC / PE concerns (dilution, cap table, stage, PL+EU)
- [x] Homepage/footer — subtle “For investors” link
- [x] No fake metrics — `mvp-stats` only; removed hardcoded fallback in `useMvpStats`
- [x] EN + PL copy — professional, non-hype

---

## Maintenance

- Refresh traction copy when `mvp-stats` crosses meaningful thresholds (e.g. interviews_scheduled &gt; 10).
- After fundraising round opens: update FAQ cap table answer from “N/A pre-round” to actual instrument (SAFE, etc.) — still no fabricated numbers on marketing pages.
- Re-run `npm run build` before investor sends; verify `/api/v1/public/mvp-stats` on target environment.
