# Public launch readiness matrix — 2026-06-02

**Auditor:** TWIN Public Launch Readiness Auditor (read-only session)  
**Branch:** `chore/s2-csp-burnin-readiness-2026-06-01`  
**Branch HEAD:** `c67f0c8` (`docs(security): record S2 CSP burn-in manual checkpoint`)  
**Audit UTC:** `2026-06-02` (session after burn-in restart `2026-06-02T14:18:33Z`)  
**Production (unchanged by this audit):** FE `https://twin-sooty.vercel.app` · API `https://twin-production-bcd9.up.railway.app`

**Verdict:** **Public launch NO-GO** · **Pilot / investor demo GO** · **S2 NOT READY** · **Auto-apply PAUSED** (operational + product gates)

---

## A — Security / CSP

| Check | Evidence | Status |
| ----- | -------- | ------ |
| S1 CSP report-only + `report-uri` wired | 8-route `curl -sI` 2026-06-02 — all HTTP 200, `content-security-policy-report-only` present, `report-uri /api/v1/csp-report` | ✅ PASS |
| CSP enforce header absent | No `content-security-policy:` (enforce) on `/`, `/dashboard`, `/login/candidate`, `/register/candidate`, `/demo`, `/status`, `/dashboard/calendar`, `/api/public-health` | ✅ (expected) |
| Narrowed policy on prod | Explicit `connect-src` includes `https://twin-production-bcd9.up.railway.app`; no broad `https:` wildcards | ✅ LIVE |
| S2 72h burn-in | Window `2026-06-02T14:18:33Z` → `2026-06-05T14:18:33Z`; prior window RESET after `connect-src` gap — `docs/S2_CSP_BURNIN_WINDOW_2026-06-01.md` | ❌ **NOT READY** — IN PROGRESS |
| S2 violation triage pack | Railway log rollup for full 72h + DevTools multi-browser checklist + founder sign-off | ❌ MISSING |
| S3–S4, S6–S10c mutation/upload limits | Gate checklist + repo tests | ✅ shipped (code) |
| S5 Stripe dedup `050` | Founder read-only SQL 2026-05-29 | ✅ PASS |
| S8–S9 secrets / deps baseline | Re-run before launch per checklist | ⚠️ re-verify |
| S11 verified-readiness API | `pytest tests/test_candidate_verified_readiness_gate.py` — **11 passed** local; founder prod smoke 2026-05-29 | ✅ PASS |
| Backend CSP sink tests | `pytest tests/test_csp_report*.py` — **9 passed** | ✅ PASS |
| Frontend security-headers guard | `npm run test:security-headers` — ok | ✅ PASS |

**S2 blocker:** Do **not** flip enforce until `2026-06-05T14:18:33Z` evidence review + founder sign-off (`docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md`).

---

## B — Database

| Check | Evidence | Status |
| ----- | -------- | ------ |
| Prod `db_ok` | `GET /api/public-health` → `db_ok: true` | ✅ LIVE |
| INC-DB-2026-05-29-001 | `docs/PRODUCTION_DB_RESTORE_INCIDENT_2026-05-29.md` — RESOLVED | ✅ STABLE |
| O7 backup/restore drill | Staging clone `staging-restore-proof-20260529` 2026-06-01 — `docs/BACKUP_RESTORE_DRILL_LOG.md` | ✅ PASS |
| Agent DB mutation this session | None | ✅ honoured |

---

## C — Auth

| Check | Evidence | Status |
| ----- | -------- | ------ |
| Candidate OAuth (Google/GitHub) | Public-health flags; login routes 200 | ✅ LIVE |
| Apple OAuth | Documented OFF | ⚠️ by design |
| OAuth callback rate limits | S10 gate — code shipped | ✅ LIVE |
| Layer-2 LLM mutation limits | S3 gate | ✅ LIVE |
| httpOnly auth rollout | `P2_HTTPONLY_AUTH_ROLLOUT_PLAN` — design only | 📐 future |

---

## D — Calendar

| Check | Evidence | Status |
| ----- | -------- | ------ |
| Google Calendar FULL prod smoke | `docs/GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md` — OAuth, events, `Europe/Warsaw` week mapping | ✅ PASS |
| Microsoft Graph | `microsoft_calendar_configured` on health surface | ✅ LIVE |
| Apple / CalDAV / ICS | Docs + partial patterns per `.cursorrules` | ⚠️ PARTIAL |
| O5 gate row | Partial until Apple/iCal beyond docs | ⚠️ partial |

---

## E — Billing

| Check | Evidence | Status |
| ----- | -------- | ------ |
| Stripe Checkout | `stripe_checkout_ready: true` (public-health 2026-06-02) | ✅ LIVE |
| Webhook signature + dedup | S5 PASS; ledger migration `050` on prod | ✅ LIVE |
| Stripe webhook reachability | O4 audit doc | ✅ |

---

## F — Auto-apply

| Check | Evidence | Status |
| ----- | -------- | ------ |
| **Safety audit** | `docs/AUTO_APPLY_DELEGATED_APPLY_SAFETY_AUDIT_2026-06-02.md` (read-only 2026-06-02) | ✅ documented |
| **Operational stance** | Public launch audit policy — no agent-triggered live apply, no sweep, no scrape ops | **PAUSED** |
| Delegated submit | `delegated_apply_allowed=false`, `can_submit_delegated_application=false` in `candidate_readiness.py` | **NOT LIVE** |
| Autonomous apply gate | `autonomous_apply_policy.enforce_autonomous_apply_allowed()` on per-job + consent paths | ✅ **CLOSED** (GAP-01) |
| Ops trigger-sweep | `POST /auto-apply/trigger-sweep` — ops allowlist | ✅ ops-only |
| Per-user `POST /auto-apply/trigger` | **Ops allowlist only**; no candidate UI | ✅ **CLOSED** (GAP-02) |
| Nightly beat env (GAP-03) | Doc: `NIGHTLY_AUTO_APPLY_BEAT_ENABLED=false` on prod for full **PAUSED** | ⚠️ founder env |
| `AUTO_APPLY_SUBMIT` (GAP-04) | Doc: `false` on prod for prepare-only pilot | ⚠️ founder env |
| UI safety | `test:dashboard-ux-safety` + `test:verified-readiness-guard` — 2026-06-02 PASS | ✅ PASS |
| S6 sweep tests | `test_auto_apply_trigger_sweep_admin_gate.py` + autonomous readiness — 47 passed bundle | ✅ PASS |
| Nightly beat infra | Celery schedule exists; founder may disable beat for full **PAUSED** (GAP-03) | ⚠️ infra LIVE; **policy PAUSED** |

**Repo grep (read-only):** No audit session calls to `trigger-sweep`, `nightly_auto_apply_sweep`, or live `auto_apply_for_user` on prod.

---

## G — Legal / privacy

| Check | Evidence | Status |
| ----- | -------- | ------ |
| L1 GDPR signup consent | Register flow + API | ✅ |
| L2 Cookie consent PL/EN | `docs/COOKIE_CONSENT.md` | ✅ |
| L3 Privacy / Terms | `/privacy`, `/terms` HTTP 200 (2026-06-02 curl) | ✅ |
| L4 Scraping compliance | `docs/SCRAPING_COMPLIANCE.md` | ✅ |
| L5 Auto-apply consent model | DB + API tests | ✅ |
| L6 DSR export/delete | Partial — manual workflow option per checklist | ⚠️ partial |
| L7 Placement verification | `docs/PLACEMENT_VERIFICATION.md` | ✅ design |
| Legal claims in this doc | Only pointers to existing legal docs | ✅ honoured |

---

## H — UX / founder smoke

| Check | Evidence | Status |
| ----- | -------- | ------ |
| P6 founder authenticated smoke | 8/8 routes + safety copy 2026-05-29 | ✅ PASS |
| Dashboard layout / forecast | Founder-confirmed post-fix | ✅ PASS |
| Verified-readiness card | S11 prod smoke | ✅ PASS |
| No delegated/KYC live copy | Founder evidence doc | ✅ PASS |
| Frontend guards | `test:verified-readiness-guard`, `test:dashboard-ux-safety` | ✅ PASS |
| `eslint` / `tsc` / `build` | Local 2026-06-02 — all green | ✅ PASS |

---

## I — Observability

| Check | Evidence | Status |
| ----- | -------- | ------ |
| Public health proxy | `status=ok`, `git_commit=6382a91…` (post-merge PR #21), `db_ok=true` | ✅ LIVE |
| API health | `GET /api/v1/health?ops=1` → `status=ok`, `scrape_worker_ready=true` | ✅ LIVE |
| CSP report sink | Storage-free `POST /api/v1/csp-report`; tests pass | ✅ LIVE |
| S7 public-health regression | `pytest tests/test_public_health_regression.py` — passed in bundle | ✅ PASS |
| O8 incident runbook | Doc exists | ✅ |
| O9 risk register | Doc exists | ✅ |
| P1 observability plan | Full log pipeline for CSP burn-in still founder-led | ⚠️ S2 dependency |

---

## J — Data quality

| Check | Evidence | Status |
| ----- | -------- | ------ |
| Validated jobs | `652` (public-health 2026-06-02) | ✅ LIVE |
| Market coverage active validated | `2579` | ✅ LIVE (below long-term target per matrix) |
| Matching quality gate | `docs/MATCHING_QUALITY_GATE.md` | ✅ REPO |
| Scrape ops | Infra ready; **BLOCKED** without allowlist for ops sweep | ⚠️ policy |

---

## K — SEO / public surfaces

| Check | Evidence | Status |
| ----- | -------- | ------ |
| `/robots.txt` | HTTP 200 | ✅ |
| `/sitemap.xml` | HTTP 200 | ✅ |
| Marketing `/` | HTTP 200 + CSP-RO | ✅ |
| `/status` | HTTP 200 | ✅ |
| Playwright smoke (historical) | 13/14 prod lane per matrix — cookie-banner locator fix on branch | ⚠️ monitor |

---

## L — Final decision

| Audience | Verdict | Rationale |
| -------- | ------- | --------- |
| **Public launch** (LinkedIn / PressOn / uncontrolled signup) | **NO-GO** | **S2** 72h burn-in incomplete (`NOT READY` until `2026-06-05T14:18:33Z` review); enforce off |
| **Controlled pilot** | **GO** | Prod health green; P1 manual + tracker; per-account watch |
| **Investor / CTO demo** | **GO** | Curated dataset; same stack |
| **Auto-apply / delegated apply** | **PAUSED / NOT LIVE** | Product gates + audit hard ban; no mass autonomous apply for launch |

### Primary blockers (ordered)

1. **S2** — Complete 72h CSP report-only burn-in (`2026-06-02T14:18:33Z` → `2026-06-05T14:18:33Z`); Railway triage + DevTools pack; founder enforce sign-off.
2. **O5 partial** — Apple/iCal beyond documentation (non-blocking for pilot).
3. **L6 partial** — DSR export/delete manual workflow if launching before full automation.

### Risks (accepted for pilot, not public)

- CSP `unsafe-inline` / `unsafe-eval` remain (separate hardening track).
- Prod API SHA `6382a91` includes auto-apply safety fix `e764e68` (post-merge 2026-06-02); nightly beat still **enabled** in health — **PAUSED** is policy/env (GAP-03).
- Metric / corpus scale below “marketplace” narrative — honest pilot ceiling.

---

## Production curl snapshot (sanitized, 2026-06-02)

**`GET /api/public-health` (via FE):**

```json
{
  "status": "ok",
  "db_ok": true,
  "validated_jobs": 652,
  "market_coverage_active_validated": 2579,
  "stripe_checkout_ready": true,
  "git_commit": "6382a9188826..."
}
```

**Post-merge sanity:** `docs/POST_MERGE_AUTO_APPLY_SANITY_2026-06-02.md`

**Headers (all 8 audited routes):** HTTP 200 · CSP-RO yes · CSP enforce **no** · HSTS yes · `X-Frame-Options: DENY` · `report-uri` present · narrowed `connect-src` includes Railway API host.

---

## Safe tests run (local, 2026-06-02)

| Command | Result |
| ------- | ------ |
| `pytest tests/test_csp_report*.py tests/test_candidate_verified_readiness_gate.py tests/test_public_health_regression.py -q` | **29 passed** |
| `npm run test:security-headers` | ok |
| `npm run test:verified-readiness-guard` | ok |
| `npm run lint` | ok |
| `npx tsc --noEmit` | ok |
| `npm run build` | ok |

---

## Hard bans honoured (this audit)

- ✅ No deploy · no CSP enforce flip · no Railway restart  
- ✅ No migrations · no prod DB mutation · no env changes  
- ✅ No scrape · no apply · no trigger-sweep · no secrets in output  
- ✅ Docs-only commits from this session  

---

## Related docs

- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md`
- `docs/S2_CSP_BURNIN_WINDOW_2026-06-01.md`
- `docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md`
- `docs/P1_DOCS_INDEX_2026-05-27.md`
