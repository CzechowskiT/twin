# Wave C slice 3 — recruiter notification preferences visibility (2026-07-13)

> **Status:** PILOT — plan doc only; implementation in separate PR  
> **Stance:** P0 CLOSED | Gate F PENDING | Launch NO-GO

## Scope

Surface existing `PATCH /api/v1/auth/me/notification-preferences` on recruiter calendar route pattern — read/update interview reminder toggles without new backend tables.

## Why this slice

- Documented in `BACKEND_ROUTE_INVENTORY_2026-05-27.md` and `AGENT_SHIPPING_LOG.md`
- Safe after C2 — no migration, no #448 dependency
- No founder credentials required for static guards + UI wiring

## Excluded

- Push notifications, SMS, marketing email campaigns
- Stripe, ATS, MS Calendar live flip

## Implementation checklist (next PR)

1. Recruiter `/recruiter/calendar` or hub link → notification prefs panel (reuse candidate calendar pattern)
2. i18n keys under `recruiterNotificationPrefs.*`
3. Guard `test:recruiter-notification-prefs-pilot-guard`
4. PILOT status in activation registry until founder smoke

## Hard bans

- No LIVE status without smoke PASS
- No delegated apply / auto-apply changes
