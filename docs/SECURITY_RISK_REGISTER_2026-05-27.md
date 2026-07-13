# Security risk register — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** TASK 14 of the long autonomous security session.
A docs-only **register** of every known security / abuse risk
on TWIN, with current status, mitigation reference, and the
single next-action that retires the risk. Pairs with the
audits in `docs/P1_*` and the design docs in `docs/P2_*`.

## Legend

| Code | Meaning                                                                                                                |
| ---- | ---------------------------------------------------------------------------------------------------------------------- |
| 🔴   | OPEN — no mitigation in place; the risk is real today                                                                  |
| 🟡   | PARTIAL — partial mitigation (one layer in place; another planned)                                                     |
| 🟢   | CLOSED — accepted residual risk, or mitigation shipped and verified                                                    |
| L / M / H | Severity grade — low / medium / high                                                                              |

Severity is **inherent** (before mitigation). Status is **today's**
posture.

## Register

| ID    | Risk                                                                                                              | Sev | Status | Mitigation                                                                                                                   | Next action                                                                                              | References                                                                                            |
| ----- | ----------------------------------------------------------------------------------------------------------------- | --- | ------ | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| R-001 | Beta waitlist signup spam / DoS                                                                                   | M   | 🟢     | `POST /beta/join` → `@limiter.limit("5/minute")` per IP                                                                       | None                                                                                                     | `P1_BETA_WAITLIST_RATE_LIMIT_2026-05-27.md`                                                            |
| R-002 | Any authenticated user could enqueue the platform-wide nightly auto-apply sweep                                   | H   | 🟢     | `POST /auto-apply/trigger-sweep` gated to ops allowlist + rate-limited 3/min                                                  | None                                                                                                     | `P1_AUTO_APPLY_TRIGGER_SWEEP_AUDIT_2026-05-27.md`                                                      |
| R-003 | CSP report-only with no `report-uri` → blind to violations during burn-in                                          | M   | 🟢     | `report-uri /api/v1/csp-report` wired; sink endpoint live + rate-limited 60/min                                                | Start burn-in clock; review reports daily for 72h                                                        | `P1_CSP_REPORT_URI_WIRING_2026-05-27.md`                                                               |
| R-004 | Stripe `invoice.payment_succeeded` replay double-counts `subscription_invoice_payment_count` → trips referral payout | M   | 🟡     | Helpers + model shipped (`stripe_events.*`); wire-up + migration pending                                                       | Ship `050_stripe_webhook_events.py` migration + 6-line patch to `app/api/billing.py`                      | `P2_STRIPE_EVENT_DEDUP_HELPERS_2026-05-27.md`, `P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md`            |
| R-005 | Authenticated user can loop LLM-cost mutations and burn Claude credits                                            | M   | 🟢     | Layer 2 user-keyed `@limiter.limit("60/minute")` on 8 LLM routes                                                              | Extend Layer 2 to the remaining 7 mutating routes after a week of preview logs                            | `P2_BACKEND_USER_RATE_LIMIT_LAYER2_2026-05-27.md`                                                      |
| R-006 | Corporate NAT / CGNAT false-positive 429s if we IP-key authenticated rate-limits                                  | L   | 🟢     | Layer 2 keys by JWT subject; falls back to IP only for anonymous probes                                                       | None                                                                                                     | Same as R-005                                                                                          |
| R-007 | `POST /beta/waitlist/{code}/cv` accepts uploads with **no rate limit** and only a referral code as auth            | H   | 🟢     | `@limiter.limit("10/minute")` per IP + `test_beta_waitlist_upload_rate_limit.py` (11th → 429)                                  | None — verified 2026-07-13 batch                                                                          | `P1_PUBLIC_ENDPOINT_ABUSE_AUDIT_2026-05-27.md` § R-007                                                 |
| R-008 | `POST /beta/waitlist/{code}/voice` — identical risk profile to R-007                                              | H   | 🟢     | `@limiter.limit("10/minute")` per IP + voice upload test in same module                                                         | None — verified 2026-07-13 batch                                                                          | `P1_PUBLIC_ENDPOINT_ABUSE_AUDIT_2026-05-27.md`                                                         |
| R-009 | `GET /beta/waitlist/{code}` enables referral-code enumeration                                                     | M   | 🟢     | `@limiter.limit("60/minute")` per IP + dashboard GET test (61st → 429)                                                          | None — verified 2026-07-13 batch                                                                          | Same                                                                                                  |
| R-010 | OAuth callback `GET` routes have no rate limit → provider-quota burn loop                                          | L   | 🟡     | `@limiter.limit("10/minute")` on auth, calendar, Greenhouse ATS callbacks; `test_oauth_callback_rate_limits.py`                  | Deploy + monitor 429 rate in prod                                                                          | Gate S10 — deploy pending                                                                              |
| R-011 | `POST /consent/cookies` accepts unlimited writes per IP                                                            | L   | 🟡     | `@limiter.limit("30/minute")` on `consent.py`; `test_consent_recruiter_rate_limits.py`                                         | Deploy pending                                                                                             | Gate — deploy pending                                                                                  |
| R-012 | `POST /recruiter/inbox/{id}/respond` no per-token cap → leaked token flips an inbox                                | M   | 🟡     | `recruiter_token_key` + 60/min on respond + batch; same test module                                                            | Deploy pending                                                                                             | `P1_PUBLIC_ENDPOINT_ABUSE_AUDIT_2026-05-27.md`                                                         |
| R-013 | CSP still in Report-Only mode → real XSS isn't blocked                                                            | H   | 🟡     | Report-Only header + sink endpoint + structural tests in place; burn-in pending                                                | Run 72h burn-in on preview alias with 0 unexpected violations, then flip to enforce mode (1-char diff)    | `P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`                                                                |
| R-014 | `script-src` still has `'unsafe-inline'` + `'unsafe-eval'`                                                         | M   | 🟡     | Documented; nonce work sized                                                                                                  | Implement nonce on every inline `<script>` from Next.js' server-side render, then drop both keywords      | `P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md` § 2                                                            |
| R-015 | API DSN / secrets leak via 500 response body                                                                       | M   | 🟢     | `app/main.py` exception handler sanitises 500; test_public_health_regression.py asserts no DSN / secret / stack in body          | None                                                                                                     | `app/main.py` `http_exception_sanitize_500`, `test_public_health_regression.py`                       |
| R-016 | `Server: uvicorn` / `X-Powered-By` headers fingerprint the stack                                                   | L   | 🟢     | `poweredByHeader: false` in Next.js config; FastAPI doesn't set its own; test_public_health_regression.py asserts both absent  | None                                                                                                     | `frontend/next.config.ts`, `test_public_health_regression.py`                                          |
| R-017 | `frontend/.vercel/project.json` drift — `vercel deploy` from local would publish to wrong project                  | L   | 🟡     | Push-based deploy is canonical and unaffected; drift guard script alerts on `bash scripts/check-vercel-canonical-alias.sh`     | Re-link via `vercel link --scope=twin --project=twin` in a maintenance window                              | `VERCEL_CANONICAL_DEPLOY_RUNBOOK_2026-05-27.md`, `VERCEL_CANONICAL_ALIAS_GUARD_2026-05-27.md`         |
| R-018 | DB backup / restore is not exercised; "we have backups" is unverified                                              | M   | 🔴     | Railway snapshots exist; no restore drill on record                                                                            | Schedule a one-hour restore drill against a staging DB; doc the result                                    | `PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` gate O7                                                  |
| R-019 | Data-subject access (export / delete) is partial                                                                   | M   | 🟡     | Export LIVE (`/me/export.json`); self-service delete API+UI on #451 branch (`POST /candidates/me/delete-account`, 6 pytest)     | Prod deploy + founder E2E smoke after train merge                                                           | `PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` gate L6                                                  |
| R-020 | Auto-apply submitted to a wrong job → recruiter / candidate trust hit                                              | H   | 🟡     | Per-board allowlist exists; no enforced per-job-board scope on a per-user basis; `daily_limit` from consent caps volume          | Add explicit `board_id IN consented_boards` check in `process_user_nightly_auto_apply`                     | `app/services/nightly_auto_apply.py`, `AUTO_APPLY_RELIABILITY_REPORT.md`                              |
| R-021 | Recruiter token has no rotation policy / expiry                                                                    | L   | 🔴     | Rotation is manual via Railway env var                                                                                          | Document rotation in `INCIDENT_RESPONSE_RUNBOOK`; add reminder in pilot operating manual                  | `INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md`                                                              |
| R-022 | `OPS_ADMIN_TOKEN` has no rotation policy / expiry                                                                  | M   | 🔴     | Same                                                                                                                          | Same                                                                                                     | Same                                                                                                  |
| R-023 | LinkedIn viral incentive endpoint — replay grants double credit?                                                   | L   | 🟢     | `LinkedInViralIncentiveClaim` has unique-by-user constraint                                                                    | None                                                                                                     | `app/database/models.py:716`                                                                            |
| R-024 | LLM provider returns adversarial output → injection into emails / messages sent to recruiters / candidates         | M   | 🟡     | We strip nothing today (raw output passed to `mail.send` and to UI markdown)                                                   | Output sanitisation pass before send (HTML escape, length cap), and an LLM-judge eval gate                | Future doc                                                                                            |
| R-025 | `OAuth2PasswordBearer` returns `email` as JWT `sub` → if a user changes email, their JWT becomes invalid           | L   | 🟢     | Acceptable Phase-1 behaviour; documented in `app/core/security.py`; users re-login after email change                          | Move to `user_id` claim in JWT when we add `plan_tier` claim (same migration)                              | `P2_AUTHENTICATED_MUTATION_RATE_LIMIT_DESIGN_2026-05-27.md` § "Plan-tier integration"                  |

## Open vs partial vs closed — summary

- **🔴 Open (5):** R-010, R-011, R-012, R-018, R-021, R-022 (some L sev, three M).
- **🟡 Partial (7):** R-004, R-013, R-014, R-017, R-019,
  R-020, R-024.
- **🟢 Closed (13):** R-001, R-002, R-003, R-005, R-006,
  R-007, R-008, R-009, R-015, R-016, R-023, R-025, plus the structural ones
  reflected by the regression tests.

## Risk reduction roadmap

Order of follow-ups by risk × cost:

1. **R-007 / R-008 / R-009** — ~~rate-limit beta CV / voice / dashboard GET~~ **CLOSED 2026-07-13.**
2. **R-013 / R-014** — CSP enforce + nonce. **HIGH severity,
   medium cost.** Gated on 72h burn-in.
3. **R-004** — Stripe `event.id` dedup migration. **MEDIUM
   severity, medium cost.** Gated on migration freeze.
4. **R-020** — per-user `board_id` allowlist on auto-apply.
   **HIGH severity (if it bites), low cost.** Worth promoting.
5. **R-019** — data-subject self-service (export + delete).
   **MEDIUM severity, medium cost.** Pre-launch gate L6.
6. **R-018** — DB restore drill. **MEDIUM severity, low cost
   if we accept a one-hour exercise.**
7. **R-021 / R-022** — token rotation reminders + policy.
   **LOW severity, very low cost.**
8. **R-009 / R-010 / R-011 / R-012** — per-IP / per-token
   rate limits on public surface. **LOW-MEDIUM severity, low
   cost.** Bundle into one commit.

## How this register is maintained

- New incidents (`docs/POSTMORTEM_*.md`) should add a row to
  this register if they surface a new risk.
- Closed rows stay in the register for traceability — they're
  the audit trail of "what we fixed and when".
- The register is **branch-local** by design (this file lives
  in the repo). When TWIN graduates to a per-organisation
  GRC tool, the register migrates there with row IDs intact.

## Hard bans honoured

- ✅ Docs only.
- ✅ No source change.
- ✅ No deploy / Railway / Vercel change.
- ✅ No DB migration.
- ✅ No `.env` change.
- ✅ No secret in this register (mitigations reference paths
  / env-var names, never values).
- ✅ No UX / copy change.

## Files

- `docs/SECURITY_RISK_REGISTER_2026-05-27.md` (this doc).

## Related

- `docs/P1_DOCS_INDEX_2026-05-27.md` — entry point.
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` — gates
  consume rows from this register.
- `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` — every new
  incident updates this register.
- Every `P1_*` audit and `P2_*` design doc — each one
  closes or partials a row.
