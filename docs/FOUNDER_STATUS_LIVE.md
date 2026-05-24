# TWIN — founder status (live)

**Updated:** 2026-05-22 (autonomous status + P0 completion session)  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**One-liner:** **17/19 P0 ✅** on prod; S3 bucket ⚠️ founder-only; ATS OAuth ❌ backlog; CI smoke workflow added (push may need PAT `workflow` scope).

---

## Prod right now

| Surface | Status |
|---------|--------|
| API deploy | **5cb9d06** (scaffold HEAD; prod `git_commit` matches) |
| Vercel front | https://twin-sooty.vercel.app/status |
| Demo verify | **PASS** (`live_db`, top matches) — `/demo` shows offline banner when snapshot stale |
| LinkedIn OAuth | **Live** (`linkedin_oauth_configured: true`) |
| Stripe checkout | **Live** (`stripe_checkout_ready: true`) |
| Celery worker + beat | **Live** (nightly auto-apply scheduled) |
| Google / Microsoft Calendar | **Configured** |
| Mail (Resend) | **Configured** |
| Recruiter inbox | **Live** (batch accept/decline) |
| validated_jobs | **637** (`/health?ops=1`) |
| Data room S3 | **Wired** — prod flag off until founder `S3_*` |
| OpenAPI on prod | **Disabled** (`environment=production` → no `/docs`, `/openapi.json` 404) |
| CI smoke | **`.github/workflows/smoke.yml`** (pytest + build + prod curl) — verify push with workflow scope |
| MRR | $0 (Stripe live; no paid subs yet) |

Quick audit: [https://twin-sooty.vercel.app/status](https://twin-sooty.vercel.app/status)  
API: `curl -s "https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1&db=1"`

---

## Shipped this session (2026-05-22)

1. **i18n merge conflict** in `sliderGuideLead` (PL/EN) — blocked `npm run build`; resolved user-facing copy without internal constant names.
2. **GitHub Actions** `smoke.yml` restored from `cursor/ci-smoke-workflow`.
3. **Frontend build** green; **28 pytest** P0 subset green (incl. OpenAPI prod guard).
4. **FOUNDER_STATUS_LIVE.md** refreshed with prod/scaffold SHA alignment.

---

## Founder verify on prod

1. **Status page:** all green except S3 (expected until R2 keys).
2. **Stripe:** optional checkout with test card `4242…`.
3. **Data room:** paste R2 keys → `./scripts/railway-apply-production-env.sh` → `data_room_s3_enabled: true`.
4. **Recruiter inbox:** `/recruiter/inbox?company_slug=nova-hiring-pl`.
5. **Secrets doc:** `docs/FOUNDER_SECRETS_WHERE.md` — then message agent **„sekrety w .env.railway, gotowe”**.

---

## Open P0 (founder / backlog)

| Item | Owner |
|------|-------|
| S3/R2 live bucket | Founder → `.env.railway` |
| ATS OAuth (Greenhouse/Lever) | Founder credentials + agent wiring |
| GitHub PAT `workflow` scope OR SSH | Founder — to push `.github/workflows/smoke.yml` |
| 100k real jobs in DB | Long-running scrape infra (637 today) |
| Pracuj.pl integrations hub (full OAuth) | Partner credentials + product scope |
| Demo password reset on prod DB | `./scripts/seed-investor-demo.py --reset-password` on Railway |

Checklists: [FOUNDER_P0_CHECKLIST.md](./FOUNDER_P0_CHECKLIST.md), [FOUNDER_SECRETS_WHERE.md](./FOUNDER_SECRETS_WHERE.md), [FOUNDER_OPEN_QUESTIONS.md](./FOUNDER_OPEN_QUESTIONS.md), `docs/STRIPE_RAILWAY_SETUP.md`, `docs/NIGHTLY_AUTO_APPLY_DEPLOY.md`, `docs/PLACEMENT_VERIFICATION.md`.
