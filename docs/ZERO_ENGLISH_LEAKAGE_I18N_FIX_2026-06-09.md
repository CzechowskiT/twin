# Zero English leakage — role hub i18n fix — 2026-06-09

**Branch:** `fix/zero-english-leakage-i18n-2026-06-09`  
**Owner:** TWIN Zero English Leakage i18n Fix Owner  
**Launch stance:** Public **NO-GO** preserved · auto-apply **PAUSED** · delegated **NOT LIVE**

## Founder bug

German `/login` and `/register` role hubs showed English card copy:

- Candidate, Recruiter, Companies, Investor  
- Open workspace  
- Demo · Dashboard · Matches  
- For companies · B2B calculator  
- Scenario calculator · Metrics  

Hub titles (`login.hubTitle` / `register.hubTitle`) were already translated via premium overlays; **role cards** were not.

## Root cause

`AuthZoneHub` rendered `workspace.zone*Title` / `workspace.zone*Tools` keys. Those strings exist in full for **EN** and **PL** only. Locales **de, es, it, fr, zh, ar, ja** merged premium overlays for `login.*` but **not** the workspace role-card keys — so cards fell back to English.

`persona-access.ts` had no hardcoded user strings; routing was correct.

## Fix

1. **`authRoles.*` namespace** in `frontend/src/lib/i18n.ts` — dedicated role-hub card copy (title, tools subtitle, enter CTA).
2. **`AuthZoneHub`** now uses `authRoles.*` instead of `workspace.*`.
3. **Premium overlays** (`frontend/src/lib/overlays/premium/generated/{de,es,it,fr,zh,ar,ja}.ts`) — `authRoles` + `workspace.zone*` translations for signed-in workspace picker.
4. **`PREMIUM_I18N_PREFIXES`** extended with `authRoles.*` and `workspace.zone*` / `workspace.enterZone`.
5. **`test:i18n-visual-copy-guard`** — fails if German role hub contains founder-reported English leaks; asserts all locales define `authRoles` keys.

### German examples (post-fix)

| Key | DE value |
| --- | -------- |
| `login.hubTitle` | Wählen Sie Ihre Rolle |
| `authRoles.candidateTitle` | Kandidat |
| `authRoles.companyTitle` | Unternehmen |
| `authRoles.enterZone` | Arbeitsbereich öffnen |
| `authRoles.recruiterTools` | Posteingang · B2B-ROI-Rechner |

## Locales covered

All **9** shipped locales: `en`, `pl`, `es`, `it`, `fr`, `de`, `zh`, `ar`, `ja`.

## Tests

| Script | Result |
| ------ | ------ |
| `npm run test:i18n-coverage` | Key parity + premium ≠ EN |
| `npm run test:i18n-premium-product` | Premium surfaces + authRoles sample keys |
| `npm run test:i18n-visual-copy-guard` | **New** — DE leak guard + authRoles parity |
| `npm run test:trust-language-guard` | Trust copy |
| `npm run test:homepage-nav` | Persona nav |
| `npm run test:auth-role-choice` | Role hubs |
| `npm run test:interactive-demo` | Demo walkthrough |
| `npm run lint` / `tsc` / `build` | Green |

## Founder smoke (post-deploy)

On https://twin-sooty.vercel.app with locale **DE**:

- `/login` — hub title + four cards fully German (no “Candidate”, “Companies”, “Open workspace”).
- `/register` — same card copy; register hub title German.
- `/demo` — interactive walkthrough still localized (prior premium overlays).

## Related docs

- `docs/I18N_FULL_TRANSLATION_COVERAGE_2026-06-08.md` — updated with `authRoles` + visual guard
- `docs/RENDERED_HOMEPAGE_ZERO_ENGLISH_LEAKAGE_FIX_2026-06-09.md` — homepage/waitlist rendered copy (follow-up slice)
- `docs/FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md` — DE role-hub spot-check added
- `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` — safe-lane merge note
