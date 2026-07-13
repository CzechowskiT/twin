# Prelaunch privacy & compliance audit — 2026-07-13

> **Mode:** read-only · **Prior audit:** [L6_DSR_PRIVACY_AUDIT_2026-06-03.md](./L6_DSR_PRIVACY_AUDIT_2026-06-03.md)

---

## Verdict

| Capability | Status | Launch impact |
|------------|--------|---------------|
| Access / export (JSON, CSV, XLSX) | **LIVE** | ✅ |
| Cookie consent PL/EN | **LIVE** | ✅ |
| `/privacy`, `/terms` | **LIVE** | ✅ |
| GDPR signup consent | **LIVE** | `gdpr_consent_at` |
| Self-service erasure | **NOT LIVE** | ⚠️ LAUNCH_BLOCKER at scale |
| Manual DSR workflow | **WAIVED** | Signed 2026-06-03 — pilot only |
| Trust center persistence | **PILOT** | PR #450 scaffold; full on train |

---

## Export surfaces (verified in repo)

| Surface | Auth | Test |
|---------|------|------|
| `GET /api/v1/candidates/me/export.json` | Bearer | `test_candidates_me_export_json.py` |
| `GET /api/v1/applications/me/export.csv` | Bearer | `test_applications_export.py` |
| Dashboard download UI | Bearer | i18n `exportMyDataJson` |

**Omissions by design:** Stripe IDs, `referral_public_token` excluded from export payload.

---

## Erasure gap

| Expected | Status |
|----------|--------|
| `DELETE /api/v1/auth/me` or equivalent | **Not found** |
| Manual erasure runbook | `docs/GDPR_MANUAL_DSR.md` |

**Risk register:** R-019 OPEN

---

## Wave train privacy impact (#448–#455)

| PR | PII handling | Notes |
|----|--------------|-------|
| #448 referrals | Referral tokens; abuse controls guard | PILOT |
| #449 activation | Workspace metadata only | PILOT |
| #450 trust review | Sanitized queue items | PILOT |
| #452 notification prefs | In-app only; no external send | **Hard ban** on email |
| #455 candidate timeline | Trust events read-only | PILOT |

---

## Consent & auto-apply

| Item | Status |
|------|--------|
| Auto-apply product | **PAUSED** |
| Apply consent model | DB + API present |
| Nightly auto-apply tests | 5 failures — feature paused, not launch scope |

---

## Hardening PR #458

Privacy request tracker architecture guard — docs + static guard; merge after #451 tooling.

---

## Recommendations

1. **Controlled pilot:** Manual DSR waiver remains valid.
2. **Public GO:** Close R-019 (self-service delete) or cap signups to founder-led cohort.
3. **Pre-launch smoke:** One export download per locale; one manual erasure drill on staging.

**Compliance stance:** **Pilot-acceptable** · **Public NO-GO** until erasure gap addressed or signup constrained.
