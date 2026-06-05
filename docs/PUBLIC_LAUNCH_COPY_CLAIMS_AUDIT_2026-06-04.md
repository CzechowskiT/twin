# Public launch copy & claims audit — 2026-06-04

**Auditor:** TWIN Remaining Launch Copy Risk Auditor (copy-only; no deploy/ops)  
**Branch:** `chore/s2-csp-burnin-readiness-2026-06-01`  
**Audit UTC:** `2026-06-04` (S2 burn-in through `2026-06-05T14:18:33Z`)  
**Product reality:** `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md`, `.cursorrules`

**Verdict:** **Public launch NO-GO** · **Pilot / demo GO** · Founding homepage **BLOCKER reduced** (`1a2eba4` + this session). **MEDIUM** calendar + compare risks **fixed** in i18n EN/PL. **No** S2 PASS or public GO from this audit.

---

## Executive summary

| Area | Finding |
| ---- | ------- |
| Homepage / founding CTAs | **was BLOCKER** → **LOW** — `1a2eba4` qualified hero/sticky/CTA; this session qualified `/first-1000` headline/subline/soldOut (no unconditional “Forever” / live apply) |
| Auto-apply / delegated | Dashboard + job list **OK**; billing lead and persona logistics **fixed** prior; compare + persona pillar copy **fixed** this session |
| Calendar (O5) | Google/Microsoft **live**; Apple = ICS/WebCal — `dashboard.billingEngagementPillar2Body` **fixed** (was `calendarAudienceLine` in prior audit) |
| Compare pages | `/compare/*` moved to `compare.*` i18n; phased/paused + calendar paths disclosed; shared disclaimer |
| GDPR / L6 | Export **live**; self-service delete **not live** — privacy MVP **OK** |
| KYC | Page exists; **not live** for delegated apply — readiness card **OK** |
| S2 / launch gates | Unchanged — **no** copy audit may mark S2 PASS or public GO |

**Fixes this session:** `billingEngagementPillar2Body` EN/PL; `compare.*` EN/PL + four compare routes; `first1000.headline`/`subline`/`soldOutBody` EN/PL; `persona-pages` candidate EN/PL pillars/tiers/logistics.  
**Remaining (severity):** legal/marketing sign-off on founding campaign tone (`first1000.footerLegal` still references campaign “free forever” with Terms pointer — **LOW**).

---

## Claims register

| Surface / file | Claim / copy | Risk | Current reality | Action | Severity |
| -------------- | ------------ | ---- | --------------- | ------ | -------- |
| `i18n` · `home.heroHook` | Founding early access + Terms | Was lifetime Pro lock | Founding cohort + Terms | **fixed** `1a2eba4` | **LOW** |
| `i18n` · `first1000.headline` | ~~“free. Forever”~~ → founding spots + benefits | Unconditional lifetime | Terms govern | **fixed** 2026-06-04 | **LOW** |
| `i18n` · `first1000.subline` | ~~“agent that applies”~~ → ranks/tracks/phased prepare | Live delegated apply | Prod **PAUSED** | **fixed** 2026-06-04 | **LOW** |
| `i18n` · `first1000.ctaLead` | Founding cohort; not lifetime paid Pro guarantee | Strong $0 tier | `footerLegal` | **fixed** `1a2eba4` | **LOW** |
| `i18n` · `billingPageLead` | Phased/paused autonomous apply | Live autopilot | **PAUSED** | **fixed** 2026-06-04 | **LOW** |
| `persona-pages` · logistics | Phased prepare-only until delegated | “Runs” today | **NOT LIVE** | **fixed** prior + PL 2026-06-04 | **LOW** |
| `i18n` · `billingEngagementPillar2Body` | ~~Apple/Google/Outlook same truth~~ → OAuth + ICS/WebCal paths | Apple OAuth parity | Apple **ICS/WebCal** only | **fixed** 2026-06-04 | **was MEDIUM** |
| `i18n` · `compare.*` + `/compare/*` | ~~Autonomous/live apply~~ → phased, prepare-only, disclaimer | Delegated **NOT LIVE** | Prod pause | **fixed** 2026-06-04 | **was MEDIUM** |
| `i18n` · `dashboard.autoApplyHint` / nightly strip | Delegated not live; paused | Accurate | Matrix F | **OK** | **LOW** |
| `i18n` · `calendarProviderAppleBody` | CalDAV roadmap | Accurate | No Apple OAuth | **OK** | **LOW** |
| `verified-readiness-guard.test.ts` | Forbids KYC verified / guaranteed interview | Guardrail | CI | **OK** | **LOW** |
| Marketing compare pages | Competitive claims | Overclaim | Spot-check | **fixed** 2026-06-04 | **LOW** |
| `docs/PUBLIC_LAUNCH_*` matrices | NO-GO / PAUSED / waivers | Accurate | This audit | **OK** | **LOW** |

---

## Surface notes

### Homepage & founding (`/`, `/first-1000`, `/waitlist`)

- **2026-06-04 (1a2eba4):** Hero, sticky, CTA band qualified.
- **2026-06-04 (this session):** `/first-1000` headline/subline no longer promise “Forever” free tier or live apply; soldOut copy aligned.

### Compare (`/compare/linkedin`, `agencies`, `moonhub`, `dover`)

- All copy in `compare.*` i18n EN/PL; shared `compare.disclaimer` on `ComparisonTwinPage`.
- No delegated-live, guaranteed interviews, KYC-live, or full Apple OAuth claims.

### Calendar (`/dashboard/calendar`, billing engagement)

- `billingEngagementPillar2Body` distinguishes Google/Microsoft OAuth vs Apple ICS/WebCal.

### Dashboard & auto-apply

- Unchanged accurate gated copy from prior audit.

---

## Copy fixes in this commit

| File | Change |
| ---- | ------ |
| `frontend/src/lib/i18n.ts` | `billingEngagementPillar2Body` EN/PL; `compare.*` EN/PL; `first1000` headline/subline/soldOut EN/PL |
| `frontend/src/app/(marketing)/compare/*/page.tsx` | Use `t("compare.*")` |
| `frontend/src/components/marketing/comparison-page.tsx` | `compare.disclaimer` footnote |
| `frontend/src/lib/persona-pages.ts` | Candidate EN/PL pillars, Premium bullet, PL logistics |

---

## Tests (session)

| Command | Result |
| ------- | ------ |
| `cd backend && pytest tests/test_csp_report.py tests/test_csp_report_sanitization.py -q` | **9 passed** |
| `cd frontend && npm run lint` | **ok** |
| `cd frontend && npx tsc --noEmit` | **ok** |
| `cd frontend && npm run build` | **ok** |

---

## Hard bans honoured

- No deploy · CSP enforce · env · migrations · prod DB · Railway restart  
- No scrape / apply / sweep · no S2 PASS · no public GO · no delegated-live claims  
- No secrets · no `.vercel` / `.env` in commit  

---

## Related

- `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md`
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md`
- `docs/AUTO_APPLY_DELEGATED_APPLY_SAFETY_AUDIT_2026-06-02.md`
- `docs/GDPR_MANUAL_DSR.md`
