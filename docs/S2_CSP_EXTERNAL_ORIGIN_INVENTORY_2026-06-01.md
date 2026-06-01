# S2 CSP external origin inventory — 2026-06-01

Grepped `frontend/src/**`, `frontend/next.config.ts`, and analytics wiring.
Used to build the **narrowed report-only** CSP in `frontend/next.config.ts`.
**Not deployed to prod in this audit session** — prod still serves the prior permissive policy until the next frontend deploy.

## Summary table

| Feature | Directive | Host | Evidence path | Prod required? | Notes |
| ------- | --------- | ---- | ------------- | -------------- | ----- |
| Next.js bundles / RSC | `default-src`, `script-src` | `'self'` | `frontend/src/app/**` | Yes | Baseline |
| Next.js inline bootstrap | `script-src`, `style-src` | `'unsafe-inline'` | Next.js runtime | Yes | Nonce slice deferred |
| Next.js dev tooling | `script-src` | `'unsafe-eval'` | Next.js (dev-heavy) | Unclear prod | Kept for burn-in; reassess after 72h |
| Plausible analytics | `script-src`, `connect-src` | `https://plausible.io` | `frontend/src/lib/analytics.ts:50` | If env set | After cookie consent only |
| PostHog capture | `connect-src` | `https://us.i.posthog.com` | `frontend/src/lib/analytics.ts:58` | If env set | After cookie consent only |
| Geist fonts | `font-src` | `'self'`, `data:` | `frontend/src/app/layout.tsx` (`next/font/google`) | Yes | Self-hosted at build; no runtime gstatic |
| Nature wallpapers | `img-src` | `https://images.unsplash.com` | `frontend/src/lib/nature-wallpapers.ts` | Yes | Via `next/image` → `/_next/image` (browser sees `'self'`) |
| Company logo marquee (SI CDN) | `img-src` | `https://cdn.simpleicons.org` | `frontend/src/components/marketing/company-logo-marquee.tsx:147` | Yes (marketing) | Fallback chain |
| Company logo marquee (jsDelivr) | `img-src` | `https://cdn.jsdelivr.net` | same :154 | Yes (marketing) | Pinned `@11.14.0` |
| Favicon fallback (Google) | `img-src` | `https://www.google.com` | same :158 | Yes (marketing) | `/s2/favicons` |
| Favicon CDN tiers | `img-src` | `https://t0.gstatic.com` … `t3.gstatic.com` | `frontend/next.config.ts` remotePatterns | Yes | Image optimizer allowlist |
| Favicon fallback (DuckDuckGo) | `img-src` | `https://icons.duckduckgo.com` | company-logo-marquee :162 | Yes (marketing) | |
| Capital One raster fallback | `img-src` | `https://www.capitalone.com` | company-logo-marquee :47 | Yes (one brand) | `/favicon.ico` |
| Blob previews / downloads | `img-src` | `blob:` | `frontend/src/lib/api.ts:238`, admin beta export | Partial | `createObjectURL` for file save |
| Inline favicons / placeholders | `img-src` | `data:` | Tailwind / UI | Yes | |
| Founders manifesto video | `frame-src` | `https://www.youtube-nocookie.com` | `frontend/src/components/marketing/founders-launch-page.tsx:154` | If `NEXT_PUBLIC_LAUNCH_MANIFESTO_YOUTUBE_ID` set | Route: `/first-1000` |
| API (all authenticated + public) | `connect-src` | `'self'` | `frontend/src/app/api/v1/[[...path]]/route.ts` | Yes | Vercel proxy → Railway |
| Stripe Checkout | — | — | Server redirect only | No CSP | No `js.stripe.com` in browser |
| OAuth (Google/Microsoft/GitHub/Apple) | — | — | Backend `Location:` redirects | No CSP | Not in-page fetch |
| LinkedIn / GitHub footer links | — | — | `site-footer.tsx`, `beta/page.tsx` | No CSP | Navigation (`<a>` / `window.open`), not embeds |
| Employer demo external links | — | — | `job-employer-demo.ts` | No CSP | Demo URLs only in copy/links |
| WebSockets | — | — | Not found in `frontend/src` | No | |
| Vercel Live / Analytics | — | — | Not in codebase | No | Open if preview toolbar added |

## Open questions (unconfirmed hosts)

| Question | Risk if wrong | Mitigation during burn-in |
| -------- | ------------- | ------------------------- |
| PostHog EU (`eu.i.posthog.com`) needed? | Blocked analytics | Only `us.i.posthog.com` in code; add if env switches region |
| Plausible custom domain? | Blocked analytics | Prod uses `plausible.io` script URL only |
| Direct Railway API bypass? | Blocked API calls | All traffic via `/api/v1` proxy today |
| `unsafe-eval` required in prod build? | Console violations / future enforce break | Report-only 72h will confirm; nonce slice is separate PR |
| Additional favicon hosts from job board logos? | img-src violations | Job cards use `'self'` / placeholders; no arbitrary external img grep hit |
| YouTube iframe without env var? | None | iframe omitted when `videoId` unset; `frame-src` still allowlisted |

## Narrowed report-only CSP (repo, 2026-06-01)

```
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:
          https://images.unsplash.com
          https://cdn.simpleicons.org
          https://cdn.jsdelivr.net
          https://www.google.com
          https://t0.gstatic.com https://t1.gstatic.com https://t2.gstatic.com https://t3.gstatic.com
          https://icons.duckduckgo.com
          https://www.capitalone.com;
  font-src 'self' data:;
  connect-src 'self' https://plausible.io https://us.i.posthog.com;
  frame-src https://www.youtube-nocookie.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  report-uri /api/v1/csp-report
```

## Related

- `docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md`
- `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`
- `docs/S2_CSP_RAILWAY_LOG_TRIAGE_PLAN_2026-06-01.md`
- `docs/S2_CSP_DEVTOOLS_BURNIN_CHECKLIST_2026-06-01.md`
