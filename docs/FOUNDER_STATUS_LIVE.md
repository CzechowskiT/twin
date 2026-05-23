# TWIN — founder status (live)

**Updated:** 2026-05-23 (autonomous 5-slice session)  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**One-liner:** Prod API `56f5241` — Stripe checkout live, Celery beat + worker OK, demo founder auto-apply, S3 data room czeka na `S3_*`.

---

## Prod right now

| Surface | Status |
|---------|--------|
| API deploy | `56f5241` — Microsoft OAuth scripts + autonomous slices |
| Vercel front | Proxy aligned with scaffold (`/status` → `git_commit`) |
| Demo verify | **PASS** (`live_db`, top matches) |
| LinkedIn OAuth | **Live** (`linkedin_oauth_configured: true`) |
| Stripe checkout | **Live** (`stripe_checkout_ready: true`) |
| Celery worker + beat | **Live** (`worker_active: true`, nightly beat scheduled) |
| Google Calendar | **Configured** |
| Microsoft Calendar | **Configured** (`microsoft_calendar_configured: true`) |
| Mail (Resend) | **Configured** (`mail_configured: true`) |
| Data room S3 | **Off** — `data_room_local_demo: true` until `S3_*` on Railway |
| MRR | `0` paid subscribers (Stripe keys live; no prod subs yet) |

Quick audit: [https://twin-sooty.vercel.app/status](https://twin-sooty.vercel.app/status)  
API health: [https://twin-production-bcd9.up.railway.app/api/v1/health](https://twin-production-bcd9.up.railway.app/api/v1/health)

---

## Shipped this session (5 slices)

1. **Nightly auto-apply** — manual trigger mail (PL test copy) vs overnight EN copy; `scripts/verify-nightly-auto-apply.sh` + trigger script checks `auto_apply_runs` via ops token; pytest for mail + sweep row persistence.
2. **RocketJobs** — card `data-testid` selectors + expanded HTML fixture (2 offers); parser tests.
3. **S3 data room** — frontend file picker + presigned PUT when S3 configured; local dev `POST …/file` via `apiUpload`; S3 vs demo banners.
4. **Placement work-email** — stepper handles `verify_pending` / `disputed`; resend link + in-progress copy; magic-link confirm on `/dashboard?placement_verify=`.
5. **This doc** — refreshed prod table (Stripe on, Microsoft calendar on).

---

## Founder verify on prod

1. **Auto-apply:** `./scripts/trigger-founder-auto-apply.sh` → test mail (no “overnight”); `./scripts/verify-nightly-auto-apply.sh` with `OPS_ADMIN_TOKEN` after 02:00 Warsaw beat for `auto_apply_runs` row.
2. **Stripe:** `/status` green; optional checkout test with test card.
3. **Data room:** `/investor/data-room` — demo upload works locally; set `S3_BUCKET` + keys on Railway for presigned PUT (never commit secrets).
4. **Placement:** Dashboard → hired/applied app → declare → work email → click magic link → stepper **Verified**.
5. **RocketJobs:** Celery scrape logs or `python3 backend/scripts/run_scraper.py rocketjobs` locally.

---

## Next autonomous slices

- S3 data room on Railway (founder env only)
- RocketJobs in `NIGHTLY_AUTO_APPLY_SUPPORTED_BOARDS` after scrape volume check
- Stripe E2E paid subscriber on prod
- Microsoft sign-in OAuth E2E (Entra app registered)

Checklists: `docs/STRIPE_RAILWAY_SETUP.md`, `docs/NIGHTLY_AUTO_APPLY_DEPLOY.md`, `docs/PLACEMENT_VERIFICATION.md`.
