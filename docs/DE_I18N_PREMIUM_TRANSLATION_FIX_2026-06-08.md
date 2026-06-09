# German premium i18n translation fix — 2026-06-08

**Branch:** `fix/de-premium-i18n-coverage-2026-06-08`  
**Owner:** TWIN German i18n Premium Translation Fix Owner  
**Launch stance:** Public **NO-GO** preserved · auto-apply **PAUSED** · delegated **NOT LIVE**

## Problem

The machine-generated `premium/generated/de.ts` overlay (from `generate-premium-overlays.ts`) passed structural coverage tests but contained hundreds of awkward or incorrect German strings (e.g. *Streichhölzer* for matches, *Spielergebnis* for match score, *Abfall* for decline). Premium product surfaces read as low-quality MT, not professional DE product copy.

## Solution

- **Curated overlay:** `frontend/scripts/build-de-premium-overlay.ts` holds path-keyed professional DE for all **444** premium product keys.
- **Regenerate:** `npx tsx scripts/build-de-premium-overlay.ts` → writes `frontend/src/lib/overlays/premium/generated/de.ts`.
- **Term mapping (examples):**
  - KI-gestütztes Ranking
  - Fehlende Daten (`recruiterInbox.missingChipPrefix`)
  - Passungsscore / Passung (match quality)
  - Recruiter (B2B console surfaces)
  - Interview-Reservierung (calendar holds)
  - Auto-Apply pausiert · delegierte Bewerbung nicht live

## Surfaces covered

Same premium slice set as `docs/I18N_FULL_TRANSLATION_COVERAGE_2026-06-08.md`:

- Interactive demo + `/demo` walkthrough
- Dashboard Today NBA, match quality, application transparency
- Recruiter decision console + inbox segments
- Guided empty states (candidate + recruiter)
- Auth role hubs (`/login`, `/register`)
- Nav + recruiter calendar placeholder
- Persona talent pool preview

## Out of scope

- OG image routes — unchanged (`test:og-bundle-guard`); see `docs/OPENGRAPH_EDGE_BUNDLE_SIZE_FIX_2026-06-08.md`.
- Base overlay `frontend/src/lib/overlays/de.ts` — unchanged (non-premium marketing strings).

## Tests (all must pass)

```bash
cd frontend
npm run test:i18n-coverage
npm run test:i18n-premium-product
npm run test:trust-language-guard
npm run test:og-bundle-guard
npm run test:homepage-nav
npm run test:auth-role-choice
npm run test:interactive-demo
npm run lint && npx tsc --noEmit && npm run build
```

## Founder QA (DE spot-check)

After merge, spot-check **DE** on:

- `/demo` — walkthrough steps, simulation label
- `/dashboard` — NBA cards, match groups, transparency panel
- `/recruiter/inbox` — decision console, segments, review card chips (*Fehlende Daten*)
- `/recruiter/calendar` — NOT LIVE placeholder
- `/login` / `/register` — role hubs

See `docs/FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md`.

## Related

- `docs/I18N.md`
- `docs/I18N_FULL_TRANSLATION_COVERAGE_2026-06-08.md`
- `frontend/scripts/generate-premium-overlays.ts` — MT generator for es/it/fr/zh/ar/ja (DE uses curated builder instead)
