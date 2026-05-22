# Investor demo runbook

Branch: `cursor/phase1-monorepo-scaffold`. **Stripe checkout is not required** for the walkthrough (Free tier + `AUTO_APPLY_REQUIRE_PREMIUM=false` by default).

**Production frontend:** https://twin-sooty.vercel.app  
**Production API:** https://twin-production-bcd9.up.railway.app (also `https://twin-sooty.vercel.app/api/v1/…` via proxy)

---

## One-time seed (Railway or local)

**Warning:** `DATABASE_URL` must point at the database you intend to change (staging vs production). The script is **idempotent** — safe to re-run before a demo.

```bash
# From repo root — password never committed; 12+ characters
export DEMO_USER_PASSWORD='your-secret-here'   # or INVESTOR_DEMO_PASSWORD
export DEMO_USER_EMAIL=demo@twin.career        # optional (default below)
python3 scripts/seed-investor-demo.py --reset-password
python3 scripts/seed-investor-demo.py --print-credentials   # one-time recruiter inbox token
```

On Railway (linked project):

```bash
export DEMO_USER_PASSWORD='…'
railway run python3 scripts/seed-investor-demo.py --reset-password
```

| Field | Default |
|-------|---------|
| Email | `demo@twin.career` (`DEMO_USER_EMAIL`) |
| Password | **env only** — script does not print it |

**Creates / updates:**

- User: GDPR consents, `email_verified_at`, `onboarding_completed_at`, free plan
- Candidate: realistic CV text + skills
- **5** validated jobs (`pracuj`, `investor-demo-*` external IDs)
- **5** `job_matches` with high scores (92–96)
- **1** application in **applied** (CV optimize on dashboard)
- **1** `scheduled_interview` (+3 days, Europe/Warsaw, Meet link placeholder)
- Auto-apply consent + recent `auto_apply_runs` row (dashboard strip)
- Placement events on primary application (declare → verified) for dashboard timeline
- Extra **applied** rows on same company for recruiter batch inbox (`nova-hiring-pl`)
- Optional recruiter token when `--print-credentials` and no active token exists

Script output includes `user_id`, `application_id`, `interview_id` — store the password in your vault when you set it.

---

## No-login demo mode (marketing)

Set on the **API** service (Railway / local `.env`):

```bash
DEMO_MODE_ENABLED=true
DEMO_USER_EMAIL=demo@twin.career
```

| Surface | URL |
|---------|-----|
| Snapshot JSON | `GET /api/v1/demo/snapshot` |
| Production (direct) | https://twin-production-bcd9.up.railway.app/api/v1/demo/snapshot |
| Production (proxy) | https://twin-sooty.vercel.app/api/v1/demo/snapshot |
| Marketing UI | https://twin-sooty.vercel.app/demo |

- `DEMO_MODE_ENABLED=false` → **404** (no leak)
- Enabled, not seeded → `source: static_fallback` (fictional companies, no email)
- Enabled + seed → `source: live_db` (matches, applied row, interview from DB)

Read-only: no writes without JWT. CTA → `/register`.

---

## Logged-in demo script (~25–35 min)

### 0 — Landing (logged out)

| Step | URL | Notes |
|------|-----|-------|
| Home | `/` | Hero **See demo** → `/demo` |
| Live feed | `/demo` | Optional ranked list when demo mode on |

### 1 — Login

| Step | URL | Action |
|------|-----|--------|
| Login | `/login/candidate` | `demo@twin.career` + your seeded password |
| Dashboard | `/dashboard` | Skip onboarding (seed sets `onboarding_completed_at`) |

### 2 — Profile / feed

| Step | URL | Expected |
|------|-----|----------|
| Profile | `/profile` | CV text present |
| Dashboard | `/dashboard` | Job cards with **match %**; company intel / hiring insights modals |

### 3 — Optimize CV

| Step | URL | Expected |
|------|-----|----------|
| Applications | `/dashboard` | **Applied** row → **Optimize CV** |

### 4 — Calendar

| Step | URL | Expected |
|------|-----|----------|
| Calendar | `/dashboard/calendar` | Seeded interview; prep / follow-up modals; ICS without Google |

### 5 — Auto-apply

| Step | URL | Expected |
|------|-----|----------|
| Strip | `/dashboard` | Nightly auto-apply summary |
| Settings | `/dashboard/settings/auto-apply` | Consent on; **Run now** (Pracuj.pl) |

### 6 — Investor lane (same JWT)

| Step | URL | Expected |
|------|-----|----------|
| Persona | Header switcher → **Investor** | |
| Metrics | `/investor/metrics` | `GET /api/v1/public/mvp-stats` (placements, interviews, data-room demo flag) |
| Placement | `/investor/placement` | Verification timeline illustration |
| Data room | `/investor/data-room` | NDA + pack links; **demo mode** banner when S3 off |

### 7 — Recruiter

| Step | URL | Expected |
|------|-----|----------|
| Batch inbox | `/recruiter/inbox?company_slug=nova-hiring-pl` | Token from `--print-credentials`; accept / decline |
| ATS | `/recruiter/integrations/ats` | Greenhouse OAuth when env set; Lever stub + webhooks |

### 8 — Referrals (no Stripe Connect)

| Step | URL | Expected |
|------|-----|----------|
| Cash-out | `/dashboard/referrals/cash-out` | Manual payout copy (bank / PayPal) |

### 9 — Ops — auto-apply proof

```bash
curl -sS -H "Authorization: Bearer $OPS_ADMIN_TOKEN" "$API/api/v1/ops/auto-apply/last-run"
```

See [NIGHTLY_AUTO_APPLY_DEPLOY.md](./NIGHTLY_AUTO_APPLY_DEPLOY.md) for morning beat verification.

---

## Deploy before the meeting

```bash
git push origin cursor/phase1-monorepo-scaffold   # Vercel + Railway
./scripts/railway-alembic-upgrade.sh            # if new migrations
export DEMO_USER_PASSWORD='…'
python3 scripts/seed-investor-demo.py --reset-password   # target DATABASE_URL once
# Railway API env:
#   DEMO_MODE_ENABLED=true
#   DEMO_USER_EMAIL=demo@twin.career
./scripts/verify-prod-health.sh
```

## Smoke

```bash
API=https://twin-production-bcd9.up.railway.app
curl -sS "$API/api/v1/health" | jq .
curl -sS -o /dev/null -w "%{http_code}\n" "$API/api/v1/demo/snapshot"   # 404 if demo off; 200 if on
```

## Tests (local)

```bash
cd backend && pytest tests/test_demo_snapshot.py tests/test_seed_investor_demo.py -q
```

## Railway secrets only (not in repo)

| Area | Env names |
|------|-----------|
| Microsoft 365 calendar | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_CALENDAR_REDIRECT_URI`, `MICROSOFT_TENANT` |
| Greenhouse OAuth | `GREENHOUSE_CLIENT_ID`, `GREENHOUSE_CLIENT_SECRET`, `GREENHOUSE_OAUTH_REDIRECT_URI` |
| Webhooks | `GREENHOUSE_WEBHOOK_SECRET`, `LEVER_WEBHOOK_SECRET` |
| Lever OAuth (stub) | `LEVER_CLIENT_ID`, `LEVER_CLIENT_SECRET`, `LEVER_OAUTH_REDIRECT_URI` |
| Data room S3 | `S3_BUCKET_NAME`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION` |
| Mail | `RESEND_API_KEY`, `MAIL_FROM` |
| Stripe | Skipped in demo — optional `STRIPE_*` |

Checklist: [RAILWAY_PROD_ENV_CHECKLIST.md](./RAILWAY_PROD_ENV_CHECKLIST.md)

## Release / compare

- [RELEASE_NOTES_INVESTOR_DEMO.md](./RELEASE_NOTES_INVESTOR_DEMO.md)
- https://github.com/CzechowskiT/twin/compare/main...cursor/phase1-monorepo-scaffold

## Related

- [NIGHTLY_AUTO_APPLY_DEPLOY.md](./NIGHTLY_AUTO_APPLY_DEPLOY.md)
- [DEPLOY.md](./DEPLOY.md)
- `scripts/verify-prod-health.sh`
