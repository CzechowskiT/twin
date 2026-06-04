# Public launch readiness matrix — 2026-06-02

**Auditor:** TWIN Release Gate Owner (read-only shift)
**Branch:** `chore/s2-csp-burnin-readiness-2026-06-01`
**Branch HEAD:** `9011040` (prior) → updated by 2026-06-03 shift commits
**Audit UTC:** `2026-06-03T13:29:36Z` (~23h 11m / **~32%** into burn-in; **~48h 49m** until `2026-06-05T14:18:33Z`; L6 + O5 founder waivers signed `13:19:53Z`)
**Production (unchanged by this audit):** FE `https://twin-sooty.vercel.app` · API `https://twin-production-bcd9.up.railway.app`

**Verdict:** **Public launch NO-GO** · **Pilot / investor demo GO** · **S2 NOT READY** · **Auto-apply PAUSED** (operational + product gates)

---

## A — Security / CSP

| Check | Evidence | Status |
| ----- | -------- | ------ |
| S1 CSP report-only + `report-uri` wired | 8-route `curl -sI` 2026-06-02 — all HTTP 200, `content-security-policy-report-only` present, `report-uri /api/v1/csp-report` | ✅ PASS |
| CSP enforce header absent | No `content-security-policy:` (enforce) on `/`, `/dashboard`, `/login/candidate`, `/register/candidate`, `/demo`, `/status`, `/dashboard/calendar`, `/api/public-health` | ✅ (expected) |
| Narrowed policy on prod | Explicit `connect-src` includes `https://twin-production-bcd9.up.railway.app`; no broad `https:` wildcards | ✅ LIVE |
| S2 72h burn-in | Window `2026-06-02T14:18:33Z` → `2026-06-05T14:18:33Z`; founder combined `2026-06-03T13:29:36Z` — Railway `csp_report` **no fresh entries** since start; Chrome DevTools core routes **no CSP violations** | ❌ **NOT READY** — IN PROGRESS (~32% elapsed) |
| S2 violation triage pack | Railway clean + Chrome DevTools **PASS** at `13:29:36Z` (`ece6588`); Safari + Firefox **PENDING**; full 72h rollup + founder enforce sign-off at window end still required | ⚠️ **IN PROGRESS** |
| DevTools logo Console noise (`/_next/image` + favicon 404 / gstatic faviconV2) | Founder `2026-06-03` triage: **non-CSP**; fix chain — `SafeCompanyLogo` → `FAVICON_INITIALS_ONLY_DOMAINS` → `MARQUEE_STABLE_SI_SLUGS` (no Google/gstatic/DDG raster); **post-deploy founder smoke on `/` required** | ⚠️ **fix shipped** — verify Console; **not** S2 blocker |
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
| Apple / CalDAV / ICS | ICS/WebCal partial; no Apple Calendar OAuth | ⚠️ PARTIAL (waiver signed) |
| O5 gate row | Google ✅ · Microsoft ✅ · Apple/iCal partial — founder waiver `2026-06-03T13:19:53Z` | ⚠️ **partial-with-waiver** — non-blocking for controlled pilot |

### O5 — Calendar providers (2026-06-03)

| Provider | Status | Notes |
| -------- | ------ | ----- |
| **Google Calendar** | ✅ **PASS** | FULL prod smoke — OAuth, events, `Europe/Warsaw` mapping (`docs/GOOGLE_CALENDAR_OAUTH_PROD_FIX_2026-05-29.md`) |
| **Microsoft Graph** | ✅ **LIVE** | `microsoft_calendar_configured` on health surface |
| **Apple / iCal / WebCal / ICS** | ⚠️ **PARTIAL** | No Apple Calendar OAuth; users rely on **ICS download / WebCal subscribe** (and CalDAV where scoped) per `.cursorrules` |

**Known limitation:** No Apple Calendar OAuth equivalent to Google/Microsoft. Product copy must **not** claim full Apple Calendar integration unless verified.

### O5 — Founder waiver (2026-06-03)

> Founder accepts O5 Apple/iCal partial status as a known limitation for controlled pilot / limited launch readiness.

| Field | Value |
| ----- | ----- |
| Signed | Tomasz Czechowski |
| UTC | `2026-06-03T13:19:53Z` |
| Condition | Product copy must not claim full Apple Calendar integration unless verified |

**Verdict:** O5 stays **partial-with-waiver** — **non-blocking for controlled pilot / limited launch readiness**; still listed for **full public launch** narrative until ICS/WebCal path verified in founder smoke or implementation ships. Does **not** alone unlock public GO (S2 remains primary blocker).

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
| Nightly beat env (GAP-03) | Prod **`false`** (founder 2026-06-02); evidence in pause plan §8 | ✅ **CLOSED (ops)** |
| `AUTO_APPLY_SUBMIT` (GAP-04) | Not set on prod (Option B partial) | ⚠️ **optional open** — listed as launch blocker until explicit founder waiver |
| UI safety | `test:dashboard-ux-safety` + `test:verified-readiness-guard` — 2026-06-02 PASS | ✅ PASS |
| S6 sweep tests | `test_auto_apply_trigger_sweep_admin_gate.py` + autonomous readiness — 47 passed bundle | ✅ PASS |
| Nightly beat infra | Beat **disabled** on prod health; worker still active | ✅ **PAUSED (ops)** |

**Repo grep (read-only):** No audit session calls to `trigger-sweep`, `nightly_auto_apply_sweep`, or live `auto_apply_for_user` on prod.

---

## G — Legal / privacy

| Check | Evidence | Status |
| ----- | -------- | ------ |
| L1 GDPR signup consent | Register flow + API | ✅ |
| L2 Cookie consent PL/EN | `docs/COOKIE_CONSENT.md` | ✅ |
| L3 Privacy / Terms | `/privacy`, `/terms` HTTP 200 (2026-06-03 curl) | ✅ |
| L4 Scraping compliance | `docs/SCRAPING_COMPLIANCE.md` | ✅ |
| L5 Auto-apply consent model | DB + API tests | ✅ |
| L6 DSR export/delete | Export LIVE; erasure manual via `docs/GDPR_MANUAL_DSR.md`; founder waiver **signed** `2026-06-03T13:19:53Z` | ⚠️ **partial-with-waiver** (pilot OK; not full self-service) |
| L7 Placement verification | `docs/PLACEMENT_VERIFICATION.md` | ✅ design |
| Legal claims in this doc | Only pointers to existing legal docs | ✅ honoured |

### L6 audit notes (2026-06-03, read-only)

**Export — LIVE (self-service):**

- `GET /api/v1/candidates/me/export.json` — GDPR-style JSON (`twin-my-data.json`); tested in `test_candidates_me_export_json.py`
- `GET /api/v1/applications/me/export.{csv,xlsx}` — application portability
- Dashboard + profile UI download (`exportMyDataJson` i18n)

**Delete / erasure — NOT LIVE (self-service):**

- No `delete-account` (or equivalent) route under `/api/v1/auth/me` or `/api/v1/candidates/me` in repo
- **R-019** in `docs/SECURITY_RISK_REGISTER_2026-05-27.md` remains open
- Erasure: **manual** per `docs/GDPR_MANUAL_DSR.md` (identity verify → staging-tested delete checklist → Stripe cancel)
- **Founder waiver** (manual DSR accepted for launch phase): **signed** `2026-06-03T13:19:53Z` — Tomasz Czechowski; see runbook § Launch waiver

**Launch impact:** L6 **partial-with-waiver** — manual process accepted for controlled pilot / limited launch readiness; self-service delete remains future work → **public launch NO-GO** (S2 primary; O5 partial; GAP-04 optional). **Pilot/demo GO** with runbook + signed waiver.

---

## H — UX / founder smoke

| Check | Evidence | Status |
| ----- | -------- | ------ |
| P6 founder authenticated smoke | 8/8 routes + safety copy 2026-05-29 | ✅ PASS |
| Dashboard layout / forecast | Founder-confirmed post-fix | ✅ PASS |
| Verified-readiness card | S11 prod smoke | ✅ PASS |
| No delegated/KYC live copy | Founder evidence doc | ✅ PASS |
| Frontend guards | `test:verified-readiness-guard`, `test:dashboard-ux-safety` | ✅ PASS |
| Marketing logo marquee (`/` home) | Non-CSP UX; `SafeCompanyLogo` + `MARQUEE_STABLE_SI_SLUGS` / initials skiplist (no Google/gstatic/DDG raster); **founder post-deploy smoke** on `/` | ⚠️ **fix shipped** — smoke pending; pilot OK |
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
| Validated jobs | `652` (public-health 2026-06-03) | ✅ LIVE |
| Market coverage active validated | `2634` (2026-06-03) | ✅ LIVE (below long-term target per matrix) |
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

1. **S2** — Complete 72h CSP report-only burn-in (`2026-06-02T14:18:33Z` → `2026-06-05T14:18:33Z`); founder Railway **clean through `2026-06-03T13:29:36Z`**; Chrome DevTools **PASS**; remaining: Safari + Firefox DevTools, full window rollup, founder enforce sign-off (HOLD vs enforce) at window end.
2. **GAP-04** — `AUTO_APPLY_SUBMIT` unset on prod (optional ops knob; document waiver or close before public launch if policy requires).
3. **L6 / O5 (full public launch only)** — Waivers signed `2026-06-03T13:19:53Z` for controlled pilot; **not** substitutes for uncontrolled public launch (self-service delete; Apple/iCal verification for broad marketing).

### Risks (accepted for pilot, not public)

- **Marketing logo marquee:** Pre-fix `/_next/image` / gstatic faviconV2 noise classified **non-CSP**; branch fix uses direct `<img>`, SI allowlist, initials skiplist (no Google/gstatic/DDG raster) — founder post-deploy DevTools smoke on `/` still required; **S2 burn-in unchanged**.
- CSP `unsafe-inline` / `unsafe-eval` remain (separate hardening track).
- Prod API SHA `6382a91` includes `e764e68`; nightly beat **disabled** in health (GAP-03 closed ops 2026-06-02). S2 burn-in **unchanged** — no clock reset.
- Metric / corpus scale below “marketplace” narrative — honest pilot ceiling.

---

## Production curl snapshot (sanitized, 2026-06-03)

**`GET /api/public-health` (via FE):**

```json
{
  "status": "ok",
  "db_ok": true,
  "validated_jobs": 652,
  "market_coverage_active_validated": 2634,
  "nightly_auto_apply_beat_enabled": false,
  "stripe_checkout_ready": true,
  "git_commit": "6382a9188826..."
}
```

**Post-merge sanity:** `docs/POST_MERGE_AUTO_APPLY_SANITY_2026-06-02.md`

**Headers (all 8 audited routes):** HTTP 200 · CSP-RO yes · CSP enforce **no** · HSTS yes · `X-Frame-Options: DENY` · `report-uri` present · narrowed `connect-src` includes Railway API host.

---

## Safe tests run (local, 2026-06-03)

| Command | Result |
| ------- | ------ |
| `pytest tests/test_csp_report*.py -q` | **9 passed** |
| `pytest -k "auto_apply or autonomous or readiness or sweep" -q` | **78 passed** |
| `npm run test:security-headers` | ok |
| `npm run test:verified-readiness-guard` | ok |
| `npm run test:dashboard-ux-safety` | ok |
| `npm run lint` | ok |
| `npm run build` | ok |

---

## Hard bans honoured (2026-06-03 gate-closure session `13:19:53Z`)

- ✅ No deploy · no CSP enforce flip · no Railway restart
- ✅ No migrations · no prod DB mutation · no env changes
- ✅ No scrape · no apply · no trigger-sweep · no secrets in output
- ✅ No S2 PASS · no public launch GO · no `.vercel` / `.env` in commits

---

## Related docs

- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md`
- `docs/S2_CSP_BURNIN_WINDOW_2026-06-01.md`
- `docs/S2_CSP_ENFORCE_READINESS_2026-06-01.md`
- `docs/P1_DOCS_INDEX_2026-05-27.md`
