# Next 10 MVP steps (autonomous shipping)

Aligned with the north star: **short calendar of acceptance-ready moments**, not inbox noise.

## Shipped in latest pass

| # | Slice | Outcome |
|---|--------|---------|
| 1 | Billing plan cards | Premium/Pro match Free layout; no vertical letter glitch |
| 2 | Google Calendar OAuth UX | Redirect URI copy on calendar page; fixes `redirect_uri_mismatch` |
| 3 | Dashboard calendar strip | **Connect Google Calendar** on main dashboard when OAuth is wired |
| 4 | Public `mvp-stats` | `mail_configured` + `google_calendar_configured` for investor strip |
| 5 | Calendar status API | `oauth_redirect_uri` on `/calendar/google/status` for setup |
| 6 | Placement + calendar | Existing flows kept; docs updated |
| 7 | Scrape worker guard | `SCRAPE_WORKER_READY` + beat schedule (prior commit) |
| 8 | Waitlist + mail | Resend on Railway when keys set (ops) |
| 9 | `make ci-check` | Fast local gate (health + request-id + tsc) |
| 10 | This log | `AGENT_SHIPPING_LOG.md` + this file |

## Recommended next 10 (backlog)

1. **Railway `twin-worker` + `twin-beat`** — see `docs/RAILWAY_WORKER_PL.md`; set `SCRAPE_WORKER_READY=true` on API.
2. **Microsoft Calendar OAuth** — Azure app + `MICROSOFT_*` on Railway (user deferred; code path exists).
3. **Stripe live checkout** — `STRIPE_*` on Railway; verify Premium upgrade E2E.
4. **Placement retention emails** — Celery beat + mail when `mail_configured`.
5. **Dashboard WebCal one-click** — mint subscribe link from calendar strip (no extra navigation).
6. **Interview reminder beat** — wire `send_interview_reminder_email` to beat schedule.
7. **B2B placement attestation link** — employer one-click confirm (schema in `docs/PLACEMENT_VERIFICATION.md`).
8. **Scrape ops allowlist** — document `SCRAPE_OPS_EMAILS` for production owner email.
9. **FE empty state** — zero jobs after filters on dashboard feed.
10. **OpenAPI / public health** — `database_reachable` on marketing status page.
