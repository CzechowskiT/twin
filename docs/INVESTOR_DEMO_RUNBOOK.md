# Investor demo runbook (no Stripe)

**Audience:** live investor walkthrough as a logged-in candidate, then persona switch to investor + recruiter stub.  
**Production frontend:** https://twin-sooty.vercel.app  
**Production API:** https://twin-production-bcd9.up.railway.app (also reachable via `https://twin-sooty.vercel.app/api/v1/…` proxy)

Stripe is **not** required: billing/checkout only on `/dashboard/billing` and `/api/v1/billing/checkout-session`. The candidate dashboard, feed, calendar, and career assistant work on **Free** when `stripe_price_configured` is false (current prod).

---

## Prerequisites (day before)

| Item | Why |
|------|-----|
| Demo account + password | Seeded user or fresh registration (see [Seed](#seed-demo-data)) |
| `onboarding_completed_at` set | Avoid redirect to `/onboarding` (seed sets this; or finish onboarding once) |
| CV text on profile | Match scores + “Optimize CV” need `cv_text` (seed or upload on `/profile`) |
| ≥1 job in feed | Seed adds 3 validated `pracuj` jobs; prod may also have scraped corpus |
| ≥1 application **Applied** | Seed creates one; or apply manually from dashboard |
| ≥1 `scheduled_interview` | Seed creates one; needed for Interview prep / Follow-up on calendar |
| Google Calendar OAuth (optional) | Connect on `/dashboard/calendar` to demo live OAuth; seeded interview still shows without Google |
| Browser: production URL only | Avoid long `git-…` Vercel preview URLs (auth header / CORS issues) |

**Recommended:** one shared account for the whole tour; persona is **UI state** (`PersonaSwitcher` + `localStorage`), not a separate login.

Default seeded email: `investor-demo@twin.app` (password via `INVESTOR_DEMO_PASSWORD` — never commit).

---

## Seed demo data

From repo root, with `DATABASE_URL` pointing at the target DB (local, staging, or Railway):

```bash
export INVESTOR_DEMO_PASSWORD='your-12+-char-secret'
python3 scripts/seed-investor-demo.py --email investor-demo@twin.app --reset-password
```

On Railway (linked project):

```bash
export INVESTOR_DEMO_PASSWORD='…'
railway run python3 scripts/seed-investor-demo.py --email investor-demo@twin.app --reset-password
```

Creates/updates:

- User with GDPR consents, `email_verified_at`, `onboarding_completed_at`, **free** plan (no Stripe)
- Candidate CV text + skills aligned to demo jobs
- 3 validated jobs (`pracuj`, `investor-demo-*` external IDs)
- 1 application in **applied** state
- 1 scheduled interview (+3 days, Europe/Warsaw)
- Auto-apply consent + a recent platform sweep row (for dashboard strip)

---

## Demo script (~25–35 min)

### 0 — Landing (logged out)

| Step | URL | Click / say | Expected |
|------|-----|-------------|----------|
| Open home | https://twin-sooty.vercel.app/ | Scroll hero, stats strip, “how it works” | Marketing story; live stats if API up |
| Optional | `/how-it-works`, `/pricing` | — | No checkout required; pricing is informational |

### 1 — Candidate registration

| Step | URL | Action | Expected |
|------|-----|--------|----------|
| Register | https://twin-sooty.vercel.app/register?zone=candidate | Email, password, accept consents | JWT stored; redirect `/onboarding` |
| **Or login** | https://twin-sooty.vercel.app/login/candidate | Seeded credentials | Redirect `/workspace/candidate` → open dashboard |

**Skip onboarding for seed user:** go straight to https://twin-sooty.vercel.app/dashboard

Fresh registrants: complete 5 steps on `/onboarding` (welcome → profile link → skills → preferences → CV), then **Finish** → `/dashboard`.

### 2 — Profile / CV

| Step | URL | Action | Expected |
|------|-----|--------|----------|
| Profile | https://twin-sooty.vercel.app/profile | Confirm name, skills, **CV text** or upload PDF/DOCX | CV insights block when text present |
| Save | — | Update if live-editing | API `PATCH /api/v1/candidates/me` |

### 3 — Feed + Company intel + Hiring insights

| Step | URL | Action | Expected |
|------|-----|--------|----------|
| Dashboard feed | https://twin-sooty.vercel.app/dashboard | Job list with **match %** on cards | Scores from profile ↔ job text |
| Company intel | On a job card | **Company intel** (research) | Modal: company snapshot (LLM or fallback) |
| Hiring insights | Same card | **Hiring insights** | Modal: recruiter-style signals for role |

API (auth): `POST /api/v1/career-assistant/company-intelligence`, `POST /api/v1/career-assistant/hiring-insights`

### 4 — Optimize CV on application

| Step | URL | Action | Expected |
|------|-----|--------|----------|
| Applications panel | `/dashboard` (scroll) | Row in **Applied** | Buttons on application card |
| Optimize CV | **Optimize CV** on applied row | Modal with tailored bullets / keywords | `POST /api/v1/career-assistant/optimize-cv` |

If no applied row: mark a feed job as applied first.

### 5 — Google Calendar

| Step | URL | Action | Expected |
|------|-----|--------|----------|
| Calendar | https://twin-sooty.vercel.app/dashboard/calendar | **Connect Google** if OAuth configured | Connected email strip |
| Interviews | Same page | Seeded interview in list | Company, time, Meet link; **Interview prep** + **Follow-up** |
| Optional | — | Schedule test slot | New row after API success |
| ICS | Per interview | Download `.ics` | Works without Google connected |

OAuth callback: `/auth/callback` (Google). Requires Railway `GOOGLE_*` env vars.

### 6 — Interview prep & follow-up

| Step | URL | Action | Expected |
|------|-----|--------|----------|
| Prep | `/dashboard/calendar` | **Interview prep** on a row | Modal: questions, talking points |
| Follow-up | Same | **Follow-up email** | Draft thank-you / next-step email |

Uses `scheduled_interview_id` from list.

### 7 — Auto-apply settings + last sweep strip

| Step | URL | Action | Expected |
|------|-----|--------|----------|
| Strip | `/dashboard` (top) | **Nightly auto-apply** strip | Active/inactive, last run, link to settings |
| Settings | https://twin-sooty.vercel.app/dashboard/settings/auto-apply | Consent, min score, daily limit, **Run now** | No Stripe gate (default `AUTO_APPLY_REQUIRE_PREMIUM=false`) |

API: `GET /api/v1/auto-apply/settings`, `GET /api/v1/auto-apply/last-sweep`

### 8 — Switch to investor (data room + NDA)

| Step | URL | Action | Expected |
|------|-----|--------|----------|
| Persona | Header **PersonaSwitcher** | Choose **Investor** | Nav context → investor workspace |
| Workspace | https://twin-sooty.vercel.app/workspace/investor | Open **Data room** | Gated hub links |
| Data room | https://twin-sooty.vercel.app/investor/data-room | Accept **NDA** checkbox (session) | Confidential placeholders + pack links |
| Metrics / calc | `/investor/metrics`, `/investor/calculator` | Optional deep dive | Scenario calculator, public metrics |

Same JWT as candidate — only `twin_marketing_persona` in browser changes.

### 9 — Recruiter ATS stub (brief)

| Step | URL | Action | Expected |
|------|-----|--------|----------|
| Persona | **PersonaSwitcher** → **Recruiter** | — | Recruiter nav |
| ATS | https://twin-sooty.vercel.app/recruiter/integrations/ats | Load setup | Webhook URLs per provider; OAuth stubs if configured |

API: `GET /api/v1/integrations/ats/setup` (Bearer token). No separate recruiter password.

---

## Persona switch (one account)

| Persona | Login URL | After login home | Notes |
|---------|-----------|------------------|-------|
| Candidate | `/login/candidate` | `/workspace/candidate` → `/dashboard` | Full product demo |
| Investor | `/login/investor` | `/workspace/investor` | Same credentials; switch persona in header |
| Recruiter | `/login/recruiter` | `/workspace/recruiter` | ATS page uses same session |

`/investor/data-room` requires header persona **Investor** (or switcher) + valid JWT.

---

## Stripe / billing (do not block demo)

| Surface | Blocks navigation? |
|---------|------------------|
| `/dashboard`, `/profile`, `/dashboard/calendar`, career assistant | **No** |
| `/dashboard/billing` | Shows “checkout coming soon” when Stripe not configured; safe to open, not required |
| `/pricing` (marketing) | Informational only |
| `POST /api/v1/billing/checkout-session` | 503 if Stripe keys missing — only when user clicks upgrade |

Verify plans: `curl -sS https://twin-production-bcd9.up.railway.app/api/v1/billing/plans | jq .checkout_configured` → expect `false` on current prod.

---

## Smoke checks (curl / HTTP)

```bash
FE=https://twin-sooty.vercel.app
API=https://twin-production-bcd9.up.railway.app

# Static / SSR pages (200, no auth)
for path in / /register?zone=candidate /login/candidate /login/investor \
  /dashboard /profile /dashboard/calendar /dashboard/settings/auto-apply \
  /dashboard/billing /investor/data-room /recruiter/integrations/ats /api/v1/health; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" "${FE}${path}")
  echo "$path → $code"
done

curl -sS "${API}/api/v1/health" | jq .
curl -sS "${API}/api/v1/billing/plans" | jq '.checkout_configured, .plans[0].id'
```

Full prod ops: `./scripts/verify-prod-health.sh`

---

## Known blockers (live demo tomorrow)

| Risk | Mitigation |
|------|------------|
| Empty job feed (no seed, scrape down) | Run `seed-investor-demo.py` or trigger scrape (ops) |
| Onboarding redirect | Seed sets `onboarding_completed_at`; or finish onboarding once |
| Google OAuth not configured | Show calendar list + ICS; say OAuth is env-gated on Railway |
| Anthropic not configured | Company intel / hiring insights / CV optimize use **fallback** copy — still demoable |
| Vercel preview URL | Use **twin-sooty.vercel.app** only |
| Email verification banner | Cosmetic if `email_verified_at` null; seed sets verified |
| Nightly **Run now** needs Pracuj match ≥ threshold | Seed jobs + CV align; or lower min score in settings |
| Celery worker down | Nightly email not sent; manual **Run now** may still work on API |
| Investor confidential uploads | Metadata only unless S3 configured — NDA UI still works |

---

## Quick recovery

- **Stuck on onboarding:** open `/profile`, complete CV, `POST /api/v1/auth/onboarding/complete`, or re-run seed.
- **No match scores:** ensure `cv_text` + skills on profile and validated jobs in DB.
- **Persona gate on data room:** switch header to Investor, then `/investor/data-room`.
- **API errors in browser:** check Railway Active, `CORS_ORIGINS` includes Vercel origin, `TWIN_API_BASE_URL` on Vercel.

---

## Related docs

- `docs/NIGHTLY_AUTO_APPLY.md` — auto-apply investor notes  
- `docs/qa/manual-test-plan.md` — calendar SQL examples  
- `scripts/verify-prod-health.sh` — production readiness  
- `docs/DEPLOY.md` — URLs and smoke
