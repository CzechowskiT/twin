# Auto-apply & delegated apply safety audit — 2026-06-02

**Auditor:** TWIN Auto-Apply / Delegated Apply Safety Auditor  
**Branch:** `chore/s2-csp-burnin-readiness-2026-06-01`  
**Branch HEAD (audit start):** `389e325`  
**Remediation (2026-06-02):** `fix(safety): hard-gate autonomous apply endpoints` — GAP-01/02 closed in code  
**Mode:** Read-only code/docs + local tests + sanitized prod `public-health` curl  
**Hard bans honoured:** no deploy, prod mutation, scrape, apply, trigger-sweep, secrets, delegated-live or public-launch GO claims

---

## Executive verdict

| Dimension | Status |
| --------- | ------ |
| **Delegated apply** | **NOT LIVE** — `delegated_apply_allowed=false`, `can_submit_delegated_application=false` always (`candidate_readiness.py`) |
| **Auto-apply (operational)** | **PAUSED** for public launch — infra + API paths exist; founder/policy hold; audit made **no** prod triggers |
| **Nightly Celery sweep** | **INFRA LIVE** (`nightly_auto_apply_beat_enabled` default `True`) — gated by consent + `autonomous_apply_allowed()` per user |
| **Platform trigger-sweep** | **OPS ONLY** — `user_has_scrape_ops` + 403 for normal users (tests) |
| **Public launch** | **NO-GO** (unchanged — S2 CSP + program gates) |

---

## A — API surface map (backend)

| Method | Path | Auth | Can mutate / submit? | Gates (code) |
| ------ | ---- | ---- | -------------------- | ------------ |
| GET | `/api/v1/auto-apply/settings` | JWT | No | Readiness flags in response |
| GET | `/api/v1/auto-apply/last-sweep` | JWT | No | Observability only |
| POST | `/api/v1/auto-apply/consent` | JWT | Yes (consent row) | `_require_verified_readiness` |
| PATCH | `/api/v1/auto-apply/settings` | JWT | Yes (consent prefs) | Profile ready; activate requires verified readiness |
| POST | `/api/v1/auto-apply/trigger` | JWT | **Yes** (up to 1 job) | **Ops allowlist** + verified readiness + consent |
| POST | `/api/v1/auto-apply/trigger-sweep` | JWT | **Yes** (platform sweep) | **Ops allowlist only** (`SCRAPE_OPS_*`) |
| POST | `/api/v1/applications/auto-apply` | JWT | **Yes** (Playwright path) | **`enforce_autonomous_apply_allowed()`** → 403; then rate limits / blocklists |
| POST | `/api/v1/applications` | JWT | Yes (tracker) | Manual status — not autonomous submit |
| GET | `/api/v1/candidates/me/verified-readiness` | JWT | No | Gateway read-only |
| GET | `/api/v1/ops/auto-apply/last-run` | Ops token | No | Ops observability |

**Router:** `auto_apply_settings.py` → prefix `/auto-apply`; `applications.py` → `/applications/auto-apply`.

---

## B — Consent model

| Item | Implementation | Status |
| ---- | -------------- | ------ |
| Table | `auto_apply_consents` (migration `037`) | ✅ LIVE |
| Consent version | `CONSENT_VERSION = "v1"` | ✅ |
| Enable autonomous | `POST /consent` + `consent_acknowledged` | ✅ requires verified readiness |
| Nightly selection | Active consent + `autonomous_apply_allowed` in `process_user_nightly_auto_apply` | ✅ |
| Delegated consent table | `docs/DELEGATED_APPLY_CONSENT_MODEL_2026-05-28.md` — **not migrated** | 📐 design only |

---

## C — Readiness & verified gateway

| Gate | Backend | Frontend |
| ---- | ------- | -------- |
| `autonomous_apply_allowed()` | Profile + `verification_status` + empty `blocked_reasons` | `verified_readiness_ready` on settings |
| Delegated submit | Always `false` in `compute_verified_candidate_gate` | `jobApplyActionsGuardFromReadiness` → `canSubmitDelegatedApplication` always false today |
| Prepare package | `can_prepare_application_package` when status in `_PREPARE_ALLOWED_STATUSES` | `canPrepareApplicationPackage` on job cards / forecast |
| Nightly skip reason | `verified_readiness_incomplete` | Strip shows `nightlyAutoApplyStripBlockedReadiness` |

**Remediation:** Shared policy in `app/services/autonomous_apply_policy.py`; both per-job and consent paths call `enforce_autonomous_apply_allowed()`.

---

## D — Nightly sweep & Celery

| Control | Location | Default / behaviour |
| ------- | -------- | ------------------- |
| Beat schedule | `celery_app.py` | Enabled when `nightly_auto_apply_beat_enabled=True` |
| Sweep task | `nightly_auto_apply_sweep` | Iterates consenting users; skips without readiness |
| Supported boards | `nightly_auto_apply_supported_boards` config | pracuj.pl-focused |
| Daily cap | Per-consent `daily_limit` + `AutoApplyEvent` count | ✅ |
| Platform sweep | `trigger-sweep` | Ops-only |

**Operational note:** Launch stance **PAUSED** is policy; beat may still run on prod for users with consent — founder should confirm env flags / beat disable if full pause required.

---

## E — Per-job apply (manual vs prepare/auto)

| Surface | User action | Server path |
| ------- | ----------- | ----------- |
| External link apply | Opens job URL + tracker | `trackLinkOpened` / applications POST |
| Prepare application | `POST /applications/auto-apply` | Playwright + optional `submit` |
| Dashboard wrapper | Blocks if `!canPrepareApplicationPackage` | `dashboard/page.tsx` |
| Forecast | Same guard + consent nudge | `OpportunityForecast.tsx` |
| Job list | `prepareApplication` label; guard on button | `job-list.tsx` |

**Config:** `auto_apply_submit=True` default; `auto_apply_require_premium=False` default — real submit possible when API called.

---

## F — Delegated apply

| Check | Result |
| ----- | ------ |
| DB model for delegated consent | **Not shipped** |
| API submit endpoint for delegated | **None** |
| Gateway flags | Always false |
| UI “Submit application” / KYC live copy | Forbidden by `dashboard-ux-safety` + `verified-readiness-guard` |
| Product docs | `DELEGATED_APPLY_ENGINE_GUARD_PLAN_2026-05-28.md` |

**Verdict:** **NOT LIVE** — safe to state in founder comms.

---

## G — Frontend surface map

| Surface | File | Mutating API in UI? | Notes |
| ------- | ---- | ------------------- | ----- |
| Dashboard strip | `nightly-auto-apply-strip.tsx` | No | Settings + last-sweep GET only |
| Auto-apply settings | `settings/auto-apply/page.tsx` | consent, PATCH settings | **No** `trigger` / `trigger-sweep` buttons |
| Verified readiness card | `dashboard-verified-readiness-card.tsx` | No | GET only |
| Job list / matches / jobs sections | various | prepare via guarded `autoApplyToJob` | Uses `applyActionsGuard` |
| Opportunity forecast | `OpportunityForecast.tsx` | `POST …/applications/auto-apply` | Guarded |
| i18n `nightlyAutoApplyTrigger` | `i18n.ts` only | — | **Dead keys** (no component reference) |

**Forbidden copy guards:** `dashboard-ux-safety.test.ts`, `verified-readiness-guard.test.ts` — **PASS** (2026-06-02).

---

## H — Billing & subscription gates

| Path | Premium required? | Code |
| ---- | ----------------- | ---- |
| `POST /applications/auto-apply` | Only if `auto_apply_require_premium=True` | Default **False** |
| Nightly / consent routes | No Stripe tier check | Consent + readiness only |
| Feature enum | `Feature.AUTO_APPLY` → `PlanTier.STANDARD` | Used when premium flag on |

---

## I — Test coverage & classified gaps

### Tests executed (local 2026-06-02)

| Suite | Result |
| ----- | ------ |
| `pytest` verified-readiness + csp + public_health + autonomous_applying + trigger_sweep_admin | **47 passed** |
| `npm run test:verified-readiness-guard` | ok |
| `npm run test:dashboard-ux-safety` | ok |
| `npm run test:security-headers` | ok |
| `lint`, `tsc`, `build` | ok |

### Related test files (repo)

`test_auto_apply_trigger_sweep_admin_gate.py`, `test_autonomous_applying_readiness_gate.py`, `test_candidate_verified_readiness_gate.py`, `test_auto_apply_settings_api.py`, `test_nightly_auto_apply_integration.py`, `test_applications_auto_apply_auth.py`, `test_auto_apply_guards.py`, `test_market_scrape_no_auto_apply.py`, frontend static guards above.

### Gap register

| ID | Severity | Finding | Status (post-fix) |
| -- | -------- | ------- | ----------------- |
| GAP-01 | **HIGH** | `POST /applications/auto-apply` lacked server readiness gate | ✅ **CLOSED** — `enforce_autonomous_apply_allowed()` in `applications.py` |
| GAP-02 | **HIGH** | `POST /auto-apply/trigger` callable by any ready user | ✅ **CLOSED** — ops allowlist only (`user_has_scrape_ops`) |
| GAP-03 | **MEDIUM** | Nightly beat enabled by default while launch **PAUSED** | ⚠️ **OPEN (ops)** — set `NIGHTLY_AUTO_APPLY_BEAT_ENABLED=false` on Railway for full pause; code default unchanged |
| GAP-04 | **MEDIUM** | `auto_apply_submit=True` default | ⚠️ **OPEN (ops)** — pilot: set `AUTO_APPLY_SUBMIT=false` on prod if prepare-only |
| GAP-05 | **LOW** | Dead i18n keys `nightlyAutoApplyTrigger*` | ⚠️ open |
| GAP-06 | **LOW** | Premium gate off by default | ⚠️ open |

**Policy module:** `backend/app/services/autonomous_apply_policy.py`  
**Tests:** `tests/test_applications_auto_apply_readiness_gate.py`, updated autonomous/settings tests.

**No BLOCKER** for delegated apply live — flags remain hard-false.

---

## J — Launch alignment & founder decisions

| Decision | Audit recommendation |
| -------- | -------------------- |
| Public launch | **NO-GO** — do not enable mass auto-apply marketing |
| Delegated apply comms | **NOT LIVE** — only “prepare package” / manual tracker honesty |
| Auto-apply ops | **PAUSED** — no founder trigger-sweep in launch window; verify beat flag |
| Before widening apply | GAP-01/02 closed; confirm GAP-03/04 env on prod; re-run pytest bundle |
| S2 / KYC | Do **not** claim S2 PASS or KYC live — out of scope; separate gates |

### Prod health snapshot (sanitized curl)

```json
{
  "status": "ok",
  "db_ok": true,
  "validated_jobs": 652,
  "market_coverage_active_validated": 2579,
  "git_commit": "df15618f1e2e..."
}
```

---

## Hard bans confirmed (session)

- ✅ No deploy · Railway restart · migrations · env · prod DB  
- ✅ No scrape · apply · auto-apply · trigger-sweep calls  
- ✅ No secrets in doc · no delegated-live · no public launch GO · no S2 PASS · no KYC-live without evidence  

---

## Related

- `docs/SAFETY_AUDIT_AUTONOMOUS_APPLYING_2026-05-28.md`
- `docs/SAFETY_AUDIT_PER_JOB_APPLY_PREPARE_2026-05-29.md`
- `docs/VERIFIED_CANDIDATE_GATEWAY_2026-05-28.md`
- `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md`
- `docs/P1_AUTO_APPLY_TRIGGER_SWEEP_AUDIT_2026-05-27.md`
