# Public launch copy & claims audit — 2026-06-04

**Auditor:** TWIN Public Launch Copy & Claims Auditor (read-only ops; copy-only fixes allowed)  
**Branch:** `chore/s2-csp-burnin-readiness-2026-06-01`  
**Audit UTC:** `2026-06-04` (S2 burn-in through `2026-06-05T14:18:33Z`)  
**Product reality:** `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md`, `.cursorrules`

**Verdict:** **Public launch NO-GO** · **Pilot / demo GO** · Copy has **3 BLOCKER-class marketing rows** (lifetime founding, implied live autopilot) plus **documented waivers** for L6/O5. Dashboard and verified-readiness surfaces are **mostly aligned** with paused auto-apply and blocked delegated submit.

---

## Executive summary

| Area | Finding |
| ---- | ------- |
| Homepage / founding CTAs | **BLOCKER** — “lifetime Pro” / lock language without same-page Terms tie-in as `/first-1000` fine print |
| Auto-apply / delegated | Dashboard + job list **OK**; billing lead and persona logistics **overclaimed** → **fixed** in this session (LOW) |
| Calendar (O5) | Google/Microsoft **live**; Apple = ICS/WebCal + CalDAV roadmap — copy mostly **discloses**; one calendar strip line is **MEDIUM** |
| GDPR / L6 | Export **live**; self-service delete **not live** — privacy MVP page **discloses**; no “delete account” button |
| KYC | Page exists; **not live** for delegated apply — readiness card **OK** |
| S2 / launch gates | Unchanged — **no** copy audit may mark S2 PASS or public GO |

**Fixes shipped (copy-only):** `billingPageLead` (EN/PL), `persona-pages.ts` logistics (EN).  
**Documented, not edited (severity):** homepage lifetime strings, `first-1000` “zero fees forever”, vacation storyboard autopilot tone.

---

## Claims register

| Surface / file | Claim / copy | Risk | Current reality | Action | Severity |
| -------------- | ------------ | ---- | --------------- | ------ | -------- |
| `frontend/src/lib/i18n.ts` · `home.heroHook` | “Founding wishlist locks **lifetime Pro** for the first 1,000” | Implies guaranteed lifetime paid tier | Founding = wishlist cap + campaign; Terms govern; not lifetime $0 unless in signed Terms (`waitlist-narrative` disclaims) | **revise** — soften to “founding early access” + link Terms | **BLOCKER** (public launch) |
| `i18n` · `home.stickyCtaMicro` | “**Lifetime Pro** · email only” | Same | Same | **revise** | **BLOCKER** |
| `i18n` · `home.joinWishlistMicro` | “lifetime Pro & **Enterprise** · no card” | Same + enterprise SKU | Stripe/recruiter SKUs separate; founding ≠ Enterprise contract | **revise** | **HIGH** |
| `i18n` · `home.ctaBandWishlistTitle` | “**Lock lifetime** Pro & Enterprise” | Urgency + lifetime | Same | **revise** | **BLOCKER** |
| `i18n` · `home.insideTitle` | “Your pipeline works **while you sleep**” | Implies nightly auto-apply live | Nightly beat **OFF** on prod; autonomous paths **gated/paused** | **disclose** — “when automation is enabled” or storyboard qualifier | **MEDIUM** |
| `i18n` · `home.vacationScene*` | Sarah offline; TWIN queues interviews | Storyboard autopilot | Demo narrative; disclaimer on scene 3 **OK** | **OK** (with disclaimer) | **LOW** |
| `i18n` · `home.howStep4Line` / `feature6Line` | Auto-apply rolls out in **phases** | Accurate if read literally | Prod **PAUSED** | **OK** | **LOW** |
| `i18n` · `first1000.ctaLead` | “**zero fees forever** if you land under the cap” | Strong lifetime $0 | `first1000.footerLegal` mitigates on same page | **revise** on homepage parity or **disclose** inline | **HIGH** |
| `frontend/src/lib/waitlist-messages.ts` + `waitlist-narrative.ts` | Founding 1,000, auto-apply FAQ, fair-use | Mostly conservative | Matches pilot stance; lifetime FAQ **disclaims** | **OK** | **LOW** |
| `i18n` · `billingPageLead` (was) | “**Auto-apply runs on every plan by default**” | States live autopilot | Prod **PAUSED**; prepare package only; delegated **NOT LIVE** | **revise** — **fixed** 2026-06-04 | **HIGH** |
| `frontend/src/lib/persona-pages.ts` · logistics | “**Autonomous applying runs** on supported boards with Premium or Pro” | Live autonomous apply | **NOT LIVE** / nightly **OFF** | **revise** — **fixed** 2026-06-04 | **HIGH** |
| `i18n` · `dashboard.autoApplyHint` | Does not submit until delegated enabled | Accurate | Server 403 + `delegated_apply_allowed=false` | **OK** | **LOW** |
| `i18n` · `dashboard.nightlyAutoApplyLead` | Delegated apply **not live in production** | Accurate | Matches matrix F | **OK** | **LOW** |
| `i18n` · `dashboard.nightlyAutoApplyStripLegacyActive` | Consent on file; runs **paused** | Accurate | Ops pause + readiness gate | **OK** | **LOW** |
| `i18n` · `verifiedReadiness.*` | Delegated blocked; not legal KYC | Accurate | S11 smoke; no live KYC apply | **OK** | **LOW** |
| `frontend/src/app/dashboard/identity/page.tsx` | KYC / Authologic flow | User may think KYC unlocks apply | Identity optional; **not** delegated apply | **OK** if i18n stays non-promissory | **MEDIUM** |
| `i18n` · `calendarStripWebcalHint` | WebCal + Google subscribe | Accurate for ICS path | O5 partial **OK** with WebCal | **OK** | **LOW** |
| `i18n` · `calendarProviderAppleBody` | CalDAV / roadmap; not one-click Google | Accurate | No Apple OAuth | **OK** | **LOW** |
| `i18n` · `calendarAudienceLine` (≈751) | “**Apple, Google, and Outlook** see the same truth” | Full Apple OAuth | Apple via **ICS/WebCal** only | **revise** — “subscribe via ICS/WebCal” | **MEDIUM** |
| `i18n` · `privacy.rightsBody` | Deletion via contact; account delete **coming** | Accurate | L6 manual DSR + waiver | **OK** | **LOW** |
| `frontend/public/legal/privacy-*.md` | Erasure rights; delete when no longer needed | Legal generality | No self-service API | **OK** (operator runbook) | **LOW** |
| `i18n` · `demo.*` | Synthetic / no live submissions | Accurate | Demo lane | **OK** | **LOW** |
| `job-employer-partners-messages.ts` | “Integration **marketplace** (demo statuses)” | Could imply live marketplace | Demo-only ATS copy | **OK** | **LOW** |
| `verified-readiness-guard.test.ts` | Forbids KYC verified / guaranteed interview in card | Guardrail | CI static test | **OK** | **LOW** |
| Marketing compare pages | Competitive claims | Varies | Spot-check before press | **disclose** per page | **MEDIUM** |
| `docs/PUBLIC_LAUNCH_*` matrices | NO-GO / PAUSED / waivers | Accurate | This audit | **OK** | **LOW** |

---

## Surface notes

### Homepage & founding (`/`, `/first-1000`, `/waitlist`)

- **Strengths:** Phased autopilot language (`howStep4`, `feature6`, `focusFootnote`); vacation disclaimer.
- **Gaps:** Hero and sticky CTAs use **lifetime Pro** without the `first1000.footerLegal` / `waitlist-narrative` disclaimer on the same viewport — **public launch BLOCKER** until legal/marketing align strings with Terms.

### Dashboard & auto-apply (`/dashboard`, `/dashboard/settings/auto-apply`)

- Prepare-application CTA gated; copy states delegated **not live**.
- Nightly settings UI exists; prod beat **disabled** — strip copy reflects pause.

### Calendar (`/dashboard/calendar`)

- Google + Microsoft OAuth **live**; WebCal/ICS **partial** (O5 waiver).
- Avoid “Sign in with Apple Calendar” parity claims; current Apple body is **roadmap-safe**.

### Privacy / DSR (`/privacy`, export in dashboard)

- Export **live**; erasure **manual** (`docs/GDPR_MANUAL_DSR.md`) — MVP privacy page states delete feature **coming**.

### Demo (`/demo`)

- Labeled synthetic; aligned with pilot/demo **GO**.

---

## Copy fixes in this commit

| File | Change |
| ---- | ------ |
| `frontend/src/lib/i18n.ts` | `billingPageLead` EN + PL — auto-apply **phased/paused on production**; prepare-only default |
| `frontend/src/lib/persona-pages.ts` | EN logistics — autonomous apply **phased**, not “runs” today |

---

## Tests (session)

| Command | Result |
| ------- | ------ |
| `cd backend && pytest tests/test_csp_report.py tests/test_csp_report_sanitization.py -q` | **9 passed** |
| `cd frontend && npm run lint` | **ok** |
| `cd frontend && npx tsc --noEmit` | **ok** (via `next build` TS step) |
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
