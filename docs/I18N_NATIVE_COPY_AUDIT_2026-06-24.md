# Native product copy audit — 2026-06-24

**Branch (batch 1):** `fix/i18n-native-product-copy-2026-06-24` → merged PR #284 (`e9d01fa`)  
**Branch (batch 2):** `fix/i18n-persona-hub-recruiter-native-copy-2026-06-24` → merged PR #285 (`68bae7f`)  
**Branch (batch 3):** `fix/i18n-talent-radar-ats-demo-native-copy-2026-06-24` → merged PR #286 (`78e24ba`)  
**Branch (batch 4):** `fix/i18n-profile-pipeline-trust-native-copy-2026-06-24`  
**Branch (batch 5):** `fix/i18n-long-form-native-review-locale-qa-2026-06-24`  
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
| `frontend/src/lib/overlays/premium/profile-pipeline-trust-overlays.ts` | **Batch 4** es/it/fr/de/zh/ar profile 360, pipeline, trust center, export/identity/consent boundaries |
| `frontend/src/lib/overlays/premium/offer-readiness-placement-calendar-overlays.ts` | **Batch 5** es/it/fr/de/zh/ar offer readiness, placement verification, calendar busy-read, board monitors |
| `frontend/scripts/i18n-native-copy-quality.test.ts` | Native copy guard (+ batch 5 locale QA harness) |
| `frontend/e2e/i18n-native-copy-quality-browser.spec.ts` | **Batch 5** safe locale browser smoke |
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

### Batch 4 (profile 360 + pipeline + trust)
- Candidate Profile 360 (recruiter SOR view)
- Job-specific pipeline + stage board
- Collaboration scorecard / feedback copy
- Candidate trust layer + trust center + control center
- Export preview, identity verification, data portability, revoke/delete
- Trust audit export, consent receipt, trust overview index
- Premium overlays es/it/fr/de/zh/ar for page titles and trust boundaries

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

### Batch 4 — Polish (profile / pipeline / trust)

- Rewrote PL in `candidateProfile360`, `jobPipeline`, `candidateCollaboration`, `candidateTrust`, `candidateTrustCenter`, `candidateControlCenter`, `candidateExportPreview`, `candidateIdentityVerification`, `candidateDataPortability`, `candidateRevokeDelete`, `candidateTrustAuditExport`, `candidateConsentReceipt`, `candidateTrustOverview`.
- Replaced loanwords: `outreach` → `kontakt wychodzący`, `Profile 360` → `Profil 360`, `Talent Radar` → `Radar talentów`, `Talent Pool` → `pamięć talentów`, `scorecard` → `karta oceny`, `pipeline` (UI) → `lejek rekrutacyjny`, `verified readiness` → `gotowość zweryfikowana`, `system-of-record` → `rejestr operacyjny`.
- Preserved safety copy: auto-apply paused, human decision, no auto-outreach, preview-only export/consent/revoke/identity.

### Batch 4 — es / it / fr / de / zh / ar (targeted placeholders)

- New `profile-pipeline-trust-overlays.ts` with page titles and boundary copy for profile 360, job pipeline, trust center, export preview, identity verification.

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
| `npm run test:i18n-native-copy-quality` | + persona/recruiter domains in critical guard; + PL loanword test; + es/ja overlay smoke; **batch 3:** + talent radar/ATS/demo PL loanword guard; + it/fr/de/zh/ar overlay smoke; **batch 4:** + profile/pipeline/trust PL loanword guard; + es/it/fr/de/zh/ar overlay smoke |
| `npm run test:i18n-coverage` | (unchanged from batch 1) placeholder parity vs EN |
| `npm run test:trust-language-guard` | + recruiter cockpit / queue boundary copy assertions; **batch 3:** + talent radar / ATS / demo trust boundaries; **batch 4:** + profile / pipeline / trust boundary assertions |

## Browser smoke

**Batch 4:** Skipped — no dedicated browser spec.

**Batch 5:** Added `test:i18n-native-copy-quality-browser` — 1 worker, `localStorage` locale via `twin_locale`, public routes only (`/` × pl/es/de). `/dashboard/trust` and recruiter pipeline require auth shell — excluded from browser spec; static overlay tests cover those domains. `p0-all-persona-navigation-browser` not modified.

## Batch 5 — long-form non-English native review and locale QA harness

### Languages reviewed

`en`, `pl`, `es`, `it`, `fr`, `de`, `zh`, `ar`, `ja` — long-form overlays in `overlays/premium/*`, `overlays/investor-room.ts`, `overlays/premium/investor-data-room-overlays.ts`; EN/PL base in `i18n.ts`.

### Audit findings (rg-style)

| Pattern | Risk | Batch 5 action |
| ------- | ---- | -------------- |
| `shortlist`, `Outbound`, `writeback`, `live sync`, `cold email` in it/fr/de overlays | English leakage in long-form boundaries | Rewritten to native phrasing (lista ristretta, ausgehender Kontakt, Zurückschreiben, etc.) |
| `persona-hub-recruiter` only es/ja | it/fr/de/zh/ar fell back to EN titles | Full overlay slice added for it/fr/de/zh/ar |
| Offer/placement/calendar domains EN-only for es–ar | Long-form readiness copy untranslated | New `offer-readiness-placement-calendar-overlays.ts` |
| `investor-room` placement verification EN in all locales | Board/investor slice untranslated | Per-locale `statusItem_placementVerification_*` |
| `investor-data-room` lead/transparency EN | Investor data room mostly EN | Key transparency/public/live section headers translated es–ar |
| Forbidden claims (`launch ready`, `gdpr compliant`, etc.) | Product safety | None found positive; guards extended |
| ja offer/placement/calendar | Partial EN fallback | Deferred full ja slice; persona/talent-radar ja unchanged |

### Strings improved (representative)

- **es/it/fr/de/zh/ar:** profile-pipeline-trust boundary bodies + export/identity boundaries; talent-radar ATS/demo outbound/sync phrasing; persona-hub-recruiter full cockpit/queue copy; offer-readiness center titles/leads/boundary notes; placement verification panel titles; microsoft busy-read no-invite/no-sync; calendar readiness boundaries; board offer/placement monitor titles.
- **es:** ATS import `boundaryBody` + lead (was badge-only).
- **investor-room:** placement verification status item per locale.
- **investor-data-room:** transparency + public docs + live surfaces headers es–ar.

### Languages needing native-speaker validation

| Locale | Scope | Notes |
| ------ | ----- | ----- |
| `ja` | Offer/placement/calendar long-form | Partial EN fallback remains outside persona/talent-radar slices |
| `es`–`ar` | Investor room long-form body | Only placement verification + data-room headers; thesis/roadmap still EN |
| `de` | Pipeline loanword “Pipeline” in product UI | Accepted as HR standard; boundaries native |

### Copy areas intentionally not changed

- EN source strings (except investor-room placement lines were locale overlays only).
- PL base dictionary (batch 1–4 already polished).
- Product logic, routes, components, auth/shell/gates, Phase 3B.
- Full `investor-room` long-form rewrite (deferred).
- Generated premium tree files (`generated/*.ts`).

### Safety boundary status

Preserved across all improved locales: auto-apply PAUSED, no auto-outreach, read-only/preview-only, no invite/sync/write claims, no guaranteed offer/salary, no payment/revenue recognition, human review required.

### Tests added / extended (batch 5)

| Script | Change |
| ------ | ------ |
| `npm run test:i18n-native-copy-quality` | 19 tests: premium placeholder parity, boundary copy per locale, untranslated-English scan on translated overlay paths, offer/placement/calendar title smoke, it/fr/de/zh/ar persona hub smoke |
| `npm run test:i18n-native-copy-quality-browser` | New: pl/es/de homepage locale via `twin_locale`, no raw `{company}`/`{candidate}` placeholders |

## Remaining native-review recommendations

| Locale | Scope | Notes |
| ------ | ----- | ----- |
| `es`, `it`, `fr`, `de` | Persona hub / recruiter long-form | Batch 2 placeholders es/ja only; batch 3 adds talent radar slice for it/fr/de/zh/ar |
| `pl` | Profile 360 / pipeline / trust demo strings outside batch 3 | Addressed in batch 4 |
| `pl` | `recruiterDailyOperatingCockpit` (legacy route) | Not in batch 2–4 scope |

## Launch stance

- **Public launch:** NO-GO  
- **P0 performance:** OPEN  
- **Phase 3B:** HARD BLOCKED  

## Safety boundaries preserved

All locales retain: auto-apply PAUSED, delegated apply NOT LIVE, human recruiter decision, no guaranteed offer/salary/interview, no payment/revenue/employer-confirmation claims, preview/read-only boundaries on readiness surfaces.
