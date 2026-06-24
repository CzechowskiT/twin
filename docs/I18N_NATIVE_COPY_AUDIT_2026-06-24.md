# Native product copy audit — 2026-06-24

**Branch:** `fix/i18n-native-product-copy-2026-06-24`  
**Owner:** TWIN Native-Language Product Copy & i18n Quality  
**Mode:** COPY/I18N ONLY — no logic, routes, API, auth, shell, gates, Phase 3B

## Supported languages

| Code | Label | Strategy |
| ---- | ----- | -------- |
| `en` | English | Source dictionary in `i18n.ts` |
| `pl` | Polski | Full inline dictionary in `i18n.ts` (priority rewrite) |
| `es` | Español | Base overlay + premium overlays |
| `it` | Italiano | Base overlay + premium overlays |
| `fr` | Français | Base overlay + premium overlays |
| `de` | Deutsch | Base overlay + premium overlays |
| `zh` | 中文 | Base overlay + premium overlays |
| `ar` | العربية | Base overlay + premium overlays (RTL) |
| `ja` | 日本語 | Base overlay + premium overlays |

**Note:** No `locales/*` tree — all dictionaries merge via `frontend/src/lib/i18n.ts` + `frontend/src/lib/overlays/**`.

## Main i18n files

| File | Role |
| ---- | ---- |
| `frontend/src/lib/i18n.ts` | EN + PL source; dictionary build |
| `frontend/src/lib/site-messages.ts` | Site chrome EN/PL |
| `frontend/src/lib/faq-messages.ts` | FAQ EN/PL |
| `frontend/src/lib/overlays/*.ts` | es–ja base overlays |
| `frontend/src/lib/overlays/premium/**` | Premium product overlays |
| `frontend/scripts/i18n-native-copy-quality.test.ts` | **New** native copy guard |
| `frontend/scripts/trust-language-guard.test.ts` | Extended forbidden claims |
| `frontend/scripts/i18n-coverage.test.ts` | Extended placeholder parity |

## Discovery — calque patterns found (PL)

| Pattern | Issue | Remediation |
| ------- | ----- | ----------- |
| `Dowód operacyjny` | Legalistic calque of “operating evidence” | → `Materiały…` / `Podgląd operacyjny` |
| `przegląd człowieka` | Awkward literal “human review” | → `ręczna weryfikacja` |
| `gotowość oferty` | Stiff product term | → `przygotowanie do oferty` |
| `busy-read` / `live sync` in user-facing PL | Untranslated technical stack | → `odczyt zajętości kalendarza` / `synchronizacja` |
| `alignmentowych` | English loan calque | → `uzgadniających` |
| `Self-declaration` | English in PL strings | → `Oświadczenia własne` |
| `board` as UI label | Opaque for PL executives | → `zarząd` where user-facing |

## High-risk product areas audited

- Placement verification evidence
- Offer readiness center (candidate + recruiter/company preview + board)
- Calendar readiness + Microsoft busy-read readiness
- Scheduling decision context
- Board offer/placement monitors
- Dashboard automation transparency (PL/EN safety copy preserved)
- Recruiter inbox trust copy (unchanged keys; already natural PL)

## Changes made (this batch)

### Polish (heavy)

- Rewrote `placementVerificationEvidence`, `microsoftCalendarReadiness`, `microsoftBusyRead`, `calendarReadinessEvidence`, `candidateOfferReadiness`, `offerReadinessEvidence`, `schedulingDecisionContext`, `offerReadinessPreview`, `boardOfferReadiness`, `boardPlacementEvidence` in `i18n.ts`.
- Global PL pass: `przegląd człowieka` → `ręczna weryfikacja` (11+ keys), `powierzchnie operacyjne` → `ekrany operacyjne`.

### English (light)

- Minor clarity tweak: `microsoftCalendarReadiness.busyReadLead`, `candidateOfferReadiness.summaryLead`.

### Other locales (targeted)

- Fixed `{company}` placeholder drift in `recruiterMessageDrafts.invitationSubject` for es, it, fr, de, zh, ar, ja overlays.

## Not changed

- Keys, routes, enums, `data-testid`, API, auth, shell, gates, Phase 3B
- Product logic, resolvers, components
- Full es–ja premium copy rewrite (deferred — see recommendations)

## Tests added / extended

| Script | Change |
| ------ | ------ |
| `npm run test:i18n-native-copy-quality` | **New** — PL calque ban in critical domains, forbidden claims, placeholder parity, safety phrases |
| `npm run test:i18n-coverage` | + placeholder parity vs EN |
| `npm run test:trust-language-guard` | + additional forbidden claim patterns |

## Browser smoke

Skipped — no existing `test:i18n-native-copy-quality-browser` pattern or locale-switch Playwright spec. Static tests + build/tsc used instead.

## Remaining native-review recommendations

| Locale | Scope | Notes |
| ------ | ----- | ----- |
| `es`, `it`, `fr`, `de` | Recruiter/cockpit long-form copy | Functional overlays; not re-audited sentence-by-sentence |
| `zh`, `ar`, `ja` | Same | Placeholder fix only in message drafts |
| `pl` | Persona hub / talent pool / ATS import strings outside critical domains | Still contain loanwords (`live sync`, `outreach`) — next batch |

## Launch stance

- **Public launch:** NO-GO  
- **P0 performance:** OPEN  
- **Phase 3B:** HARD BLOCKED  

## Safety boundaries preserved

All locales retain: auto-apply PAUSED, delegated apply NOT LIVE, human recruiter decision, no guaranteed offer/salary/interview, no payment/revenue/employer-confirmation claims, preview/read-only boundaries on readiness surfaces.
