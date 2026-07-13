# Wave C slice 3 — recruiter in-app notification preferences (2026-07-13)

> **Status:** PILOT — `NEEDS_FOUNDER_AUTH_SMOKE`  
> **Stance:** P0 CLOSED | Gate F PENDING | Launch NO-GO  
> **PR branch:** `feat/all-modules-green-wave-c3-notification-prefs`  
> **Migration:** `074_recruiter_notification_preferences_c3` (`down_revision=072`)

## Scope

Per-company recruiter **in-app** notification toggles — inbox digest, interview reminders, trust review alerts, pipeline updates.

## API

| Method | Path |
|--------|------|
| GET | `/api/v1/recruiter/notification-preferences` |
| PUT | `/api/v1/recruiter/notification-preferences` |
| PATCH | `/api/v1/recruiter/notification-preferences` |
| POST | `/api/v1/recruiter/notification-preferences/reset` |

Frontend proxy: `/api/recruiter/notification-preferences`

## UI

- Route: `/recruiter/notification-preferences`
- EN/PL i18n under `recruiterNotificationPrefs.*`
- a11y: `role="switch"`, `aria-checked`, labelled toggles

## Excluded (hard ban)

- Email, SMS, push, Slack, webhooks, external notifications
- Stripe, ATS, MS Calendar, auto-apply, delegated apply

## Migration note

`073_candidate_referrals` comes from PR #448 at merge time. C3 stacks on #450/#451 with `074` chained from `072`.

## Founder smoke

See `docs/RECRUITER_WAVE_C_FOUNDER_SMOKE_2026-07-13.md` — add C3 steps when credentials available. **No fake PASS.**

## Rollback

Drop table `recruiter_notification_preferences` via `alembic downgrade 072` on preview only — production rollback per `docs/PERSISTENCE_MIGRATION_RUNBOOK_2026-06-19.md`.
