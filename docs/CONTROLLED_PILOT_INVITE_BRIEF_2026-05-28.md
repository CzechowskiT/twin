# Controlled Pilot Invite Brief — 2026-05-28

**Updated:** 2026-06-06 — limited recruiter pilot pack added
**Audience:** founder outbound, investor intros, pilot candidate/recruiter invites

## Pilot status

Controlled pilot is **GO**. Public launch is **NO-GO**. Limited recruiter pilot pack is **READY FOR FOUNDER DECISION** (3–5 named recruiters).

| Cohort | Doc | Status |
| ------ | --- | ------ |
| **Candidates** (≤20) | `docs/PILOT_TRACKER.csv`, `docs/PILOT_OFFER_FINAL.md` | GO |
| **Recruiters** (3–5) | `docs/LIMITED_RECRUITER_PILOT_PACK_2026-06-06.md` | PACK READY — founder outbound pending |

## Invite objective

Invite a limited, named cohort into a monitored pilot to validate **calendar-of-acceptance** workflows under real usage constraints, without public-scale messaging.

**Recruiter-specific:** Validate **pre-qualified inbox** (match score + reasons + **review card**, accept/decline) — see `docs/LIMITED_RECRUITER_PILOT_INVITES_2026-06-06.md` and `docs/RECRUITER_TRUST_ROADMAP_2026-06-06.md`.

## What we can honestly offer now

- Access to current production product surfaces.
- Guided demo and monitored pilot onboarding.
- Candidate flow with matching/dashboard and constrained pilot operations.
- **Recruiter:** token inbox, match transparency, job POST (pilot).
- Transparent caveats about what is still gate-dependent.

## What we must not promise

- Public launch availability.
- Guaranteed interviews.
- Scale claims such as "10k jobs live" unless verified.
- Fully complete billing/KYC unless explicitly evidenced in production.
- Auto-apply or delegated submit **live** on production (both **PAUSED** / **NOT LIVE**).
- Recruiter watchlists, HM packets, SSO (roadmap only).
- “Replace recruiters” or two-sided marketplace liquidity.

## Pilot messaging template (short)

"We are inviting a small pilot cohort to test TWIN's ranked pipeline toward acceptance-ready calendar items. This is a controlled rollout with active monitoring and clear guardrails. You will get guided access, and we will share what is live today vs what is still being finalized before public launch."

**Recruiter variant (PL):** „Zapraszamy do wąskiego pilotażu skrzynki akceptacji — wynik dopasowania i powody, Ty decydujesz o rozmowie. Bez publicznego launchu; auto-apply wstrzymane.”

## Current production references

- Frontend: `https://twin-sooty.vercel.app`
- API: `https://twin-production-bcd9.up.railway.app`

## Gate-aware caveats to include in pilot conversations

1. ~~Stripe dedup migration (`050`)~~ — ✅ **PASS** on prod (2026-05-29).
2. ~~CSP report-only~~ — ✅ **S2 PASS** — enforce live; post-enforce smoke `2026-06-05T16:20:13Z`.
3. ~~O7 backup/restore drill~~ — ✅ **PASS** (2026-06-01 staging clone).
4. Public launch remains **NO-GO** until founder limited-launch decision beyond controlled cohorts.
5. Recruiter inbox **R1–R4 PASS** `2026-06-06T16:07:18Z` — safe for named recruiter pilot; not public recruiter GTM.

## Pilot acceptance criteria (operational)

- Named participant onboarding only (no open public campaign).
- Read-only production health checks remain green.
- No bypass of consent/safety controls.
- Pilot feedback captured in tracker (`PILOT_TRACKER.csv` or `LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md`).

## Suggested next narrative queue after pilot invites

1. Candidate Career Brief exemplar (truthful, evidence-bound).
2. Candidate 360 exemplar with explicit "pilot" watermarking.
3. Skill Evidence Layer acceptance criteria.
4. Living ranking explanation with non-deterministic caveats.
5. Recruiter pilot synthesis (week 4) — `docs/LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md` § Synthesis.

## Related

- `docs/LIMITED_RECRUITER_PILOT_PACK_2026-06-06.md`
- `docs/LIMITED_RECRUITER_PILOT_INVITES_2026-06-06.md`
- `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md`
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`

## Hard bans honoured

- ✅ Docs only · no secrets · no public GO · no auto-apply/delegated enable
