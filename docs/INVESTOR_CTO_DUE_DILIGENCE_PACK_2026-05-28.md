# Investor / CTO Due Diligence Pack — 2026-05-28

Branch: `cursor/phase1-monorepo-scaffold`  
Prepared from repository docs and read-only evidence only.

## Executive summary

TWIN is in a controlled pilot-ready state, not a public-launch state. Core web surfaces, candidate dashboard, health endpoints, Stripe checkout surface, and baseline security controls are live. Several gates required for broad launch remain open, especially production confirmation of Alembic `050`, CSP enforce-mode burn-in, and O7 restore-drill evidence.

## Current production URLs and API status

- Frontend: `https://twin-sooty.vercel.app`
- API: `https://twin-production-bcd9.up.railway.app`
- Public health proxy: `https://twin-sooty.vercel.app/api/public-health`
- API/public-health status in referenced docs: `status=ok`, `db_ok=true`, Celery active in read-only checks.

## Controlled pilot GO / investor-CTO GO / public launch NO-GO

- Controlled pilot GO: Yes (pilot process, intake, tracker, and operating docs exist; guarded operations model is in place).
- Investor / CTO diligence GO: Yes for truthful diligence conversations with explicit caveats.
- Public launch GO: No.

Public NO-GO reasons:

1. Alembic `050_stripe_webhook_events` production confirmation not yet logged as PASS.
2. CSP is still report-only; enforce-mode burn-in gate is not yet complete.
3. O7 backup/restore drill evidence is still pending.
4. Remaining partial gates: Apple calendar path/ICS maturity and data-subject-access completeness.

## What is live vs repo-only vs founder action vs migration-dependent

### 1) Live in production (per cited reality matrix and gate checklist)

- Public routes and marketing surfaces (`/`, `/waitlist`, `/demo`, `/status`) are reachable.
- Candidate login/dashboard path is live with manual founder smoke evidence.
- Job corpus/matching and scrape infra are live with operational guardrails.
- Google + Microsoft calendar configuration is marked live in ops status; Apple remains partial.
- Stripe checkout + webhook signature path is live.
- Rate-limits across key auth and mutation surfaces are shipped.
- Cookie/GDPR consent, privacy/terms surfaces, and no-secret gate baseline are present.

### 2) Repo-only or partial (not safe to market as fully live)

- Stripe webhook dedup ledger is partial until Alembic `050` is confirmed on production DB.
- CSP enforce-mode is not live; report-only is live.
- Apple calendar parity is partial (no Apple OAuth; ICS/WebCal path is not represented as full parity).
- Data subject export/delete is marked partial.
- Some candidate-intelligence direction components remain design/docs direction rather than fully shipped product modules.

### 3) Founder action required (manual, non-agent)

- Confirm production Alembic revision (`050_stripe_webhook_events`) using read-only DB check.
- Complete CSP burn-in decision process and enforce rollout only after checklist conditions are met.
- Run and log O7 restore drill evidence in restore-drill log and runbook references.
- Keep canonical deployment/alias checks in sync and resolve any project-branch drift in host dashboards if observed.

### 4) Migration-dependent items

- Stripe event dedup hard guarantee depends on migration `050` being present on production.
- Any claim of full billing idempotency assurance is contingent on migration verification evidence.

## Main blocker summary

- Alembic 050 verification / Stripe dedup: pending production confirmation.
- CSP enforce burn-in: pending 72h enforce-ready gate and zero-unexpected-violation conditions.
- O7 restore drill: pending evidence row and explicit GO/NO-GO log outcome.
- Additional launch gates: data-subject-access partial; Apple calendar parity partial.

## Product direction (current narrative backbone)

Direction is toward a candidate-side career intelligence and trust layer rather than volume spam automation:

- Career Intelligence Layer
- Verified Candidate Gateway
- Candidate Career Brief
- Verified Candidate 360
- Skill Evidence Layer
- Personalized Pre-Apply Feedback
- Living Career Fit Ranking

These are valid directional statements; they should be presented as roadmap and active pilot hardening themes, not as fully delivered public-scale features unless verified in production evidence.

## Security posture summary (current)

- Strengths:
  - Mutation rate-limits expanded across auth and profile/application surfaces.
  - Public no-secret regression coverage is actively maintained.
  - CSP pipeline exists (report-only + sink).
  - Stripe webhook signature path is in place.
  - Security risk register and incident response runbook exist.
- Open items:
  - CSP enforce gate still pending.
  - Stripe dedup production migration confirmation pending.
  - O7 restore drill evidence pending.

## Risk register summary (current)

Key active risks from source docs:

1. Evidence-to-claim drift (messaging outruns proven production state).
2. Verification state-contract incompleteness at scale.
3. Verification observability granularity and KPI coupling still maturing.
4. Launch-gate incompleteness (CSP enforce, migration confirmation, restore drill).

## CTO diligence section

- Tests/CI:
  - Extensive backend pytest and targeted regression additions are documented.
  - Smoke workflow history is documented as green in recent runs.
- Smoke and operational checks:
  - Public-health and route checks are documented as passing in read-only checks.
- Security gates:
  - No-secret regression baseline documented.
  - Rate-limit expansion documented.
  - CSP currently report-only (not enforce).
- Migration state:
  - Requires explicit production Alembic revision verification for `050`.

## Founder communications: what can be sent now

Can send now:

- Waitlist invitation messaging.
- Investor/founder demo invitations.
- Controlled pilot invitation messaging.

Should not claim now:

- Public launch is live.
- "10k jobs live" unless independently verified and evidenced.
- Guaranteed interviews.
- Fully complete billing/KYC unless proven with production evidence.

## Product moat and competition positioning (truthful framing)

Moat framing:

- Candidate-side career intelligence over spam pipelines.
- Verified candidate representation with evidence, consent, and trust.
- Delegated apply only with evidence-based controls; not a blind auto-apply bot.
- Candidate trust + employer trust as dual objective.

Competition positioning:

- Similar verification-grade mechanism category adapted to candidate-side execution.
- Candidate Career Brief and Candidate 360 representation.
- Skill Evidence Layer and personalized pre-apply feedback loop.
- Living ranking model oriented to acceptance-ready opportunities, not inbox volume.

## Investor narrative (non-hype)

TWIN currently demonstrates an operational pilot stack and a credible architecture direction toward an acceptance-ready career operating layer. The immediate value is controlled pilot execution with measurable trust and reliability gates. The near-term upside is unlocking public launch only after remaining operational/security gates are closed and evidenced.

## Evidence sources

- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md`
- `docs/VERIFIED_CANDIDATE_GATEWAY_TECH_AUDIT_2026-05-28.md`
- `docs/FOUNDER_REPORT_19-22_MAY.md`
- `docs/FOUNDER_TASK_REPORT_2026-05-16_to_today.md`
- `docs/AUTONOMOUS_WORKLOG_2026-05-28.md`
- `docs/AUTONOMOUS_TASK_QUEUE_2026-05-28.md`
