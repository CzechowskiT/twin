# GlobJob open questions → TWIN decisions (index)

English index for the founder **GlobJob - Open Questions** workbook. Full Polish decision log: [`GLOBJOB_OPEN_QUESTIONS_DECISIONS_PL.md`](./GLOBJOB_OPEN_QUESTIONS_DECISIONS_PL.md). Strategy context: [`GLOBJOB_STRATEGY_SYNTHESIS_2026.md`](./GLOBJOB_STRATEGY_SYNTHESIS_2026.md), gaps: [`GLIMMER_GLOBJOB_GAP_ANALYSIS.md`](./GLIMMER_GLOBJOB_GAP_ANALYSIS.md).

---

## Business model

| Question | TWIN decision (MVP) |
|----------|---------------------|
| Core revenue? | **Hybrid:** candidate subscription (Stripe) + B2B placement/success fees + annual enterprise programs. **Flat rate** (10% of illustrative vacancy spend) in B2B calculator and `/for-companies` tier. |
| Open IP? | **No** for MVP — moat: consent data, matching, placement events, calendar integrations. |
| Target customers? | Knowledge-worker candidates (PL → EU) + recruiters/HR + investors (separate lane). |
| Why will they play? | Candidates: less tab hell, better fit, interview calendar. Employers: lower cost vs agency, less noise. |
| SaaS vs service? | **SaaS + automation** — not outsourced recruiters as core. |
| Acquisition? | Founding wishlist, Gen Z content, B2B “your jobs are already visible,” partner API (roadmap). |
| Roadmap pointer? | `PRODUCT_ROADMAP.md`, `ROADMAP_100_ACCEPTANCE.md`. |

## Operations

| Question | TWIN decision |
|----------|---------------|
| Cost structure | Lean: Railway/Vercel, Anthropic usage, Celery worker — `RAILWAY_PROD_ENV_PL.md`. |
| Decision making | Founder-led; agent shipping per `.cursorrules`. |
| Roles | Dev + founder GTM until PMF. |
| Capital | Pre-seed per business plans (~350k–1M USD range) — **founder confirms**; amounts not committed in code. |
| Liability | Terms + DPA + placement disputes; no guaranteed hire promises. |
| Scaling | Worker off API, scrape allowlist, Stripe live. |

## Investor vs bootstrap

| Question | TWIN decision |
|----------|---------------|
| How much money? | Align with investor calculator scenarios — not hard-coded in repo. |
| Budget ownership | Founder/board; metrics via `/investor/metrics`. |

## Risk

| Risk | Mitigation |
|------|------------|
| Product | Lean MVP, pytest, nightly beats, demo seed |
| Regulatory | GDPR, `SCRAPING_COMPLIANCE.md`, no LinkedIn as placement proof |
| Market fit | Three match lanes + calendar north star as falsifiable hypothesis |
| Competitors | `COMPETITIVE_LANDSCAPE_YC_AI.md` + classic table in synthesis doc |
| Ethics / bias | Transparent AI; Responsible AI checklist — backlog |

## Product

| Question | TWIN decision |
|----------|---------------|
| Problem? | Noise and asymmetry in global hiring. |
| MVP? | Scrape + match + apply tracking + calendar + placement hooks (partial). |
| Why win? | Gen Z expectations + AI orchestration + lower friction than spray-and-pray. |
| Evidence? | Public job-board stats; founder traction metrics post-launch. |
| Assets | TWIN repo, PL scrapers, Stripe, Google OAuth. |
| Buy-in | Employers via contract/API; candidates via freemium/wishlist. |
| Tradeoffs | Redirect apply vs auto-apply; scrape vs licensed API. |
| Test pricing? | “Will pay $4.99?” — A/B after Stripe live. |
| Minimal test? | Wishlist + onboarding funnel + first verified placements. |
| Build vs buy | LLM APIs, Playwright scrape; ATS via webhooks. |
| Premium vs mass? | **Mass acquisition, premium monetization.** |

---

## Ticket-ready backlog (from open questions)

| P | Item |
|---|------|
| P0 | Flat rate in B2B calculator + `/for-companies` — **shipped** |
| P0 | Three match lane labels in product UI — **in progress on gap branch** |
| P1 | Freemium: offer counts without employer names |
| P1 | Align success fee 10%/50% (opisówka) vs calculator illustration |
| P2 | Standby $0.99 Stripe SKU |
| P2 | Post-apply mock interview / upskill paths |
| P3 | Partner marketplace (50% reseller model) |

---

*For Polish stakeholders, prefer `GLOBJOB_OPEN_QUESTIONS_DECISIONS_PL.md`.*
