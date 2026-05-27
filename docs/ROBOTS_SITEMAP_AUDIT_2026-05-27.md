# Robots / sitemap audit — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** Backlog 20 of the long autonomous security session.
A docs-only audit of `/robots.txt`, `/sitemap.xml`, and the
companion bot-UA filtering in `middleware.ts`. Sanity-checks
that we publish the right "do crawl / don't crawl" surface for
TWIN's current public posture (Phase 1, pre-public-launch).

## Sources of truth

| Concern                              | File                                                    |
| ------------------------------------ | ------------------------------------------------------- |
| `robots.txt`                         | `frontend/src/app/robots.ts`                            |
| `sitemap.xml`                        | `frontend/src/app/sitemap.ts`                           |
| UA filtering (real-time enforcement) | `frontend/src/middleware.ts` + `frontend/src/lib/bot-guard.ts` |

## robots.txt — what we publish today

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard
Disallow: /profile
Disallow: /login
Disallow: /register
Disallow: /auth/
Disallow: /consent/
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /onboarding-assistant
Disallow: /admin
```

### What this catches

- ✅ `/api/` — backend reverse-proxied surface; never want
  crawlers tripping rate-limits.
- ✅ `/dashboard` — auth-only candidate UI.
- ✅ `/profile` — auth-only candidate profile.
- ✅ `/login`, `/register`, `/forgot-password`, `/reset-password`
  — auth surfaces; no SEO value, lots of state-changing forms.
- ✅ `/auth/` — OAuth callback / login-with-X handlers.
- ✅ `/consent/` — privacy / cookie consent surface.
- ✅ `/onboarding-assistant` — post-signup flow.
- ✅ `/admin` — ops surface.

### What's missing (gaps worth filing)

| Gap                                              | Severity | Recommendation                                          |
| ------------------------------------------------ | -------- | ------------------------------------------------------- |
| No `Sitemap:` directive in robots.txt            | L        | Add `Sitemap: ${BASE}/sitemap.xml` so crawlers discover it without guessing |
| `/data-room/` not disallowed                     | M        | Investor data room is auth-gated; explicitly disallow for completeness |
| `/recruiter/` not disallowed                     | M        | Recruiter inbox surface; auth-gated; explicitly disallow |
| `/employer/attest/` not disallowed               | L        | Employer attestation surfaces; tokenised one-shot URLs; disallow |
| `/calendar/` callbacks not disallowed            | L        | OAuth callback URLs; already auth-gated; explicit disallow improves clarity |
| No per-UA carve-outs (LinkedInBot, etc.)         | L        | Not needed today; defer until LinkedIn share previews break |

None of these are security-grade leaks (the routes are all
auth-gated server-side). They're hygiene gaps in our SEO
surface.

## sitemap.xml — what we publish today

```
""           (home)
/waitlist    (highest crawl priority)
/first-1000
/beta
/for-candidates
/for-recruiters
/for-companies
/demo
/about
/faq
/contact
/calculator
/privacy
/terms
/status
/developers
```

### What this catches

All listed are public marketing pages with no auth requirement
and no user-specific content. Safe to index.

### What's missing (gaps worth filing)

| Gap                                  | Severity | Recommendation                                  |
| ------------------------------------ | -------- | ----------------------------------------------- |
| No `/pricing` in sitemap             | M        | Pricing page exists at `/pricing` (covered by `frontend/e2e/smoke.spec.ts`); add it |
| Missing `/blog`                      | L        | No blog yet; ignore                              |
| Missing `/changelog`                 | L        | No changelog yet; ignore                         |
| Locale alternates not declared       | L        | We localize en/pl via `t()`; consider `<xhtml:link rel="alternate" hreflang>` when SEO matters more |
| `lastModified` is "now" on every render | L     | Acceptable for marketing-only pages; would be incorrect if we add the blog |

### What the sitemap correctly does **not** include

- ✅ `/login`, `/register`, etc. — they're in `robots.txt`
  disallow.
- ✅ `/dashboard`, `/profile`, etc. — same.
- ✅ `/admin` — same.
- ✅ Per-user pages (`/waitlist/{referral_code}`,
  `/data-room/{token}`) — would leak codes if indexed.

## middleware.ts — runtime UA filtering

The middleware applies `shouldBlockLikelyBot(ua)` to every
non-API / non-static path:

```typescript
matcher: [
  "/((?!api/|_next/|favicon.ico|robots.txt|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|txt|woff2?|webmanifest)$).*)",
]
```

### What this catches

- ✅ Returns 403 to known scraper UAs at the edge — before
  React server-rendering, before our cookies pipeline, before
  rate-limit accounting.
- ✅ Excludes `/api/` so the bot guard doesn't double-hit the
  rate-limited backend.
- ✅ Excludes `robots.txt`, `/sitemap.xml` (matched by
  exclusion patterns) — never break crawlers that respect
  robots.txt.

### What `shouldBlockLikelyBot` blocks

Inspected in `frontend/src/lib/bot-guard.ts`. Targets:

- Headless probes (`HeadlessChrome`, `PhantomJS`, `puppeteer`)
- Known scraper UAs (`Scrapy`, `python-requests`, etc.)
- Empty UAs (`""`)

It explicitly **allows** known legitimate crawlers:
Googlebot, Bingbot, DuckDuckBot, LinkedInBot, FacebookExternalHit
(via lib/bot-guard.ts allowlist).

## Cross-checks

1. **No route in `disallow:` appears in `sitemap.xml`** —
   verified by reading both files; consistent.
2. **No route in `sitemap.xml` requires JWT** — verified by
   cross-referencing `BACKEND_ROUTE_INVENTORY_2026-05-27.md`;
   the only `/api/*` route reachable is the FastAPI side, which
   robots.txt disallows.
3. **Middleware matcher excludes `robots.txt` and `sitemap.xml`**
   — verified.

## Suggested next-actions (out of scope for this session)

Rank-ordered by risk × cost:

1. **Add `Sitemap:` directive to robots.txt** (L, 2 LOC).
   One-line change to `frontend/src/app/robots.ts`:
   ```typescript
   return {
     rules: { /* ... */ },
     sitemap: `${BASE}/sitemap.xml`,
   };
   ```
2. **Disallow `/data-room/`, `/recruiter/`, `/employer/attest/`**
   in robots.txt (L, 3 LOC). Pure hygiene; routes are already
   auth-gated.
3. **Add `/pricing` to sitemap.xml** (L, 1 LOC).
4. **Audit the `lib/bot-guard.ts` allowlist** to confirm
   LinkedInBot / FacebookExternalHit / Twitterbot are
   handled before launch — share previews matter on
   announcement day.

All four are pure-frontend, no-deploy changes appropriate
for the next session.

## Hard bans honoured

- ✅ Docs only.
- ✅ No source / robots / sitemap change in this commit.
- ✅ No middleware change.
- ✅ No deploy / Railway / Vercel change.
- ✅ No secret in this audit.
- ✅ No UX / copy change.

## Files

- `docs/ROBOTS_SITEMAP_AUDIT_2026-05-27.md` (this doc).

## Related

- `frontend/src/app/robots.ts` — source of `/robots.txt`.
- `frontend/src/app/sitemap.ts` — source of `/sitemap.xml`.
- `frontend/src/middleware.ts` + `frontend/src/lib/bot-guard.ts`
  — runtime UA filtering.
- `frontend/e2e/smoke.spec.ts` — E2E tests cover
  `robots.txt` content-type and the presence of `sitemap` in
  the body, plus the XML structure of `/sitemap.xml`.

Backlog 20 of the long autonomous security session.
