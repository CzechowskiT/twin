# Glimmer / GlobJob → TWIN — gap analysis (founder materials, May 2026)

**Sources analyzed:** Glimmer/Nexus business plans, GlobJob opisówka, User Experience, Open Questions, B2B flat rate spreadsheet, YC AI Company List, “global job market” concept memo.  
**Product brand in repo:** **TWIN** (GlobJob/Glimmer/Nexus = strategy evolution, not a UI rebrand).  
**North star:** short **calendar of acceptance-ready moments** — not spray-and-pray volume.

Related: `docs/GLOBJOB_STRATEGY_SYNTHESIS_2026.md`, `docs/GLOBJOB_OPEN_QUESTIONS.md`, `docs/COMPETITIVE_LANDSCAPE_YC_AI.md`.

---

## 1. What the founder documents say (synthesis)

### 1.1 Vision & positioning

| Theme | Document signal |
|-------|-----------------|
| **Inverted market** | Jobs find the candidate; AI monitors requirements in real time; one-tap apply after consent. |
| **Global corpus** | Scrape + later employer contracts/APIs; multilingual; “all job offers worldwide” as ambition. |
| **Three match lanes** | (1) ready now, (2) near-miss with upskill path, (3) stretch / interview practice. |
| **Gen Z UX** | Channel + cadence choice (instant / daily / weekly); personalization; low friction. |
| **Not an agency** | Marketplace + opportunities; placement economics without recruiter ping-pong. |
| **Scalable AI curator** | Quality of boutique (Hired) at aggregator scale (LinkedIn/Indeed) — Nexus/Glimmer thesis. |

### 1.2 Business model

**B2C (User Experience doc):**

| Tier | Price | Behavior |
|------|-------|----------|
| Freemium | $0 | Offer **counts** by role; **no employer names**; **no apply** — hunger to upgrade |
| Standby | $0.99/mo | Frozen profile; no apply |
| Standard | $1.99/mo | Apply; ~80% match band only |
| Premium | $4.99/mo | Full AI, calendar, gamification, near-miss paths |
| “Kosmos” | $9.99/mo | Virtual being (Virbe) — optional |

Post-hire: ~$5/mo “career network” success fee — retention lane.

**B2B (opisówka + flat rate xlsx):**

- Success fee: presented **10% monthly salary** (non-manager) or **50%** (manager+) of monthly pay, one-time per hire; 12-month lookback; pay after 14 days employed.
- **Flat rate spreadsheet:** 1,000 FTE × 15% rotation → 150 vacancies × 500 PLN floor = **75,000 PLN** traditional → **7,500 PLN** at **10%** of that vacancy spend (not % of salary).
- Annual workspace programs (Growth/Scale/Enterprise) in founder materials align with TWIN procurement tiers.
- Partner resale (e.g. assessment vendors): **50% of flat fee** — backlog.

**Investor:**

- Pre-seed/seed **~350k–1.5M USD**; MVP **6–9 months**; HR Tech TAM cited ($32B+ online recruiting, faster-growing AI subsegment).

### 1.3 User journeys (condensed)

**Candidate:** profile → AI gap analysis → per-offer CV with one “yes” → notifications (3 lanes) → RODO + apply → post-apply upskill/tests/mock interview → optional career coach after hire.

**Employer:** reduce noise; global reach; verified pool; later ATS; David persona (500 FTE, cost pressure).

**MVP legal posture (opisówka):** employer agreements before full scrape of branded listings; OChK hosting mentioned for PL.

### 1.4 Competitive references in docs

LinkedIn/Indeed (scale/noise), Hired/Vettery (quality/cost), Upwork/Fiverr (gig, out of Phase 1), Rezi/Kickresume (point CV tools). YC list adds **Apriora**, **Parasale**, **DianaHR** as AI-native HR adjacents — see `docs/COMPETITIVE_LANDSCAPE_YC_AI.md`.

**Naming trap:** YC **Glimmer** = PDF search, **not** this HR vision — avoid in investor deck.

---

## 2. What TWIN already has ✅

| Area | Shipped / in repo |
|------|-------------------|
| Core loop | Scrape (PL boards), matching, dashboard feed, application tracking |
| Autonomy | Nightly auto-apply (allowlist), consent settings, Celery worker |
| Calendar north star | Google Calendar + ICS/WebCal; interview holds; demo script |
| B2B economics | B2B ROI calculator; **flat rate block** (founder spreadsheet defaults); `/for-companies` tier |
| Placement | Verification state machine, employer attest, ATS webhooks (partial) |
| Personas | Marketing: candidates, recruiters, companies, investors — PL/EN |
| Monetization | Stripe Premium/Pro; billing UI |
| Investor | `/investor`, scenario calculator, metrics, demo runbook |
| Compliance | RODO onboarding, scraping compliance doc, i18n |
| Strategy docs | `GLOBJOB_STRATEGY_SYNTHESIS_2026`, open questions decisions (PL) |
| Career UX slice | `/workspace/candidate/jobs` discovery hub (match bands, CV gaps, interview prep stub) |
| Copy alignment | Three-lane match narrative on `/for-candidates` pillars (EN/PL) |

---

## 3. What is missing ❌

| # | Gap | Source | Priority | Notes |
|---|-----|--------|----------|-------|
| 1 | **Freemium teaser**: live offer counts **without employer names** on Free | UX doc | **P0** demo story | Marketing + product policy; may need API counter |
| 2 | **Three lanes in product UI** (not only marketing copy) | UX, opisówka | **P0** | Map match bands → ideal / near / stretch in feed & jobs hub |
| 3 | **Standby $0.99** SKU | UX doc | P1 | Stripe SKU + frozen profile flag |
| 4 | **Standard $1.99** (~80% matches only) | UX doc | P1 | Entitlement gating vs Premium |
| 5 | **B2B success fee tiers** 10% vs 50% by level | Opisówka | P1 | Contract + calculator presets |
| 6 | **Post-hire $5/mo career network** | UX doc | P2 | growth lane partially in persona copy only |
| 7 | Mock interview / gamified upskill **after apply** | Glimmer, UX | P2 | Stubs in career hub; LLM depth backlog |
| 8 | Partner marketplace (50% reseller) | Opisówka | P3 | Docs only |
| 9 | Native mobile app | Docs | P3 | Web-first MVP |
| 10 | 10M offers / scrape without contracts | Glimmer GTM | Risk | Staged compliance in `SCRAPING_COMPLIANCE.md` |
| 11 | Glimmer Lens browser extension | Glimmer 2.0 | P3 | Not started |
| 12 | **Investor one-pager + top-10 Q&A** in data room | This integration | **P0** docs | `TWIN_PITCH_ONE_PAGER.md`, `INVESTOR_QA_TOP10.md` |
| 13 | **YC competitive landscape** artifact | YC xlsx | **P0** docs | `COMPETITIVE_LANDSCAPE_YC_AI.md` |

---

## 4. Priority for investor demo (P0 / P1)

### P0 (show or tell in room)

1. **North star line** + calendar + ranked feed (existing demo script).
2. **B2B flat rate** story with calculator + `/for-companies` tier (spreadsheet: 75k → 7.5k PLN example).
3. **Three match lanes** — say on dashboard; show on `/workspace/candidate/jobs` with band → lane labels.
4. **Data room docs:** this file, YC landscape, pitch one-pager, investor Q&A top 10.
5. **Placement verification** — not email ping-pong (`PLACEMENT_VERIFICATION.md`).

### P1 (credibility, can be roadmap slide)

- Freemium offer-count teaser (even if static in demo).
- Standby / Standard SKUs on roadmap slide.
- Microsoft calendar OAuth (in `.cursorrules` next priority).
- Employer “your jobs are already indexed” GTM line.

### P2+

- Full post-hire coach, partner marketplace, native app.

---

## 5. Founder decisions still required

1. **Default B2B contract model:** per-hire % salary vs **flat rate** (% vacancy spend) vs hybrid.
2. **Exact B2C ladder:** ship Standby/Standard or collapse to Free + Premium/Pro for MVP.
3. **Success fee math:** opisówka 10/50% monthly vs calculator 50% monthly illustration — legal wording.
4. **Raise size & entity:** Delaware + PL sp. z o.o. — counsel, not repo.
5. **Scrape aggressiveness** vs signed employer deals — compliance appetite.
6. **Brand:** keep **TWIN** vs resurrect GlobJob/Glimmer externally.

---

## 6. Implementation trace (this branch)

| Deliverable | Status |
|-------------|--------|
| `docs/GLIMMER_GLOBJOB_GAP_ANALYSIS.md` | This file |
| `docs/COMPETITIVE_LANDSCAPE_YC_AI.md` | Added |
| `docs/GLOBJOB_OPEN_QUESTIONS.md` | Added (EN index + decisions) |
| `docs/TWIN_PITCH_ONE_PAGER.md` | Added |
| `docs/INVESTOR_QA_TOP10.md` | Added |
| B2B flat rate product | Already in `b2b-roi-calculator-model` + `/for-companies` |
| Three-lane labels in UI | `job-list.tsx` + `match-lane.ts` on dashboard feed |
| Demo script | Step for three lanes + jobs hub |
| Freemium / Standby marketing | Persona tier bullets (Standby roadmap) |

---

*Synthesized for TWIN — no verbatim founder document text.*
