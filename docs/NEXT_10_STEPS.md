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
| 6 | Billing plan cards | Premium/Pro match Free layout; no vertical letter glitch |
| 2 | Google Calendar OAuth UX | Redirect URI copy on calendar page; fixes `redirect_uri_mismatch` |
| 3 | Dashboard calendar strip | **Connect Google Calendar** on main dashboard when OAuth is wired |
| 4 | Public `mvp-stats` | `mail_configured` + `google_calendar_configured` for investor strip |
| 5 | Calendar status API | `oauth_redirect_uri` on `/calendar/google/status` for setup |
| 7 | Placement + calendar | Existing flows kept; docs updated |
| 8 | Scrape worker guard | `SCRAPE_WORKER_READY` + beat schedule (prior commit) |
| 9 | Waitlist + mail | Resend on Railway when keys set (ops) |
| 10 | `make ci-check` | Fast local gate (health + request-id + tsc) |

## Recommended next 10 (backlog)

1. **Railway `twin-worker` + `twin-beat`** — see `docs/RAILWAY_WORKER_PL.md`; set `SCRAPE_WORKER_READY=true` on API.
2. **Microsoft Calendar OAuth** — Azure app + `MICROSOFT_*` on Railway (user deferred; code path exists).
3. **Stripe live checkout** — `STRIPE_*` on Railway; verify Premium upgrade E2E.
4. **Placement retention emails** — Celery beat + mail when `mail_configured`.
5. **Microsoft Calendar OAuth** — Azure app on Railway (code path exists).
6. **B2B placement attestation link** — employer one-click confirm (schema in `docs/PLACEMENT_VERIFICATION.md`).
7. **Stripe live checkout** — E2E Premium upgrade on production keys.
8. **Footer link to `/status`** — from marketing shell if not yet linked.
9. **Persist WebCal URL** — optional sessionStorage on dashboard strip after mint.
10. **OpenAPI export** — publish `/openapi.json` for integrators.
