# Full i18n translation coverage — 2026-06-08

**Branch:** `fix/full-i18n-translation-coverage-2026-06-08`  
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
| `de` | Deutsch | Base overlay + premium product overlay |
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
- Homepage nav + auth role hubs (`nav.*`, `login.*`, `register.*`)
- Recruiter calendar placeholder (`recruiterCalendar.*`)
- Persona talent pool preview (`persona.*`)
- Homepage phased automation cue (`home.feature6*`)

## Implementation

- **Source:** `frontend/src/lib/i18n.ts` (`en`, `pl`)
- **Locale overlays:** `frontend/src/lib/overlays/{es,it,fr,de,zh,ar,ja}.ts`
- **Premium product overlays:** `frontend/src/lib/overlays/premium/generated/*.ts` merged at dictionary build time
- **Safe fallback:** `getNestedValue` / `translate()` return the key path only when a value is missing (should not occur after coverage tests)
- **Regenerate premium overlays:** `npx tsx scripts/generate-premium-overlays.ts [locale]`

## Tests

| Script | Purpose |
| ------ | ------- |
| `npm run test:i18n-coverage` | Recursive key parity vs `en`, no empty strings, premium keys ≠ English for non-`en` |
| `npm run test:i18n-premium-product` | Premium route wiring + PL/ES sample keys |
| `npm run test:i18n-rendered-homepage-guard` | Rendered `/`, hubs, `/demo`, `/waitlist` — no EN marketing leakage |
| `npm run test:i18n-visual-copy-guard` | Marketing/auth/waitlist components route copy through i18n |
| `npm run test:og-bundle-guard` | Static OG bundles unchanged; waitlist OG locale-aware |
| `npm run test:trust-language-guard` | Forbidden claims in source surfaces **and** all locale dictionaries |

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
- `/login` / `/register` (role hubs)

See `docs/FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md`.

## Related docs

- `docs/I18N.md` — engineering rules (`t()`, `X-Locale`)
- `docs/PREMIUM_PRODUCT_EXPERIENCE_POLISH_PLAN_2026-06-08.md` — slice map
- `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` — launch gates
