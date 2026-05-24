# TWIN — founder status (live)

**Updated:** 2026-05-23 (autonomous P0 completion session)  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**One-liner:** **17/19 P0 ✅** on prod; S3 bucket ⚠️ founder-only; ATS OAuth ❌ backlog. Secrets: `docs/FOUNDER_SECRETS_WHERE.md`.

---

## Prod right now

| Surface | Status |
|---------|--------|
| API deploy | scaffold HEAD (S3 path + inbox via `f011c13`/`7446595`) |
| Vercel front | https://twin-sooty.vercel.app/status |
| Demo verify | **PASS** (`live_db`, top matches) |
| LinkedIn OAuth | **Live** |
| Stripe checkout | **Live** |
| Celery worker + beat | **Live** (nightly auto-apply scheduled) |
| Google / Microsoft Calendar | **Configured** |
| Mail (Resend) | **Configured** |
| Recruiter inbox | **Live** (batch accept/decline) |
| validated_jobs | **637** (`/status` + `health?ops=1`) |
| Data room S3 | **Wired** — prod flag off until founder `S3_*` |
| MRR | $0 (Stripe live; no paid subs yet) |
| CI smoke | **`.github/workflows/smoke.yml`** (pytest + build + prod curl) |

Quick audit: [https://twin-sooty.vercel.app/status](https://twin-sooty.vercel.app/status)  
API: `curl -s "https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1&db=1"`

---

## Shipped this session

1. **`validated_jobs`** on `GET /health?ops=1` (+ LinkedIn + S3 flags for curl audit).
2. **GitHub Actions** smoke workflow (backend pytest subset, frontend build, prod health).
3. **`docs/FOUNDER_SECRETS_WHERE.md`** — Polish guide: skąd wziąć / gdzie wkleić każdy sekret.
4. **Roadmap + P0 audit** refreshed (17 ✅ / 1 ⚠️ / 1 ❌).
5. **verify-prod-health.sh** checks `validated_jobs >= 1`.

---

## Founder verify on prod

1. **Status page:** all green except S3 (expected until R2 keys).
2. **Stripe:** optional checkout with test card `4242…`.
3. **Data room:** paste R2 keys → `./scripts/railway-apply-production-env.sh` → `data_room_s3_enabled: true`.
4. **Recruiter inbox:** `/recruiter/inbox?company_slug=nova-hiring-pl` (refresh via ops if needed).
5. **Secrets doc:** `docs/FOUNDER_SECRETS_WHERE.md` — then message agent **„sekrety w .env.railway, gotowe”**.

---

## Open P0 (founder / backlog)

| Item | Owner |
|------|-------|
| S3/R2 live bucket | Founder → `.env.railway` |
| ATS OAuth (Greenhouse/Lever) | Founder credentials + agent wiring |

Checklists: [FOUNDER_P0_CHECKLIST.md](./FOUNDER_P0_CHECKLIST.md), [FOUNDER_SECRETS_WHERE.md](./FOUNDER_SECRETS_WHERE.md), [FOUNDER_OPEN_QUESTIONS.md](./FOUNDER_OPEN_QUESTIONS.md), `docs/STRIPE_RAILWAY_SETUP.md`, `docs/NIGHTLY_AUTO_APPLY_DEPLOY.md`, `docs/PLACEMENT_VERIFICATION.md`.
