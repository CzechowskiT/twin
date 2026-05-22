# Investor demo runbook

Branch: `cursor/phase1-monorepo-scaffold`. **Stripe checkout and Stripe Connect payouts are out of scope** for this demo.

## One-time seed (Railway or local)

```bash
# From repo root — requires DATABASE_URL (Railway Postgres or local)
python3 scripts/seed-investor-demo.py --print-credentials
```

| Field | Default |
|-------|---------|
| Email | `investor-demo@twin.local` |
| Password | `InvestorDemo2026!` |
| Company | `Twin Demo Corp` → slug `twin-demo-corp` |

Override with `INVESTOR_DEMO_EMAIL`, `INVESTOR_DEMO_PASSWORD`, `INVESTOR_DEMO_COMPANY`.

**Creates (idempotent):** CV profile, 3 validated jobs (pracuj.pl + rocketjobs.pl), auto-applied + interview + hired applications, placement event timeline on hired row, scheduled interview (+3 days), auto-apply consent + `auto_apply_runs` row, recruiter inbox token (printed once).

After API deploy with migrations, run seed against **production** `DATABASE_URL` once before the meeting.

## Demo script (30–40 min)

### 1. Candidate — calendar of acceptance

1. `/login` → `investor-demo@twin.local` / `InvestorDemo2026!`
2. `/dashboard` — **Nightly auto-apply strip** (last run / next run labels)
3. `/dashboard/settings/auto-apply` — consent on; optional **Run now** (Pracuj.pl)
4. `/dashboard` → Applications — auto-applied row, interview row, hired + **placement events** expander
5. `/dashboard/calendar` — scheduled demo interview; Microsoft block shows setup wizard + [env checklist](./RAILWAY_PROD_ENV_CHECKLIST.md) when secrets missing

### 2. Recruiter — batch accept

1. `/recruiter/inbox?company_slug=twin-demo-corp` + token from seed (`--print-credentials`)
2. Accept / decline pre-qualified rows → status moves to interview / rejected

### 3. ATS

1. `/recruiter/integrations/ats` — **Greenhouse OAuth** when `GREENHOUSE_*` env set; **Lever stub** copy + hire webhooks
2. Webhook URLs on screen; secrets via Railway only ([checklist](./RAILWAY_PROD_ENV_CHECKLIST.md))

### 4. Investor surfaces

| URL | What to show |
|-----|----------------|
| `/workspace/investor` | Lane home |
| `/investor/metrics` | Live `GET /api/v1/public/mvp-stats` (placements, interviews, data-room demo flag) |
| `/investor/placement` | Placement verification timeline (illustration + seed note) |
| `/investor/data-room` | Traction pack; NDA stub; **demo mode** banner when S3 off |
| `/investor/calculator` | Scenario export |

### 5. Referrals (no Stripe Connect)

`/dashboard/referrals` + `/dashboard/referrals/cash-out` — manual payout copy; request queue only.

### 6. Ops proof — nightly auto-apply

```bash
./scripts/verify-prod-health.sh
curl -sS "$API_URL/api/v1/health/celery-status" | python3 -m json.tool
# Bearer OPS_ADMIN_TOKEN:
curl -sS -H "Authorization: Bearer $OPS_ADMIN_TOKEN" "$API_URL/api/v1/ops/auto-apply/last-run"
```

Morning check (after 02:00 Europe/Warsaw): worker log `nightly_auto_apply_sweep`, new `auto_apply_runs` row — see [NIGHTLY_AUTO_APPLY_DEPLOY.md](./NIGHTLY_AUTO_APPLY_DEPLOY.md).

### 7. Scrapers

Registry includes **pracuj.pl** and **rocketjobs.pl**. Ops: `POST /api/v1/jobs/scrape?job_board=pracuj` (auth) or Celery beat.

## Deploy

```bash
git push origin cursor/phase1-monorepo-scaffold   # Vercel + Railway auto-deploy
./scripts/railway-alembic-upgrade.sh              # if new migrations on branch
python3 scripts/seed-investor-demo.py --print-credentials   # prod DB once
./scripts/verify-prod-health.sh
```

## Compare / release

- Release notes: [RELEASE_NOTES_INVESTOR_DEMO.md](./RELEASE_NOTES_INVESTOR_DEMO.md)
- GitHub compare: `https://github.com/CzechowskiT/twin/compare/main...cursor/phase1-monorepo-scaffold`

## Railway secrets only (cannot seed in repo)

| Area | Env names |
|------|-----------|
| Microsoft 365 calendar | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_CALENDAR_REDIRECT_URI`, `MICROSOFT_TENANT` |
| Greenhouse OAuth | `GREENHOUSE_CLIENT_ID`, `GREENHOUSE_CLIENT_SECRET`, `GREENHOUSE_OAUTH_REDIRECT_URI` |
| Greenhouse / Lever webhooks | `GREENHOUSE_WEBHOOK_SECRET`, `LEVER_WEBHOOK_SECRET` |
| Lever OAuth (stub until wired) | `LEVER_CLIENT_ID`, `LEVER_CLIENT_SECRET`, `LEVER_OAUTH_REDIRECT_URI` |
| Data room S3 | `S3_BUCKET_NAME`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_ENDPOINT_URL` (optional) |
| Mail | `RESEND_API_KEY`, `MAIL_FROM` |
| Stripe (skipped in demo) | `STRIPE_*` |
