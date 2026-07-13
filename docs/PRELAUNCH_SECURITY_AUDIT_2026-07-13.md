# Prelaunch security audit — 2026-07-13

> **Mode:** read-only · **Path:** B++ · **Launch:** NO-GO

---

## Summary

| Area | Rating | Notes |
|------|--------|-------|
| Transport / headers | ✅ GREEN | `vercel.json` X-Frame-Options, CSP-adjacent headers |
| AuthZ on wave APIs | ✅ GREEN | Tenant isolation tests on C1–C5 |
| Secrets handling | ✅ GREEN | No secrets in batch commits; env encrypted on Vercel |
| Hard bans | ✅ ENFORCED | No Stripe LIVE, ATS write, MS cal write, auto-apply |
| DSR erasure | ⚠️ YELLOW | Self-service API on #451 branch; prod still manual |
| Observability | ⚠️ YELLOW | No log drains; CLI/Dashboard fallback |
| Dependency audit | ⚠️ RE-VERIFY | Last full audit 2026-05-27 — re-run before GO |

---

## Wave C3–C5 security matrix

See [SECURITY_MATRIX_WAVE_C3_C5_2026-07-13.md](./SECURITY_MATRIX_WAVE_C3_C5_2026-07-13.md).

| Control | C3 | C4 | C5 | Candidate timeline |
|---------|----|----|----|--------------------|
| AuthZ | Recruiter token | Recruiter token | Recruiter token | Session `/me` |
| Tenant isolation | company_slug | company + surface | company | user_id |
| External send | **Banned** | N/A | N/A | N/A |
| PII in audit | No | Filter JSON only | Sanitized meta | Trust events only |

---

## Frontend security guards (batch run)

| Guard | Result |
|-------|--------|
| `test:security-headers` | PASS |
| `test:observability-redaction-guard` | PASS |
| `test:referral-abuse-controls-guard` | PASS |
| `test:hardening-feature-flag-audit-guard` | PASS |

---

## Backend security tests

| Suite | Result |
|-------|--------|
| Full pytest (929 pass) | PASS with 5 auto-apply failures (PAUSED feature — excluded from launch scope) |
| CSP report tests | Shipped |
| Tenancy tests (C1–C5) | PASS on integration sim |

---

## Vercel / edge

| Check | Status |
|-------|--------|
| Security headers in `vercel.json` | 4 headers on `/(.*)` |
| Middleware | Present (71KB) |
| Drain signature verification | N/A — no drains |
| `DRAIN_SECRET` | Not set (no drains) |

---

## Open risks (from register)

| ID | Risk | Mitigation |
|----|------|------------|
| R-019 | No self-service delete | Manual DSR + pilot-only signup |
| S8–S9 | Deps/secrets baseline stale | `npm audit` + founder review pre-GO |
| LB-201 | DR re-drill pending | O7 runbook |

---

## Hard bans confirmed

No LIVE flip for: Stripe checkout · ATS writeback · Microsoft Calendar write · auto-apply · external notifications · board/admin public exposure.

**Audit verdict:** Security posture **acceptable for controlled pilot**; **NOT** sufficient alone for public GO (Gate F + smoke + train merge required).
