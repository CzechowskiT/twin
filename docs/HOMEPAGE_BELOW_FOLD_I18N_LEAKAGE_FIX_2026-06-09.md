# Homepage below-the-fold i18n leakage fix — 2026-06-09

**Branch:** `fix/homepage-below-fold-i18n-leakage-2026-06-09`  
**Owner:** TWIN Homepage Below-the-Fold i18n Leakage Fix Owner  
**Launch stance:** Public **NO-GO** preserved · auto-apply **PAUSED** · delegated **NOT LIVE**

## Problem

Founder QA on Spanish homepage (`/`) showed English below the hero:

- Live counter: `652+ roles scanned on enabled boards`
- Rewards band eyebrow: `EARN ON OUTCOMES`
- Outcome table headers: `TRIGGER` / `REWARD` / `WHEN PAID`
- Social proof quote and FAQ teaser still EN for es–ja

Root cause: `MARKETING_HOME_OVERLAYS` covered hero/inside/CTAs/stats labels but **not** `candidateRewards.*`, `home.liveCounter`, `home.socialProof*`, or homepage FAQ teaser keys (`faq.homeTeaserLead`, section labels, general Q&A). Non-EN/PL locales fell back to `CANDIDATE_REWARDS_MESSAGES_EN` and EN `home.*` / `faq.*`.

## Fix

### New overlay module

`frontend/src/lib/overlays/marketing-home-below-fold.ts` — merged into each locale via `withBelowFold()` in `marketing-home.ts`:

| Surface | Keys | Locales |
| ------- | ---- | ------- |
| Live counter + social proof | `home.liveCounter`, `socialProofJoin`, `socialProofQuote` | es, de, fr, it, zh, ja, ar |
| Stats rail | `home.statJobs` … `statBoards`, `statsAria` | all partial locales (it/zh/ja/ar + fr gaps) |
| Rewards band | full `candidateRewards.*` (eyebrow, table cols, rows, CTAs, disclaimer) | es–ar |
| FAQ teaser | `faq.homeTeaserLead`, `homeCta`, sections, `general01–03` Q/A | es–ar |
| Bento / how / features | `scrape`/`match`/`track`, `howStep*`, `feature1–5` | it, zh, ja, ar |

**ES examples:** `Gana por resultados`, `Disparador`, `{count}+ roles escaneados en portales activados`  
**DE examples:** `Verdiene an Ergebnissen`, `Belohnung`, `{count}+ Rollen auf aktivierten Börsen gescannt`

### Guards strengthened

`frontend/scripts/i18n-rendered-surfaces.ts`:

- Extended `RENDERED_HOME_KEYS` with below-fold home fields
- Added `RENDERED_REWARDS_KEYS` and `RENDERED_FAQ_KEYS`
- Forbidden EN tokens: `Earn on outcomes`, `roles scanned`, `Trigger`, `When paid`, social proof quote, `Validated jobs`, `Questions & answers`

`test:i18n-rendered-homepage-guard` — positive ES/DE assertions for `liveCounter`, `candidateRewards.eyebrow`, `colTrigger`, `colReward`.

### OG unchanged

`/waitlist/opengraph-image` still uses minimal `WAITLIST_OG_COPY` (en/pl only). `og-bundle-guard` updated to assert `WAITLIST_OG_COPY`, not full `WAITLIST_MESSAGES`.

## Tests (all pass)

`i18n-rendered-homepage-guard`, `i18n-visual-copy-guard`, `og-bundle-guard`, `i18n-coverage`, `i18n-premium-product`, `trust-language-guard`, `homepage-nav`, `auth-role-choice`, `interactive-demo`, `lint`, `tsc`, `build`.

## Founder smoke (post-deploy)

- `/` in **ES** — scroll past hero: counter in Spanish, rewards band fully localized, stats labels ES, FAQ teaser ES
- `/` in **DE** — same below-fold checks in German
- `/` in **FR/IT/ZH/JA/AR** — rewards table headers not EN; no `Earn on outcomes` / `Trigger` / `When paid`

## Related docs

- `docs/RENDERED_LOCALE_LEAKAGE_HARDENING_2026-06-09.md`
- `docs/I18N.md`
- `docs/I18N_FULL_TRANSLATION_COVERAGE_2026-06-08.md`
