# L6 DSR / privacy audit — read-only 2026-06-03

**Auditor:** TWIN Release Gate Coordinator (docs only; **no code/env changes**)
**Branch:** `chore/s2-csp-burnin-readiness-2026-06-01`
**Audit UTC:** `2026-06-03T11:16:42Z` (refreshed `2026-06-03T12:23:52Z` — S2 founder Railway checkpoint; L6 waiver signed `2026-06-03T13:19:53Z`)
**Gate:** `PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` row **L6** (data subject access export / delete)

## Verdict

| Capability | Status | Notes |
| ---------- | ------ | ----- |
| **Access / portability (export)** | **LIVE (partial self-service)** | Machine-readable JSON + application exports |
| **Erasure (account delete)** | **NOT LIVE (self-service)** | No authenticated delete-account API found in repo |
| **Manual DSR workflow** | **ACCEPTED (waiver signed)** | `docs/GDPR_MANUAL_DSR.md` — export + erasure SLAs; founder sign-off `2026-06-03T13:19:53Z` (Tomasz Czechowski) |
| **L6 gate for public launch** | **⚠️ partial-with-waiver** | Export LIVE; erasure manual via runbook; waiver signed for pilot/limited readiness — **not** full L6 PASS until self-service delete ships |
| **L6 gate for controlled pilot** | **✅ acceptable** | Manual process accepted; self-service delete remains future work |

## Export — what ships today

| Surface | Evidence | Auth |
| ------- | -------- | ---- |
| `GET /api/v1/candidates/me/export.json` | `backend/app/api/candidates.py` · `build_user_owned_export_payload` in `backend/app/services/user_data_export.py` | Bearer (signed-in user) |
| `GET /api/v1/applications/me/export.csv` | `backend/app/api/applications.py` | Bearer |
| `GET /api/v1/applications/me/export.xlsx` | `backend/app/api/applications.py` | Bearer |
| Dashboard UI — “Download my data (JSON)” | `frontend/src/components/candidate-workspace-subnav.tsx` · i18n `exportMyDataJson` | Bearer |
| Profile page JSON download | `frontend/src/app/profile/page.tsx` → `/api/v1/candidates/me/export.json` | Bearer |

**Tests:** `backend/tests/test_candidates_me_export_json.py`, `backend/tests/test_applications_export.py`

**Omissions (by design in export builder):** Stripe customer/subscription IDs and `referral_public_token` omitted from JSON export per `docs/AGENT_SHIPPING_LOG.md` (2026-05-19).

## Delete / erasure — gap

| Expected (risk register) | Repo status |
| ------------------------ | ----------- |
| `POST` or `DELETE` `/api/v1/auth/me/delete-account` (self-service) | **Not found** — `docs/SECURITY_RISK_REGISTER_2026-05-27.md` **R-019** still open |
| Admin-only hard delete | Not audited in this pass |

**Privacy / terms copy:** EU/EEA and UAE privacy markdown under `frontend/public/legal/` describe erasure rights and **contact the operator** — aligns with manual workflow until API ships.

**Checklist reference:** `docs/GDPR_MANUAL_DSR.md` — operator runbook for pilot/public-launch phase. **Founder sign-off** `2026-06-03T13:19:53Z` — L6 acceptable-with-waiver for controlled pilot / limited launch readiness (S2 still blocks public GO).

## Related legal / consent (L1–L5, context)

| Item | Status |
| ---- | ------ |
| Signup GDPR consent | `User.gdpr_consent_at` + register flow |
| Cookie consent PL/EN | `docs/COOKIE_CONSENT.md` |
| `/privacy`, `/terms` | Marketing routes live |
| Auto-apply consent model | DB + API (apply paused on prod) |

## Recommendations (docs-only; no implementation today)

1. **Pilot:** Follow `docs/GDPR_MANUAL_DSR.md` — waiver **signed** `2026-06-03T13:19:53Z`.
2. **Full public launch:** Ship self-service delete and close **R-019** (waiver does not substitute for full L6 PASS on uncontrolled signup).
3. **Evidence:** Founder smoke — download JSON from dashboard once per locale; one erasure drill on staging per runbook § Erasure.

## Hard bans honoured

No prod DB mutation · no deploy · no new API routes in this audit session.
