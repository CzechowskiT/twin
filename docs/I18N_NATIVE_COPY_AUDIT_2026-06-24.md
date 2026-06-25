# Native product copy audit — 2026-06-24

**Branch (batch 1):** `fix/i18n-native-product-copy-2026-06-24` → merged PR #284 (`e9d01fa`)  
**Branch (batch 2):** `fix/i18n-persona-hub-recruiter-native-copy-2026-06-24` → merged PR #285 (`68bae7f`)  
**Branch (batch 3):** `fix/i18n-talent-radar-ats-demo-native-copy-2026-06-24`  
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
| `frontend/src/lib/overlays/premium/persona-hub-recruiter-overlays.ts` | **Batch 2** es/ja persona hub + recruiter cockpit placeholders |
| `frontend/src/lib/overlays/premium/talent-radar-ats-demo-overlays.ts` | **Batch 3** it/fr/de/zh/ar/es/ja talent radar, ATS import, demo journey, board proof |
| `frontend/scripts/i18n-native-copy-quality.test.ts` | Native copy guard |
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
| `outreach` / `outreachu` | HR anglicism in PL UI | → `kontakt wychodzący` |
| `live sync` / `writeback` | Untranslated stack terms | → `bieżąca synchronizacja` / `zapis zwrotny do ATS` |
| `outbound nie live` | Mixed EN/PL badge | → `wysyłka wychodząca nieaktywna` |

## High-risk product areas audited

### Batch 1 (merged #284)
- Placement verification evidence
- Offer readiness center (candidate + recruiter/company preview + board)
- Calendar readiness + Microsoft busy-read readiness
- Scheduling decision context
- Board offer/placement monitors
- Dashboard automation transparency (PL/EN safety copy preserved)
- Recruiter inbox trust copy (unchanged keys; already natural PL)

### Batch 2 (persona hub + recruiter)
- Workspace persona hub cards (recruiter/company SOR entry)
- Company talent memory (`companyTalentPool`)
- Recruiter trust review queue
- Recruiter operational work queue
- Recruiter daily operating cockpit
- Premium overlays es/ja placeholders for above domains

### Batch 3 (talent radar + ATS import + demo)
- Recruiter Talent Radar + weekly digest
- ATS import readiness workspace
- Founder-led demo journey
- Executive / board product proof links and boundaries
- Premium overlays it/fr/de/zh/ar (+ es/ja badges) for above domains

## Changes made

### Batch 1 — Polish (heavy)

- Rewrote `placementVerificationEvidence`, `microsoftCalendarReadiness`, `microsoftBusyRead`, `calendarReadinessEvidence`, `candidateOfferReadiness`, `offerReadinessEvidence`, `schedulingDecisionContext`, `offerReadinessPreview`, `boardOfferReadiness`, `boardPlacementEvidence` in `i18n.ts`.
- Global PL pass: `przegląd człowieka` → `ręczna weryfikacja` (11+ keys), `powierzchnie operacyjne` → `ekrany operacyjne`.

### Batch 2 — Polish (persona / recruiter)

- Rewrote PL in `workspace` hub hints, `systemOfRecord` boundaries, `companyTalentPool`, `recruiterTrustReviewQueue`, `recruiterOperationalWorkQueue`, `recruiterDailyCockpit`.
- Replaced loanwords: `live sync` → `bieżąca synchronizacja`, `outreach` → `kontakt wychodzący`, `writeback` → `zapis zwrotny do ATS`, `outbound nie live` → `wysyłka wychodząca nieaktywna`.
- Normalized labels: `talent pool` → `pamięć talentów`, `Daily cockpit` → `Kokpit dzienny`, `trust review` → `przegląd zaufania`.

### Batch 2 — es / ja (targeted placeholders)

- New `persona-hub-recruiter-overlays.ts` with page titles, leads, boundary copy for talent memory, trust review queue, work queue, daily cockpit.

### Batch 3 — Polish (talent radar / ATS / demo)

- Rewrote PL in `recruiterTalentRadar`, `recruiterTalentRadarDigest`, `atsImportReadiness`, `founderLedDemo`, `executiveProductProof`.
- Replaced loanwords: `outreach` → `kontakt wychodzący`, `live sync` → `bieżąca synchronizacja`, `writeback` → `zapis zwrotny do ATS`, `przegląd człowieka` → `ręczna weryfikacja`, `board` → `zarząd` where user-facing.
- Normalized labels: `Talent Pool` → `pamięć talentów`, `Talent Radar` → `Radar talentów` in demo journey.

### Batch 3 — it / fr / de / zh / ar (targeted placeholders)

- New `talent-radar-ats-demo-overlays.ts` with titles, disclaimers, ATS import boundaries, demo journey steps, executive proof links.

### English (light)

- Batch 1: minor clarity tweak on busy-read lead.
- Batch 2: EN unchanged (source strings already natural).

### Other locales (targeted)

- Batch 1: Fixed `{company}` placeholder drift in `recruiterMessageDrafts.invitationSubject` for es–ja overlays.
- Batch 2: es/ja persona-hub-recruiter overlay slice only; it/fr/de/zh/ar — deferred full native-review.

## Not changed

- Keys, routes, enums, `data-testid`, API, auth, shell, gates, Phase 3B
- Product logic, resolvers, components
- Full es–ja premium copy rewrite outside persona/recruiter slice (deferred)

## Tests added / extended

| Script | Change |
| ------ | ------ |
| `npm run test:i18n-native-copy-quality` | + persona/recruiter domains in critical guard; + PL loanword test; + es/ja overlay smoke; **batch 3:** + talent radar/ATS/demo PL loanword guard; + it/fr/de/zh/ar overlay smoke |
| `npm run test:i18n-coverage` | (unchanged from batch 1) placeholder parity vs EN |
| `npm run test:trust-language-guard` | + recruiter cockpit / queue boundary copy assertions; **batch 3:** + talent radar / ATS / demo trust boundaries |

## Browser smoke

Skipped — no existing `test:i18n-native-copy-quality-browser` pattern or locale-switch Playwright spec. Static tests + build/tsc used instead.

## Remaining native-review recommendations

| Locale | Scope | Notes |
| ------ | ----- | ----- |
| `es`, `it`, `fr`, `de` | Persona hub / recruiter long-form | Batch 2 placeholders es/ja only; batch 3 adds talent radar slice for it/fr/de/zh/ar |
| `pl` | Profile 360 / pipeline / trust demo strings outside batch 3 | Still contain some loanwords outside audited domains |
| `pl` | `recruiterDailyOperatingCockpit` (legacy route) | Not in batch 2–3 scope |

## Launch stance

- **Public launch:** NO-GO  
- **P0 performance:** OPEN  
- **Phase 3B:** HARD BLOCKED  

## Safety boundaries preserved

All locales retain: auto-apply PAUSED, delegated apply NOT LIVE, human recruiter decision, no guaranteed offer/salary/interview, no payment/revenue/employer-confirmation claims, preview/read-only boundaries on readiness surfaces.
