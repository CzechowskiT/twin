# Waitlist / traction — batch 2 (agent)

## Done

1. **i18n landing** — `waitlist-messages.ts` for 9 locales; language switcher on `/waitlist`.
2. **Discovery** — Home hero + CTA band → `/waitlist`; footer link; beta page banner.
3. **SEO** — `app/sitemap.xml` includes `/waitlist` (daily priority).
4. **Locale UX** — Form remounts on `locale` change (Zod messages + placeholders).

## Batch 3 (done)

- Consent-gated Plausible + PostHog `waitlist_signup` event.
- Full FAQ/compare/terminal copy for zh, ja, ar.
- `/beta/join` → `/waitlist` (preserve `?ref=`; `?classic=1` keeps multi-step join).
- OpenGraph title/description per `Accept-Language`.
- Admin: `signups_today` on stats + CSV export.
