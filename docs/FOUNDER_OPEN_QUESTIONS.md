# Founder open questions — TWIN decisions index

English index for decisions raised in **GlobJob - Open Questions (1).docx** (May 2026).  
**Polish decision log:** [`GLOBJOB_OPEN_QUESTIONS_DECISIONS_PL.md`](./GLOBJOB_OPEN_QUESTIONS_DECISIONS_PL.md)  
**Strategy context:** [`STRATEGY_GLOBJOB_GLIMMER_SYNTHESIS_2026-05.md`](./STRATEGY_GLOBJOB_GLIMMER_SYNTHESIS_2026-05.md)

Items marked **HUMAN** need founder input — not auto-resolved in code.

---

## Business model

| Question | TWIN MVP decision | Founder |
|----------|-------------------|---------|
| Core revenue feature? | Hybrid: candidate subscription + B2B placement/success fees + enterprise programs + **flat rate** (10% vacancy spend) in calculator | — |
| Open IP? | No for MVP — moat: consent data, matching, placement events, calendar | — |
| Target customers? | Knowledge-worker candidates (PL→EU), recruiters/HR, investors (separate lane) | — |
| Why will they participate? | Candidates: less noise, calendar of acceptance. Employers: lower cost vs agency | — |
| SaaS vs service? | SaaS + automation — not outsourced recruiters | — |
| Customer acquisition? | Founding wishlist, Gen Z content, B2B “jobs already indexed”, partner API (roadmap) | GTM budget **HUMAN** |
| Product roadmap? | `PRODUCT_ROADMAP.md`, `ROADMAP_100_ACCEPTANCE.md` | — |

---

## Operations

| Question | TWIN decision | Founder |
|----------|---------------|---------|
| Cost structure | Lean: Railway/Vercel, Anthropic, Celery — `RAILWAY_PROD_ENV_PL.md` | — |
| Decision making | Founder-led; agent shipping per `.cursorrules` | — |
| Roles | Dev + founder GTM until PMF | Next hire timing **HUMAN** |
| Capital needs | Pre-seed ~350k–1M USD range in business plans | **Exact raise & entity HUMAN** |
| Liability | Terms + DPA + placement disputes; no guaranteed hire | Legal review **HUMAN** |
| Scaling | Worker off API, scrape allowlist, Stripe live | — |

---

## Investor vs bootstrap

| Question | TWIN decision | Founder |
|----------|---------------|---------|
| How much money? | Align with `/investor/calculator` scenarios — not hard-coded | **Commit target HUMAN** |
| Budget ownership | Founder/board; metrics via `/investor/metrics` | — |

---

## Risk

| Risk | Mitigation | Founder |
|------|------------|---------|
| Product | Lean MVP, pytest, demo seed | — |
| Regulatory | GDPR, `SCRAPING_COMPLIANCE.md` | Scrape appetite **HUMAN** |
| Market fit | Three match lanes + calendar north star | — |
| Competitors | `COMPETITIVE_LANDSCAPE_YC_AI.md` | — |
| Ethics / bias | Transparent AI; Responsible AI checklist — backlog | Policy owner **HUMAN** |

---

## Product

| Question | TWIN decision | Founder |
|----------|---------------|---------|
| Problem? | Noise and asymmetry in global hiring | — |
| MVP? | Scrape + match + apply tracking + calendar + placement hooks (partial) | — |
| Why win? | Gen Z expectations + AI orchestration + lower friction | — |
| Evidence? | Public job-board stats; traction metrics post-launch | — |
| Assets | TWIN repo, PL scrapers, Stripe, Google OAuth | — |
| Buy-in | Employers via contract/API; candidates via freemium/wishlist | First B2B logo **HUMAN** |
| Tradeoffs | Redirect apply vs auto-apply; scrape vs licensed API | Default apply mode **HUMAN** |
| Test pricing? | “Will pay $4.99?” — A/B after Stripe live | — |
| Minimal test? | Wishlist + onboarding + first verified placements | — |
| Build vs buy | LLM APIs, Playwright; ATS webhooks | — |
| Premium vs mass? | Mass acquisition, premium monetization | — |

---

## Contract & pricing (from opisówka + flat rate xlsx)

| # | Question | Options | Status |
|---|----------|---------|--------|
| 1 | **Default B2B commercial model** | Per-hire % salary · flat rate % vacancy spend · hybrid | **HUMAN** |
| 2 | **Success fee tiers** | Opisówka: 10% monthly (non-manager) / 50% (manager+) vs calculator 50% illustration | **HUMAN** + legal |
| 3 | **B2C ladder for MVP** | Full ladder (Free/Standby/Standard/Premium) vs Free + Premium/Pro only | **HUMAN** — Standby on roadmap |
| 4 | **Freemium employer masking** | Product policy: hide company names on Free | **HUMAN** — P1 build |
| 5 | **External brand** | TWIN vs GlobJob/Glimmer in market | **HUMAN** — keep TWIN in product |

---

## Ticket-ready backlog (agent-shippable)

| P | Item | Status |
|---|------|--------|
| P0 | Flat rate in B2B calculator + `/for-companies` | Shipped |
| P0 | Three match lane labels in dashboard feed | Shipped |
| P0 | Strategy synthesis + data room docs | Shipped |
| P1 | Freemium: offer counts without employer names (product) | Backlog |
| P1 | Success fee 10/50% calculator presets | Backlog |
| P2 | Standby $0.99 Stripe SKU | Backlog |
| P2 | Post-apply mock interview / upskill | Backlog |
| P3 | Partner marketplace (50% reseller) | Backlog |

---

*Last synced: May 2026 strategy integration.*
