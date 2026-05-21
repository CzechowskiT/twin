# Next 10 MVP steps (autonomous shipping)

Aligned with the north star: **short calendar of acceptance-ready moments**, not inbox noise.

## Shipped in latest pass

| # | Slice | Outcome |
|---|--------|---------|
| 1 | Quantica compliance MVP | Onboarding, help, feedback, admin metrics, lifecycle email — `docs/QUANTICA_COMPLIANCE.md` |
| 2 | Dashboard WebCal one-click | Mint + copy subscribe URL on main calendar strip |
| 3 | Jobs empty state (zero corpus) | CTAs: profile, reset filters, ops scrape |
| 4 | Public `/status` | `database_reachable` on mvp-stats + marketing status page |
| 5 | Scrape ops doc | `docs/SCRAPE_OPS.md` |
| 6 | Footer `/status` + Microsoft on dashboard strip | Legal footer link; Connect Microsoft 365 on main dashboard |
| 7 | Stripe E2E doc | `docs/STRIPE_E2E.md`; status page shows Stripe + Microsoft flags |
| 8 | WebCal URL persist | sessionStorage on dashboard after mint |
| 9 | Billing plan cards | Premium/Pro match Free layout; no vertical letter glitch |
| 2 | Google Calendar OAuth UX | Redirect URI copy on calendar page; fixes `redirect_uri_mismatch` |
| 3 | Dashboard calendar strip | **Connect Google Calendar** on main dashboard when OAuth is wired |
| 4 | Public `mvp-stats` | `mail_configured` + `google_calendar_configured` for investor strip |
| 5 | Calendar status API | `oauth_redirect_uri` on `/calendar/google/status` for setup |
| 7 | Placement + calendar | Existing flows kept; docs updated |
| 8 | Scrape worker guard | `SCRAPE_WORKER_READY` + beat schedule (prior commit) |
| 9 | Waitlist + mail | Resend on Railway when keys set (ops) |
| 10 | `make ci-check` | Fast local gate (health + request-id + tsc) |

## Shipped (continued)

| # | Slice | Outcome |
|---|--------|---------|
| 10 | Employer placement attestation | `POST …/placement-employer-attest-link`, `/placement/employer`, public confirm API |
| 11 | OpenAPI export | `GET /openapi.json` + Next proxy `/api/openapi` |
| 12 | Unified interviews API | `GET /api/v1/calendar/me/interviews`; dashboard uses it |

## Recommended next 10 (backlog)

1. **Railway `twin-worker` + `twin-beat`** — `docs/RAILWAY_WORKER_PL.md`
2. **Microsoft + Stripe secrets on Railway** — `docs/RAILWAY_PROD_ENV_PL.md`, `docs/STRIPE_E2E.md`
3. **Placement retention emails** — beat shipped; tune copy when mail live
4. **Employer attestation email** — optional transactional notify when link issued
5. **B2B attestation portal** — branded page per company slug
6. **ATS webhook ingest** — `employer_webhook_url` already in config
7. **Interview provider badge i18n** — translate google/microsoft labels
8. **OpenAPI publish to docs site** — link from `/docs` marketing page
9. **Placement dispute queue** — exception state in dashboard
10. **Live scrape corpus growth** — ops scrape + validation metrics
