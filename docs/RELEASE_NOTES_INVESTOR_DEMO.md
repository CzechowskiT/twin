# Release notes — investor demo slice

**Branch:** `cursor/phase1-monorepo-scaffold`  
**Compare:** https://github.com/CzechowskiT/twin/compare/main...cursor/phase1-monorepo-scaffold  
**Runbook:** [INVESTOR_DEMO_RUNBOOK.md](./INVESTOR_DEMO_RUNBOOK.md)

## Summary

- **Seed:** `scripts/seed-investor-demo.py` — demo candidate, jobs, applications, interview, placement events, auto-apply run, recruiter inbox token.
- **Metrics:** `/investor/metrics` — placements + interviews from `mvp-stats`; data-room demo mode flag.
- **Placement story:** `/investor/placement` — verification timeline for investors.
- **ATS:** Greenhouse OAuth (when env set); Lever OAuth stub + webhook hire path; recruiter UI hints when env missing.
- **Data room:** Demo-mode copy when S3 not configured; local upload path documented.
- **Microsoft 365:** Calendar setup wizard copy + Railway checklist link (secrets not in repo).
- **Referrals:** Manual payout messaging (no Stripe Connect in demo).
- **Skipped by request:** Stripe live checkout demo, Stripe Connect referral payout.

## Test plan

- [ ] `cd backend && pytest tests/test_public_mvp_stats.py tests/test_seed_investor_demo.py tests/test_integrations_ats.py tests/test_data_room_upload.py -q`
- [ ] `cd frontend && npm run build`
- [ ] `python3 scripts/seed-investor-demo.py --print-credentials` against staging/prod DB
- [ ] Login demo account → dashboard strip + applications + calendar interview
- [ ] Recruiter inbox accept/decline with seeded token
- [ ] `/investor/metrics` and `/investor/placement` load without auth

## Deploy notes

Push branch → Railway API (migrations via `start-api.sh` or `./scripts/railway-alembic-upgrade.sh`) + Vercel frontend. Re-run seed once per environment after deploy.
