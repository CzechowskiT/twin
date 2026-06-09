# Rendered locale leakage hardening — 2026-06-09

**Branch:** `fix/rendered-locale-leakage-hardening-2026-06-09`  
**Owner:** TWIN Rendered Locale Leakage Hardening Owner  
**Launch stance:** Public **NO-GO** preserved · auto-apply **PAUSED** · delegated **NOT LIVE**

## Problem (PR #65 fallout)

Non-EN/PL locales showed English marketing tokens on rendered surfaces:

- **ES:** `inside`, `wishlist`, `founding` on `/`, `/demo`, hubs
- **DE:** `Founding-Wishlist`, `Early Access`, full EN premium overlay regression
- **FR/IT/ZH/JA/AR:** waitlist narrative fell back to EN; partial `...en` spreads in waitlist messages

## Fixes

### Marketing home overlays (`frontend/src/lib/overlays/marketing-home.ts`)

Merged per locale for `/` hero, inside steps, CTAs, stats, feature grid:

- **ES:** e.g. `Mira qué hay dentro`, `Únete a la lista fundadora`
- **DE:** e.g. `Zur Gründerliste anmelden`, `Gründerkohorte — kostenloser früher Zugang…`
- **FR/IT/ZH/JA/AR:** bespoke hero/founding copy (no EN loanwords on rendered keys)

### Dictionary merge bug

`mergeDeep` accepts two arguments only. `localeFromOverlays` now chains:

`baseOverlay → marketingHome → premiumOverlay` so premium/register/demo keys are not dropped.

### Premium overlays

- **ES:** demo/register wishlist strings → Spanish fundadora copy
- **DE:** restored German premium overlay; fixed `Gründerliste`, match labels, `hubCuriosity`

### Waitlist

- **`waitlist-messages.ts`:** removed `wishlist` / `founding` / `early access` from es–ar overrides
- **`waitlist-narrative.ts`:** locale narratives for es, de, fr, it, zh, ja, ar (no `es: en` fallback)

## Guard strategy

| Script | Purpose |
| ------ | ------- |
| `npm run test:i18n-rendered-homepage-guard` | Rendered keys on `/`, hubs, `/demo`, `/waitlist`; forbidden EN tokens; PR #65 exact bad examples; cross-locale signature leakage |
| `npm run test:i18n-visual-copy-guard` | Marketing/auth/waitlist components use `t()` / `useWaitlistCopy()` / hub keys — no hardcoded EN CTAs |
| `npm run test:og-bundle-guard` | `/first-1000`, `/beta` OG stay static EN; `/waitlist` OG uses `WAITLIST_MESSAGES` only |

Forbidden tokens (non-EN, tight allowlist): `wishlist`, `founding`, `early access`, `See what's inside`, `Join founding wishlist`, `Founding-Wishlist`.  
**PL** exempt from `wishlist`/`founding` bans (product loanwords). Allowlist: TWIN, B2B, ROI, Demo, FAQ, GDPR, etc.

Shared surface list: `frontend/scripts/i18n-rendered-surfaces.ts`.

## Tests (all pass)

`i18n-rendered-homepage-guard`, `i18n-visual-copy-guard`, `og-bundle-guard`, `i18n-coverage`, `i18n-premium-product`, `trust-language-guard`, `homepage-nav`, `auth-role-choice`, `interactive-demo`, `lint`, `tsc`, `build`.

## Founder smoke

After deploy, spot-check:

- `/` in ES/DE — hero, inside steps, sticky CTA
- `/waitlist` in FR/IT — founding offer strip, form submit
- `/login`, `/register` — hub curiosity line
- `/demo` — wishlist CTA in guest mode

## Related docs

- `docs/I18N.md`
- `docs/I18N_FULL_TRANSLATION_COVERAGE_2026-06-08.md` (updated below)
