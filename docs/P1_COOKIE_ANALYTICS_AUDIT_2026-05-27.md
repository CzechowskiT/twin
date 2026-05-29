# P1 Cookie Consent / Analytics Gating Audit — 2026-05-27

TASK 4 of the **security / ops hardening** session on
`cursor/phase1-monorepo-scaffold` (morning, 2026-05-27).
Read-only audit of every analytics surface in the frontend
(PostHog, Plausible, the consent provider, the consent
storage, the server-side audit hop), plus one new node-tsx
test that freezes the "default → denied" invariant.

## TL;DR

- Two analytics providers wired today: **PostHog** (via
  the public `NEXT_PUBLIC_POSTHOG_KEY`) and **Plausible**
  (via `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`). No GA / Hotjar /
  Amplitude / Segment / FB pixel / Datadog RUM / Sentry
  RUM in the tree. (Grepped for `gtag`, `ga(`, `fbq`,
  `_paq`, `hotjar`, `mixpanel`, `amplitude`, `datadog`,
  `sentry`, `posthog`, `plausible` across
  `frontend/src/**`.)
- Both providers are **gated by `consent?.analytics ===
  true`** in `frontend/src/lib/analytics.ts`:
  - Plausible: `injectPlausible(domain)` only runs from
    `initAnalyticsFromConsent` when `consent.analytics`
    is `true`.
  - PostHog: `capturePosthog(...)` is invoked **only by
    `trackEvent`**, which short-circuits via
    `if (!analyticsConsentGranted()) return;`.
- **Default state is denied.** Before the banner is
  decided, `getCookieConsent()` returns `null` →
  `analyticsConsentGranted()` returns `false`. Neither
  Plausible nor PostHog ever fire in this state. New
  test (`scripts/analytics-consent-default-denied.test.ts`)
  freezes this contract in CI-runnable shape.
- **No DOM is touched until consent flips.** Plausible's
  `<script>` tag is injected via DOM only inside
  `injectPlausible`, which is guarded by the consent
  check. PostHog uses `fetch()` (no SDK preload), so the
  network call is the only side effect — also gated by
  the same guard.
- **Server-side audit hop is privacy-safe.** Frontend
  posts a hashed visitor ID + choices to
  `POST /api/v1/consent/cookies`. The backend stores
  `sha256(visitor_id)`, **not the raw ID**, in
  `CookieConsentEvent.visitor_key_hash`. The user FK is
  optional (anonymous banner clicks are accepted). No PII
  in the event row.
- **SSR behaviour is safe.** `setupAnalyticsListeners()`,
  `initAnalyticsFromConsent()`, and `trackEvent()` all
  short-circuit if `typeof window === "undefined"`.
  `getCookieConsent()` returns `null` server-side because
  `safeStorage.getItem()` early-returns without `window`.
  So SSR / RSC pages do not leak analytics calls.
- Banner UX: **first paint hides the banner until the
  microtask resolves** (`useState<boolean | null>(null)`,
  set in a `queueMicrotask`). No `<Script>` runs in
  `head` / `body` before the banner decision exists — so
  there is no "default-load and retract" pattern that
  would have leaked a beacon before the user clicks
  "reject".

Verdict: **gating is solid, defence-in-depth is in
place, no production change in this commit.** Only a
new test + docs.

## Inventory of analytics surfaces

| Provider          | Trigger                           | Loaded by                                                             | Gate                                                                | Verdict |
| ----------------- | --------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- | ------- |
| Plausible         | `<script defer>` injection        | `injectPlausible(domain)` in `frontend/src/lib/analytics.ts`          | `initAnalyticsFromConsent`: `if (!consent?.analytics) return`        | ✅      |
| PostHog (capture) | `fetch("https://us.i.posthog.com/capture/")` | `capturePosthog(event, props)` in `frontend/src/lib/analytics.ts` | `trackEvent`: `if (!analyticsConsentGranted()) return`               | ✅      |
| `trackEvent` callers | `onClick` etc.                 | `landing-cta-band.tsx`, `waitlist-form.tsx`                           | inherited via `trackEvent` gate                                     | ✅      |
| Banner UI         | `useEffect` → `setVisible(...)`   | `frontend/src/components/cookie-consent-banner.tsx`                   | `hasDecidedCookieConsent()` → only show banner when decision is null | ✅      |
| Consent provider  | `getCookieConsent()` boot         | `frontend/src/components/cookie-consent-provider.tsx`                 | `useState<CookieConsentRecord \| null>(null)` → null until microtask | ✅      |
| Consent persistence | `localStorage["twin_cookie_consent_v1"]` | `frontend/src/lib/cookie-consent.ts` (`setCookieConsent`)        | only written by user-clicked banner action                          | ✅      |
| Consent audit POST | `apiFetch("/api/v1/consent/cookies", {method:"POST"})` | `frontend/src/lib/cookie-consent-sync.ts`             | only called after `setCookieConsent` succeeds                       | ✅      |
| Backend audit row | `CookieConsentEvent`              | `backend/app/api/consent.py`                                          | stores `sha256(visitor_id)` only; user FK optional                  | ✅      |
| Marketing pixels  | none                              | n/a (`initMarketingFromConsent` is a stub today)                      | already gated on `consent?.marketing === true`                      | ✅      |

## How the gate flows

```text
                  +-----------------------+
                  |   Provider boot       |
                  |   <html> renders      |
                  +-----------+-----------+
                              |
                              v
              +----------------------------+
              | CookieConsentProvider:     |
              |   consent = null           |
              |   (useState initial state) |
              +-------------+--------------+
                            |
              queueMicrotask( setConsent(getCookieConsent()) )
                            |
                            v
              +----------------------------+
              |   getCookieConsent()       |
              |   -> reads localStorage    |
              |   -> returns null OR record|
              +-------------+--------------+
                            |
       null (no decision)   |        record (decision exists)
       -------------------->|<----------------------------
                            |
                            v
              +----------------------------+
              |   CookieConsentBanner      |
              |   visible when decision is |
              |   null AND path allows     |
              +----------------------------+
                            |
                            v
              +----------------------------+
              |   acceptAll / rejectAll    |
              |   -> setCookieConsent({})  |
              |   -> dispatch COOKIE_      |
              |       CONSENT_EVENT        |
              +-------------+--------------+
                            |
                            v
              +----------------------------+
              |   setupAnalyticsListeners  |
              |   (in AnalyticsInit) hears |
              |   the event and calls      |
              |   initAnalyticsFromConsent |
              +-------------+--------------+
                            |
       consent.analytics    |   consent.analytics
       === false            |   === true
       -------------------->|<----------------------------
                            |
                            v                              v
              +----------------------------+   +-------------------------+
              |  NO-OP (return early)      |   |  injectPlausible(domain)|
              |                            |   |  + future capture calls |
              +----------------------------+   +-------------------------+
```

Key invariants:

1. The default state of `getCookieConsent()` is `null`,
   meaning **no decision yet**, treated as **denied**.
2. `analyticsConsentGranted()` returns `false` for both
   `null` and explicit-reject (`consent.analytics ===
   false`).
3. The single source of truth for "should analytics
   fire?" is `analyticsConsentGranted()` — `trackEvent`
   reads it on every call, not once at boot.
4. The banner UI itself only shows when the decision is
   **null** (i.e. has not been made yet) **and** the
   current path allows the banner (everything except
   `/auth/callback` — see
   `shouldShowCookieBannerOnPath`).

## Server-side behaviour (SSR + RSC + node tests)

- `safeStorage.getItem(key)` returns `null` when
  `typeof window === "undefined"` (`frontend/src/lib/
  safe-storage.ts:31`). So `getCookieConsent()` returns
  `null` during SSR — there is no way to load a stored
  consent from the server context, and there is no
  cookie-based fallback. Server renders treat all users
  as undecided → denied.
- `trackEvent()` early-returns on
  `typeof window === "undefined"`
  (`frontend/src/lib/analytics.ts:89`). So no
  accidental capture call during a server render or in
  a node script.
- `setupAnalyticsListeners()` returns a no-op disposer
  in node (`frontend/src/lib/analytics.ts:100`), so
  nothing in the analytics layer attaches an event
  listener server-side.

These three properties are now **covered by the new
node-tsx test** (`scripts/analytics-consent-default-
denied.test.ts`) — see "New test" below.

## Backend audit row (privacy-safe)

`POST /api/v1/consent/cookies` accepts:

- `version`, `analytics`, `marketing`, `decided_at`,
  `visitor_id` — all from the frontend body.
- An **optional** JWT (via
  `OAuth2PasswordBearer(auto_error=False)`). If present,
  the row's `user_id` is set; otherwise it is `NULL`.

What it stores in `CookieConsentEvent`:

- `user_id` — optional FK (null for unauthenticated).
- `visitor_key_hash` — `sha256(visitor_id)`. Raw visitor
  ID is **never persisted**. This is the privacy
  invariant for the audit log.
- `consent_version` — the consent schema version
  (currently `1`).
- `choices_json` — `{"necessary":true,"analytics":
  bool,"marketing":bool}`. No timestamps beyond
  `decided_at`. No IP. No User-Agent.

So even if the backend audit row is breached or shared,
no PII leaks out. The visitor cannot be re-identified
from `visitor_key_hash` alone (random `cv_*` prefix from
`safeStorage`).

## Banner first-paint behaviour

The banner is a **client component** (`"use client"`),
mounted via `Providers` in the root layout. The first
render returns `null` (because the component
short-circuits while `visible === null`). The
`useEffect` runs after hydration, queues a microtask,
and either:

- shows the banner if no decision is stored
  (`hasDecidedCookieConsent() === false`) **and** the
  path is one where the banner is allowed
  (`shouldShowCookieBannerOnPath(pathname) === true`);
- stays hidden otherwise.

There is **no fallback "default-load and retract"
analytics path**. Plausible is **not** loaded in the
head; PostHog is **not** preloaded via SDK. Both only
fire after consent flips analytics to `true`.

## What is **not** in scope

- The cookie-consent **UX copy** (already i18n'd, no
  change in this audit).
- The consent **storage shape** (already documented in
  `docs/COOKIE_CONSENT.md`).
- The eventual move to a **first-party PostHog reverse
  proxy** (P2 item; would change the `connect-src` story
  in CSP, see TASK 5 in this same session).
- The **EU vs non-EU** routing of the banner. Today the
  banner is shown to everyone; that is the right
  default for GDPR but a future "no banner in US-only
  mode" experiment is out of scope.

## New test

`frontend/scripts/analytics-consent-default-denied.test.ts`
— 6 assertions:

1. `getCookieConsent()` returns `null` when nothing is
   stored.
2. `analyticsConsentGranted()` returns `false` by default.
3. `marketingConsentGranted()` returns `false` by default.
4. `initAnalyticsFromConsent(null)` and
   `initAnalyticsFromConsent({...analytics:false})` are
   no-ops (no throw, no DOM access).
5. `initMarketingFromConsent(null)` and reject-all are
   no-ops.
6. `setupAnalyticsListeners()` returns a no-op cleanup
   in a node environment (no `window`) — the disposer
   exists and does not throw.

Wired into `frontend/package.json` as
`npm run test:analytics-consent`. Runs in <1s under
`tsx`.

```text
$ cd frontend && npm run test:analytics-consent
> frontend@0.1.0 test:analytics-consent
> npx --yes tsx scripts/analytics-consent-default-denied.test.ts

ok getCookieConsent() returns null when nothing is stored
ok analyticsConsentGranted() defaults to false (denied)
ok marketingConsentGranted() defaults to false (denied)
ok initAnalyticsFromConsent(null) is a no-op (no throw, no side-effect)
ok initMarketingFromConsent(null) is a no-op (no throw, no side-effect)
ok setupAnalyticsListeners() returns a no-op cleanup without window
```

Frontend gates re-run after the change:

| Gate                      | Result   |
| ------------------------- | -------- |
| `npm run lint` (eslint)   | 0 errors / 0 warnings |
| `npx tsc --noEmit`        | 0 errors |
| `npm run build` (Next 16) | 0 errors |
| `npm run test:cookie-consent` | 4/4 OK |
| `npm run test:analytics-consent` | 6/6 OK |

## Hard bans honoured (this run)

- No Railway change / redeploy.
- No API redeploy.
- No DB migration.
- No prod env change.
- No secret / JWT in this doc.
- No `--no-verify`, no force-push.
- No UX / copy change (banner copy untouched).
- No new analytics provider added.
- The new test runs entirely in node — no real PostHog /
  Plausible network call, no real event sent.

## Files changed

- `frontend/scripts/analytics-consent-default-denied.test.ts`
  (new).
- `frontend/package.json` (one new script alias:
  `test:analytics-consent`).
- `docs/P1_COOKIE_ANALYTICS_AUDIT_2026-05-27.md`
  (this doc).

## Related

- `docs/COOKIE_CONSENT.md` — product-level consent UX
  and storage doc.
- `docs/I18N.md` — banner i18n discipline; informs
  copy decisions.
- `docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md`
  item 7 — Cookie-consent → analytics gating audit (the
  parent task; this commit is its delivery).
- `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md` (TASK 5
  of this session) — CSP `connect-src` for PostHog
  ingest is decided there.
