# TWIN — founder status (live)

**Updated:** 2026-05-23 (autonomous session)  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**One-liner:** Pracuję — prod API na `c5ae7b9`, LinkedIn + Celery live, Stripe czeka na klucze founder.

---

## Prod right now

| Surface | Status |
|---------|--------|
| API deploy | `c5ae7b9` — tests + demo docs |
| Vercel front | Aligned with scaffold (proxy `git_commit` match) |
| Demo verify | **PASS** (`live_db`, top matches) |
| LinkedIn OAuth | **Live** (`linkedin_oauth_configured: true`) |
| Celery worker + beat | **Live** (`worker_active: true`) |
| Stripe checkout | **Off** — brak `STRIPE_*` na Railway |
| Microsoft Calendar | **Off** — brak credentials |
| Mail (Resend) | Check `/status` |

Quick audit: [https://twin-sooty.vercel.app/status](https://twin-sooty.vercel.app/status)

---

## Shipped this session (code)

1. **`docs/STRIPE_RAILWAY_SETUP.md`** + **`scripts/railway-apply-stripe-env.sh`** — founder paste Stripe test keys without secrets in git.
2. **Investor MRR stub** — `paid_subscribers` + `subscription_mrr_usd` on `/api/v1/public/mvp-stats` (null MRR until Stripe live).
3. **`/status` health dashboard** — LinkedIn, Celery worker, nightly beat, recruiter inbox flags.
4. **Recruiter inbox batch accept/decline** — multi-select + `POST /recruiter/inbox/respond-batch`.
5. **Placement verification stepper** — pipeline → declared → verify → verified on dashboard apps.
6. **WebCal polish** — expiry + HTTPS URL preview on calendar page.

---

## Founder action (unblocks revenue)

1. Run `python3 scripts/stripe-bootstrap-test.py` with `sk_test_…` → paste into `.env.railway`.
2. `./scripts/railway-apply-stripe-env.sh` → expect `stripe_checkout_ready: true`.
3. Optional: Microsoft Graph OAuth (same pattern as LinkedIn).

Full checklist: `docs/STRIPE_RAILWAY_SETUP.md`, `EXECUTION_PROGRESS.md`.

---

## Next autonomous slices

- Stripe E2E on prod after keys
- Nightly auto-apply verification (02:00 UTC row in `auto_apply_runs`)
- RocketJobs selector stabilization
- Microsoft 365 calendar OAuth when credentials land
