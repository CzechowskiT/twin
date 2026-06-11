# Global chrome zero English leakage fix — 2026-06-11

**Branch:** `fix/global-chrome-zero-english-leakage-2026-06-11`  
**Owner:** TWIN Global Chrome Zero English Leakage Owner  
**Launch stance:** Public **NO-GO** preserved · auto-apply **PAUSED** · delegated **NOT LIVE**

## Problem

Founder QA on Spanish homepage (`/`) showed English in lower/global chrome:

- Momentum rail: `KEEP MOMENTUM`, `Small rituals beat…`, `Open tricky listings…`, `When you save or apply…`, `Create account`, `Log in`, `FAQ`
- Footer: `Autonomous career agent`, `COMPANY`, `EXPLORE`, `SOCIAL`, `LEGAL`, `Wishlist (early access)`, `Home`, `Privacy Policy`, `Terms of Service`, `System status`, `Cookie settings`, `Developers`, `Candidates`, `Investor`, `Careers`, `Case studies`, `Media`, `Contact`, etc.

Root cause: `SITE_MESSAGES_EN` / `site.*` keys and marketing `nav.*` chrome labels had **PL only**; es–ja fell back to English via dictionary clone.

## Fix

### New overlay module

`frontend/src/lib/overlays/site-chrome.ts` — merged in `localeFromOverlays()` after marketing-home overlays:

| Surface | Keys | Locales |
| ------- | ---- | ------- |
| Footer columns | `site.footerTagline`, `footerExplore`, `footerCompany`, `footerLegal`, `footerSocial`, legal links, rights | es, de, fr, it, zh, ar, ja |
| Momentum rail | `site.momentumEyebrow`, `momentumLead`, `momentumTip1–6`, CTAs | es–ja |
| Marketing nav chrome | `nav.about`, `cases`, `careers`, `contact`, `forCandidates`, `forInvestors`, `waitlist`, etc. | es–ja |

**ES examples:** `Mantén el impulso`, `Agente de carrera autónomo`, `Crear cuenta`, `Lista fundadora (acceso anticipado)`, `Política de privacidad`  
**DE examples:** `Schwung beibehalten`, `Autonomer Karriere-Agent`, `Konto erstellen`, `Gründerliste (früher Zugang)`, `Datenschutzerklärung`

### Guards

`frontend/scripts/i18n-global-chrome-guard.test.ts` + extended `i18n-rendered-surfaces.ts`:

- `RENDERED_GLOBAL_CHROME_KEYS` — footer, momentum, nav labels on public routes
- `FORBIDDEN_EN_CHROME` — founder-reported EN phrases
- Positive ES/DE assertions for key chrome strings
- Allowlist: `FAQ`, `Demo` (product loanwords)

### OG unchanged

`/waitlist/opengraph-image` still uses minimal `WAITLIST_OG_COPY` (en/pl only). No OG bundle regression.

## Routes covered

`/`, `/waitlist`, `/demo`, `/login`, `/register`, `/dashboard`, `/dashboard/calendar`, `/recruiter/inbox`, `/recruiter/calendar` — via shared `SiteFooter`, `PageMomentumRail`, `SiteHeaderBar` chrome.

## Tests

`test:i18n-global-chrome-guard` (new), `i18n-rendered-homepage-guard`, `i18n-visual-copy-guard`, `i18n-coverage` (key coverage + empty values), `i18n-premium-product`, `trust-language-guard`, `og-bundle-guard`, `homepage-nav`, `auth-role-choice`, `interactive-demo`, `lint`, `tsc`, `build`.

Note: `i18n-coverage` premium-subsection (`recruiterInbox.*` EN fallback) was **pre-existing** on `cursor/phase1-monorepo-scaffold` — out of scope for this chrome-only fix.

## Founder smoke (post-deploy)

- `https://twin-sooty.vercel.app/` — **ES/DE** homepage footer + momentum rail
- `/demo`, `/login`, `/register` — chrome labels localized
- `/api/public-health`, `/waitlist/opengraph-image` — unchanged

## Related docs

- `docs/I18N.md`
- `docs/HOMEPAGE_BELOW_FOLD_I18N_LEAKAGE_FIX_2026-06-09.md`
- `docs/RENDERED_LOCALE_LEAKAGE_HARDENING_2026-06-09.md`
