# TWIN — one-pager (investor / partner)

**One line:** Autonomous career agent that returns people from time away to a **short calendar of acceptance-ready interviews** — not thousands of CVs or random recruiter spam.

**Brand:** **TWIN** (“your career twin”). Founder strategy docs used working names GlobJob / Glimmer / Nexus; product ships as TWIN. *(YC company “Glimmer” is unrelated — PDF search.)*

---

## Problem

- **Candidates:** spray-and-pray applications, ghosting, manual CV rewrites, foreign boards invisible, Gen Z expects personalization not tab hell.
- **Employers:** expensive hires, limited pools, hundreds of unqualified applications per role, declarative CVs hard to trust.

## Solution

1. **Aggregate & validate** job corpus (Phase 1: PL boards; architecture for more).
2. **Rank** into three lanes: ready now · near-miss with upskill path · stretch (practice).
3. **Apply with consent** — auto-apply where legal and configured; track status centrally.
4. **Land on calendar** — Google + ICS/WebCal (Microsoft Graph on roadmap); recruiter batch accept/decline.
5. **Verify placement** — machine-assisted events + employer attestation; disputes in queue, not email ping-pong.

## Why now

- Gen Z share of workforce rising; they reject broken hiring UX.
- LLMs make profile intelligence + per-role CV feasible at scale.
- Employers need **curation at scale**, not another job board.

## Business model (illustrative)

| Side | Mechanism |
|------|-----------|
| **B2C** | Free → Premium (~$4.99) / Pro (~$9.99); roadmap Standby/Standard per founder ladder |
| **B2B** | Success fee on verified placement + annual Growth/Scale/Enterprise programs |
| **B2B alt** | **Flat rate:** e.g. 10% of vacancy posting spend (founder model: 1k FTE, 15% rotation, 500 PLN/vacancy floor → 7.5k PLN vs 75k PLN traditional) — see `/calculator/b2b` |
| **Investor** | Scenario calculator at `/investor` (post-login) |

## Traction / demo

- Live MVP: matching, applications, calendar, placement hooks, recruiter inbox, investor metrics.
- Demo user + seed: `docs/INVESTOR_DEMO_RUNBOOK.md`.
- Public status: `/status` (when deployed).

## Moat (directional)

- Consent-first candidate graph + placement event ledger.
- Compliance-first scraping → contracts/APIs.
- Calendar-of-acceptance UX habit, not raw volume.

## Ask (template — founder fills)

- **Round:** Pre-seed / seed  
- **Use:** corpus expansion, Stripe live, Microsoft calendar, first B2B pilots  
- **Milestones:** wishlist → paid candidates → verified placements → repeatable B2B flat rate or success-fee deals  

## Links (repo)

| Asset | Path |
|-------|------|
| Gap analysis vs founder docs | `docs/GLIMMER_GLOBJOB_GAP_ANALYSIS.md` |
| YC competitive sheet | `docs/COMPETITIVE_LANDSCAPE_YC_AI.md` |
| Open questions | `docs/GLOBJOB_OPEN_QUESTIONS.md` |
| Investor Q&A | `docs/INVESTOR_QA_TOP10.md` |
| Placement verification | `docs/PLACEMENT_VERIFICATION.md` |
| Demo script | `docs/INVESTOR_DEMO_SCRIPT.md` |

---

*Illustrative economics only — not an offer. © TWIN team.*
