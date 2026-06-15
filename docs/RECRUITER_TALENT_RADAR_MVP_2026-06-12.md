# Recruiter Talent Radar / Sourcing Memory Agent MVP — 2026-06-12

## Competitive rationale

Generic AI sourcing tools optimize for volume and opaque ranking. TWIN Talent Radar optimizes for **trust**: resurfacing candidates the workspace already knows, with explainable signals, timing context, and explicit human-review gates — aligned with the north star of **acceptance-ready calendar moments**, not inbox spam.

**EN:** Talent Radar / Sourcing Memory Agent  
**PL:** Radar Talentów / Agent Pamięci Sourcingowej

Core narrative (PL): *Zacznij od kandydatów, których TWIN już zna — zanim rozpoczniesz sourcing od zera.*

## What it does

| Capability | Detail |
| ---------- | ------ |
| Resurface known candidates | Top 10 suggestions from internal workspace data |
| Explainability | Why surfaced, why now, evidence, risks, missing data |
| Filters | Role/job, segment, timing window, signal type |
| Human next steps | Review card, shortlist, draft-only outreach, snooze, dismiss |
| Decision cockpit UX | Summary stats panel, fit bands (80/60/40), grouped review queues, scannable cards with expandable details |
| Pilot honesty | Demo pool label, data quality warnings, no external sourcing claims |

## What it does NOT do (hard bans)

- No automatic outreach or email send
- No LinkedIn scraping or external sourcing MVP
- No “AI chose the best candidate” or guaranteed fit language
- No public launch GO, auto-apply, or delegated apply
- No hidden PII (email, phone, CV text)
- No auth/CSP weakening or destructive DB changes

## Routes

| Surface | Path |
| ------- | ---- |
| UI | `/recruiter/talent-radar` |
| Hub tile | `/recruiter` → Radar Talentów (Pilot) |
| BFF proxy | `GET /api/recruiter/talent-radar` |
| API | `GET /api/v1/recruiter/talent-radar` |

Auth: same as inbox — `X-Twin-Recruiter-Token` + `company_slug`.

Contextual links: `/recruiter/search`, `/recruiter/pipeline`, `/recruiter/inbox`.

## Data sources

- Applications + jobs (company-scoped)
- Recruiter inbox / pipeline status
- Review cards + match explanations
- Recruiter scorecards (when present)
- Employer-posted roles (`list_company_jobs`)
- Demo/pilot seed (`nova-hiring-pl`) when applicable

## Ranking / signals model

Transparent weighted score (0–100) from:

**Positive:** skill overlap, prior shortlist/invite, positive scorecard, evidence completeness, role similarity, stale-but-strong revisit window.

**Negative:** missing evidence, stale data, prior hard rejection, low data confidence.

Every suggestion includes `why_surfaced`, `why_now`, `risks`, `missing_data`, `data_confidence`, and `human_decision_required: true`.

## Human review

Required disclaimer (EN): *Talent Radar surfaces signals and context. The recruiter decides whether and how to contact the candidate.*

Outreach draft opens a **fixed modal** (copy-only) — not sent by TWIN. Strong `bg-slate-950/85` overlay with `backdrop-blur-md` blocks card bleed-through. Clicking **Prepare outreach draft** shows loading state, opens the solid panel with copy-only badge, role context and safe personalization placeholder, logs `draft_prepared` audit metadata (no message body), and shows a **Draft prepared — not sent** badge on success.

## Tests

```bash
cd frontend && npm run test:recruiter-talent-radar-mvp
cd frontend && npm run test:recruiter-talent-radar-premium-ux
cd frontend && npm run test:recruiter-talent-radar-draft-action
cd frontend && npm run test:recruiter-talent-radar-visual-polish
cd ../backend && pytest tests/test_recruiter_talent_radar.py -q
```

### Premium UX cockpit (2026-06-15)

| Surface | Detail |
| ------- | ------ |
| Summary panel | Candidates, strong matches, needs verification, low confidence + no-auto-outreach note |
| Fit bands | Strong 80–100, Good 60–79, Possible 40–59, Low 0–39 (visual badges) |
| Groups | Review first / Possible match / Needs verification / Low confidence |
| Cards | Premium header (name, role, fit, decision, evidence badges); grouped chips; nested expandable details (evidence/risks/missing/last decision); separated CTA tiers |
| Draft modal | `bg-slate-950/85` overlay; copy-only badge; message box; copy primary / review secondary / close tertiary; ESC + focus trap |
| Trust footer | Copy-only outreach reminder at page bottom |
| CTA hierarchy | Primary: open review card; secondary: draft / shortlist / snooze / dismiss |
| Filters | Premium toolbar with helper text |

## Launch stance

**Public launch NO-GO unchanged.** Pilot-only recruiter workspace tool.

## Future roadmap (not in this MVP)

- ATS import for richer memory
- External signals (consent-aware)
- Consent-aware outreach workflows
- Role-based radar subscriptions
- Weekly talent digest
