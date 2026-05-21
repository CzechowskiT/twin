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

| 13 | Placement dispute + employer attest email | `POST …/placement-dispute`, optional recruiter email on attest link |
| 14 | Developers page | `/developers` + OpenAPI / status / mvp-stats links |
| 15 | Calendar provider i18n | Google / Microsoft labels on dashboard |

| 16 | Ops placement dispute queue | `/admin/placements` + `GET /admin/placement-disputes` |
| 17 | Employer attest branding | `GET /placement/employer/preview` + company on confirm page |
| 18 | WebCal regenerate | New subscribe link on dashboard strip |
| 19 | Lever ATS webhook | `LEVER_WEBHOOK_SECRET` + hire → verified |
| 20 | Ashby ATS webhook | `ASHBY_WEBHOOK_SECRET` + hire → verified |
| 21 | Ops dispute resolve | `POST …/placement-disputes/{id}/resolve` + admin UI buttons |
| 22 | Partner API keys | DB-hashed keys + `docs/PARTNER_API.md` + admin mint |
| 23 | Acceptance queue | `/dashboard/acceptance` + `GET /candidates/me/acceptance-queue` |
| 24 | Mobile calendar strip | Next interview card first on small screens |
| 25 | Employer attest slug URL | `/placement/employer/{company-slug}?token=…` |

See **`docs/PRODUCT_ROADMAP.md`** for product rationale on next priorities.

## Recommended next 10 (backlog)

1. **Railway secrets** — mail, Stripe, Microsoft (`docs/RAILWAY_PROD_ENV_PL.md`)
2. **Dedicated twin-worker** — Celery beat off API (`docs/RAILWAY_WORKER_PL.md`)
3. **Stripe E2E staging** — `docs/STRIPE_E2E.md`
4. **Scrape corpus growth** — ops allowlist + daily beat
5. **Interview reminders prod verify** — beat on worker + mail on Railway
6. **PR merge to default branch** — when `main` exists + CI green
7. **Recruiter-side batch UI** — employer view of pre-qualified candidates
8. **Partner matches export** — second CSV scope for integrators
9. **Admin partner-keys UI** — mint/revoke in `/admin` without curl
10. **Apple CalDAV** — optional iCloud path beyond WebCal
