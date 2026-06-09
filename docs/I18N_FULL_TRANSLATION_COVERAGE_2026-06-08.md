# Full i18n translation coverage — 2026-06-08

**Branch:** `fix/zero-english-leakage-i18n-2026-06-09` · DE curated overlay via `build-de-premium-overlay.ts`  
**Owner:** TWIN Full i18n Translation Coverage Owner  
**Launch stance:** Public **NO-GO** preserved · auto-apply **PAUSED** · delegated **NOT LIVE**

## Supported locales

| Code | Label | Strategy |
| ---- | ----- | -------- |
| `en` | English | Source dictionary |
| `pl` | Polski | Full inline dictionary (premium PL terms per product spec) |
| `es` | Español | Base overlay + premium product overlay |
| `it` | Italiano | Base overlay + premium product overlay |
| `fr` | Français | Base overlay + premium product overlay |
| `de` | Deutsch | Base overlay + **curated** premium product overlay (`build-de-premium-overlay.ts`) |
| `zh` | 中文 | Base overlay + premium product overlay |
| `ar` | العربية | Base overlay + premium product overlay (RTL via `localeIsRtl`) |
| `ja` | 日本語 | Base overlay + premium product overlay |

## Premium surfaces covered (slices #52–#59)

- Interactive demo walkthrough (`interactiveDemo.*`, `demo.*`)
- Candidate Today / Next Best Action (`dashboard.todayNba*`)
- Match quality groups (`dashboard.matchQuality*`)
- Application transparency panel (`dashboard.applicationTransparency*`)
- Recruiter decision console + inbox segments (`recruiterInbox.*`)
- Guided empty states (`ux.guidedEmpty*`)
- Homepage nav + auth role hubs (`nav.*`, `login.*`, `register.*`, **`authRoles.*`**)
- Recruiter calendar placeholder (`recruiterCalendar.*`)
- Persona talent pool preview (`persona.*`)
- Homepage phased automation cue (`home.feature6*`)
- **Rendered homepage + waitlist (2026-06-09):** `home.*` rendered keys, `candidateRewards.*`, FAQ home teaser, `WAITLIST_NARRATIVE` for es–ja — see `docs/RENDERED_HOMEPAGE_ZERO_ENGLISH_LEAKAGE_FIX_2026-06-09.md`

## Implementation

- **Source:** `frontend/src/lib/i18n.ts` (`en`, `pl`)
- **Locale overlays:** `frontend/src/lib/overlays/{es,it,fr,de,zh,ar,ja}.ts`
- **Premium product overlays:** `frontend/src/lib/overlays/premium/generated/*.ts` merged at dictionary build time
- **Safe fallback:** `getNestedValue` / `translate()` return the key path only when a value is missing (should not occur after coverage tests)
- **Regenerate premium overlays:** `npx tsx scripts/generate-premium-overlays.ts [locale]` (es/it/fr/zh/ar/ja)
- **Regenerate DE premium (curated):** `npx tsx scripts/build-de-premium-overlay.ts` — see `docs/DE_I18N_PREMIUM_TRANSLATION_FIX_2026-06-08.md`
- **Edge OG routes (exception):** `opengraph-image` / `twitter-image` use `frontend/src/lib/og/*` only — **not** `i18n.ts` or premium overlays (Vercel 1 MB Edge limit). See `docs/OPENGRAPH_EDGE_BUNDLE_SIZE_FIX_2026-06-08.md`.

## Tests

| Script | Purpose |
| ------ | ------- |
| `npm run test:i18n-coverage` | Recursive key parity vs `en`, no empty strings, premium keys ≠ English for non-`en` |
| `npm run test:i18n-premium-product` | Premium route wiring + PL/ES sample keys |
| `npm run test:i18n-visual-copy-guard` | Role hub `authRoles.*` parity; German English-leak guard |
| `npm run test:i18n-rendered-homepage-guard` | Rendered `/` + `/waitlist` EN leak phrases; ES/DE marker smoke |
| `npm run test:trust-language-guard` | Forbidden claims in source surfaces **and** all locale dictionaries |
| `npm run test:og-bundle-guard` | OG image routes must not import full i18n / waitlist-messages / overlays |

## Copy safety

All locales must keep:

- Auto-apply **paused** / not live on production
- Delegated apply **not live**
- **Human recruiter decision** — no “AI decides” / “AI hires”
- No guaranteed interview or invented traction claims

## Founder QA

After merge, run visual founder smoke on:

- `/demo` (interactive walkthrough)
- `/dashboard` (NBA, match groups, transparency, guided empty states)
- `/recruiter/inbox` (decision console segments)
- `/recruiter/calendar` (not-live placeholder)
- `/login` / `/register` (role hubs — verify **DE** cards: Kandidat, Unternehmen, Arbeitsbereich öffnen; see `docs/ZERO_ENGLISH_LEAKAGE_I18N_FIX_2026-06-09.md`)
- `/` + `/waitlist` (locale **ES** or **DE** — no founder-reported EN phrases; see `docs/RENDERED_HOMEPAGE_ZERO_ENGLISH_LEAKAGE_FIX_2026-06-09.md`)

See `docs/FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md`.

## Related docs

- `docs/I18N.md` — engineering rules (`t()`, `X-Locale`)
- `docs/PREMIUM_PRODUCT_EXPERIENCE_POLISH_PLAN_2026-06-08.md` — slice map
- `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` — launch gates
- `docs/DE_I18N_PREMIUM_TRANSLATION_FIX_2026-06-08.md` — German premium copy fix
- `docs/ZERO_ENGLISH_LEAKAGE_I18N_FIX_2026-06-09.md` — role hub English leakage fix
- `docs/RENDERED_HOMEPAGE_ZERO_ENGLISH_LEAKAGE_FIX_2026-06-09.md` — homepage/waitlist rendered copy
