# Rendered homepage zero English leakage — 2026-06-09

**Branch:** `fix/rendered-page-zero-english-leakage-2026-06-09`  
**Owner:** TWIN Rendered Page Zero English Leakage Owner  
**Launch stance:** Public **NO-GO** preserved · auto-apply **PAUSED** · delegated **NOT LIVE**

## Founder bug

Spanish (and other non-EN) homepage and `/waitlist` showed English marketing copy:

- See what's inside  
- Founding cohort  
- Join founding wishlist  
- Founding spots left  
- What you get inside  
- Earn on outcomes / rewards band  

## Root cause

1. **`home.*`** — Only EN + PL had full homepage strings. Locales `es–ja` merged partial legacy overlays; ~64 rendered keys still matched English (including `curiosityEyebrow`, `joinWishlist`, founding counter).
2. **`candidateRewards.*`** — EN + PL only; rewards band on `/` fell back to English for seven locales.
3. **`WAITLIST_NARRATIVE`** — `es/fr/de/it/zh/ja/ar` were aliased to `en` (full waitlist page narrative in English).
4. **FAQ teaser on home** — `faq.homeTeaserLead` / `homeCta` EN-only for non-PL.
5. **Merge bug** — `mergeDeep` accepts two args; a third rendered overlay argument was silently dropped until fixed.

OG routes unchanged — still use `waitlist-og-copy.ts` (PR #62), no heavy dict imports.

## Fix

| Area | Change |
| --- | --- |
| `rendered-homepage-overlays.ts` | `home.*`, `candidateRewards.*`, FAQ teaser for es, de, fr, it, zh, ja, ar |
| `waitlist-narrative-locales.ts` | Full ES/DE narratives; FR/IT/ZH/JA/AR localized hero/founding blocks |
| `rendered-homepage-copy.ts` | Collector + leak phrase list for guards |
| `i18n.ts` | Chained `mergeDeep(base, premium, rendered)` |
| `test:i18n-rendered-homepage-guard` | Fails on founder-reported EN phrases; asserts ES/DE markers |

### Spanish examples

| Key / surface | ES |
| --- | --- |
| `home.curiosityEyebrow` | Mira qué hay dentro |
| `home.joinWishlist` | Únete a la wishlist founding |
| narrative `heroOfferBadge` | Cohorte founding — acceso anticipado gratis… |
| `candidateRewards.eyebrow` | Gana por resultados |

### German examples

| Key / surface | DE |
| --- | --- |
| `home.curiosityEyebrow` | Sieh, was drin ist |
| `home.joinWishlist` | Founding-Wishlist beitreten |
| narrative `heroOfferBadge` | Founding-Kohorte — kostenloser Early Access… |
| `candidateRewards.eyebrow` | Verdiene an Ergebnissen |

## Locales

All **9** shipped: `en`, `pl`, `es`, `it`, `fr`, `de`, `zh`, `ar`, `ja`.

## Tests

| Script | Result |
| --- | --- |
| `test:i18n-rendered-homepage-guard` | **New** — EN leak phrases + ES/DE markers |
| `test:i18n-coverage` | Key parity |
| `test:i18n-premium-product` | Premium surfaces |
| `test:i18n-visual-copy-guard` | Role hub DE guard |
| `test:trust-language-guard` | Trust copy |
| `test:og-bundle-guard` | OG edge bundle |
| `test:homepage-nav` | Persona nav |
| `test:auth-role-choice` | Role hubs |
| `test:interactive-demo` | Demo walkthrough |
| `lint` / `tsc` / `build` | Green |

## Founder smoke (post-deploy)

On https://twin-sooty.vercel.app with locale **ES**:

- `/` — no “See what's inside”, “Join founding wishlist”, “Founding cohort” in hero/CTA/rewards.
- `/waitlist` — founding badge, counter, form CTA in Spanish.
- `/demo`, `/login` — prior premium overlays still localized.

Repeat spot-check **DE** for founding CTAs.

## Related docs

- `docs/ZERO_ENGLISH_LEAKAGE_I18N_FIX_2026-06-09.md` — role hub fix (prior slice)
- `docs/I18N_FULL_TRANSLATION_COVERAGE_2026-06-08.md`
- `docs/FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md`
- `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md`
