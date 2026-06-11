# Full i18n zero mixed-language fix (2026-06-11)

## Problem

Italian (and other es–ja) locales showed English on public surfaces:

1. **Hero CTA subtext** — `home.ctaRegisterMicro` stayed `"See your matches in ~2 min"` for IT, ZH, AR, JA.
2. **Homepage FAQ persona cards** — section labels were localized (e.g. CANDIDATI) but first questions per persona (`candidates01Q`, `recruiters01Q`, `companies01Q`, `investors01Q`) fell back to English.
3. **Full `/faq` page** — 82 of 96 `faq.*` keys were English for es–ja (only 14 teaser keys existed in `marketing-home-below-fold.ts`).

## Fix

### Hero subtext

Added `ctaRegisterMicro` (+ `getStarted` where missing) to `marketing-home.ts` for **it**, **zh**, **ar**, **ja**.

| Locale | `home.ctaRegisterMicro` |
|--------|-------------------------|
| it | Vedi i tuoi match in ~2 min |
| zh | 约 2 分钟内查看匹配 |
| ar | شاهد تطابقاتك في ~2 دقيقة |
| ja | 約2分でマッチを確認 |

### FAQ full locale overlays

- New package: `frontend/src/lib/overlays/faq/` — 82 supplemental keys × 7 locales (es, de, fr, it, zh, ar, ja).
- Source data: `frontend/scripts/faq-data/{locale}.ts` + `scripts/seed-faq-locale-overlays.ts` (regenerate `faq/*.ts` after edits).
- Wired in `localeFromOverlays()` via `FAQ_LOCALE_OVERLAYS` merge **after** marketing-home and site-chrome overlays.

### Guards

- `scripts/i18n-rendered-surfaces.ts`: `home.ctaRegisterMicro` + persona FAQ preview keys in `RENDERED_*`; forbidden EN phrases for hero subtext and four FAQ questions.
- `scripts/i18n-rendered-homepage-guard.test.ts`: dedicated IT smoke for founder-reported strings.
- `src/lib/marketing/rendered-homepage-copy.ts`: aligned `RENDERED_FAQ_KEYS` and `ENGLISH_LEAK_PHRASES`.

## Verification

```bash
cd frontend
npm run test:i18n-global-chrome-guard
npm run test:i18n-rendered-homepage-guard
npm run test:i18n-visual-copy-guard
npm run test:i18n-coverage          # premium recruiterInbox subset still pre-existing on base
npm run test:i18n-premium-product
npm run test:trust-language-guard
npm run test:og-bundle-guard
npm run test:homepage-nav
npm run test:auth-role-choice
npm run test:interactive-demo
npm run lint
npx tsc --noEmit
npm run build
```

Post-fix: `faq` English leak count is **0** for all es–ja locales.

## Hard bans confirmed

- No sections removed, no languages disabled, guards strengthened (not weakened).
- No env / DB / CSP / launch-stance changes.

## Related docs

- `docs/I18N.md` — overlay merge order updated.
- Prior: `docs/GLOBAL_CHROME_ZERO_ENGLISH_LEAKAGE_FIX_2026-06-11.md`, `docs/HOMEPAGE_BELOW_FOLD_I18N_LEAKAGE_FIX_2026-06-09.md`.
