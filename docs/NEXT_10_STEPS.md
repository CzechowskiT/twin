# Next 10 MVP steps (autonomous shipping)

Aligned with the north star: **short calendar of acceptance-ready moments**, not inbox noise.

## Shipped in latest sprint (May 2026)

| # | Slice | Outcome |
|---|--------|---------|
| 0 | Referral cash-out deploy | `16ff417` on prod (`git_commit` health); cash-out request form + ops queue |
| 1 | ATS OAuth placeholder | `POST /integrations/ats/{provider}/connect`, DB `recruiter_ats_oauth_connections`, disabled Connect UI |
| 2 | Data room v2 upload stub | `POST /investor/data-room/uploads` metadata validation; migration `043` |
| 3 | Referral cash-out status | `GET /referrals/cash-out/history`; dashboard pending/paid states |
| 4 | Career assistant polish | PL empty states; `404` when no CV on ATS optimize |
| 5 | Microsoft calendar dev UX | Callback error copy + `RAILWAY_PROD_ENV_CHECKLIST.md` link on calendar page |
| 6 | Stripe checkout gate UX | Billing band → pricing + `STRIPE_E2E.md` when checkout not ready |
| 7 | Nightly auto-apply observability | `GET /ops/auto-apply/last-run` (ops token); `GET /auto-apply/last-sweep` + dashboard strip |
| 8 | RocketJobs scraper | Selector fallback + fetch retry; fixture test |
| 9 | Docs | This file + next 3 priorities below |

## Shipped (prior passes)

| # | Slice | Outcome |
|---|--------|---------|
| 1 | Quantica compliance MVP | Onboarding, help, feedback, admin metrics, lifecycle email — `docs/QUANTICA_COMPLIANCE.md` |
| 2 | Dashboard WebCal one-click | Mint + copy subscribe URL on main calendar strip |
| 10 | Employer placement attestation | `POST …/placement-employer-attest-link`, public confirm API |
| 19 | Lever ATS webhook | `LEVER_WEBHOOK_SECRET` + hire → verified |
| 27 | Recruiter batch inbox | `/recruiter/inbox` + `docs/RECRUITER_INBOX.md` |

See **`docs/PRODUCT_ROADMAP.md`** for product rationale.

## Recommended next 3 priorities

1. **Railway user secrets** — `MICROSOFT_CLIENT_*`, `STRIPE_*`, mail (`docs/RAILWAY_PROD_ENV_CHECKLIST.md`) — flip `microsoft_calendar_configured` + `stripe_checkout_ready` on prod health
2. **Nightly auto-apply prod night** — post-02:00 verify beat + `auto_apply_runs` row + summary mail (`docs/NIGHTLY_AUTO_APPLY_DEPLOY.md`)
3. **ATS OAuth live** — Greenhouse/Lever redirect when app credentials exist; job sync beyond hire webhooks

## Backlog (next 10)

4. Dedicated twin-worker — Celery beat off API (`docs/RAILWAY_WORKER_PL.md`)
5. Stripe E2E staging — `docs/STRIPE_E2E.md`
6. Scrape corpus growth — ops allowlist + daily beat
7. Interview reminders prod verify — beat on worker + mail on Railway
8. Data room S3 blobs — wire upload bytes when `S3_BUCKET_NAME` set
9. Referral cash-out fulfillment — ops mark paid + optional email stub
10. WebCal one-click polish — persist + regenerate UX on all calendar strips

Mega-prompt reference: `~/Downloads/cursor_autonomous_nightly_autoapply.md` (ops checklist in `NIGHTLY_AUTO_APPLY_DEPLOY.md`).
