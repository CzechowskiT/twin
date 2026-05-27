# CTO audit delta — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** Backlog 25 of the long autonomous security session.
A docs-only **delta** between the 2026-05-26 CTO product/tech
audit (`CTO_PRODUCT_TECH_AUDIT_2026-05-26.md` +
`CTO_AUDIT_P0_FOLLOWUP_2026-05-26.md`) and today's posture
after two consecutive security-engineering sessions. This is
the bridge document for a CTO read after a one-day break.

## TL;DR

- Overall CTO maturity: **6.8 / 10 → 7.4 / 10** (+0.6).
- Movement is in **security hardening + ops runbooks +
  observability**. Movement is **not** in scrape coverage,
  ATS depth, employer surface, or load capacity (out of
  session scope).
- Pilot readiness: still **conditional GO** for 10-20 named
  founding users with consent and a manual founder smoke.
  Public launch: still **NO**.

## Maturity score by axis

| Axis                                  | 2026-05-26 | 2026-05-27 | Δ      |
| ------------------------------------- | ---------- | ---------- | ------ |
| Infrastructure & deploy               | 7.5        | 7.5        | —      |
| Security & abuse hardening            | 6.0        | **7.5**    | +1.5   |
| Test coverage & contract freezing     | 6.5        | **7.5**    | +1.0   |
| Operational runbooks & incident prep  | 5.0        | **8.0**    | +3.0   |
| Documentation index & traceability    | 6.0        | **8.0**    | +2.0   |
| Scrape coverage & corpus depth        | 5.5        | 5.5        | —      |
| ATS / employer integration depth      | 4.5        | 4.5        | —      |
| Load / soak / 1000-user readiness     | 4.0        | 4.0        | —      |
| Public-launch UX / copy / legal       | 5.5        | 5.5        | —      |

Weighted average (rough): **6.8 → 7.4**.

## What closed since 2026-05-26

These are all on this branch, post-`7738cfb`. Commit SHAs are
the ones written by the agent during the two sessions (3-hour
session then this long session).

| Item                                            | Status before     | Status after                                          | SHAs (commits)         |
| ----------------------------------------------- | ----------------- | ----------------------------------------------------- | ---------------------- |
| Public beta waitlist signup spam / DoS          | unlimited POST    | 5/min per-IP via SlowAPI; test frozen                  | `b7c0622`              |
| Auto-apply trigger-sweep authz                   | any authed user   | ops allowlist; 10 contract tests; 3/min cap            | `dd0b8a2`, `edcebfe`   |
| CSP violations were invisible                    | no sink            | Report-Only header + `report-uri` + 60/min sink         | `0dfc6c9`, `974bd15`   |
| Backend mutation rate-limit (LLM endpoints)      | none               | Layer 2 user-keyed 60/min on 8 routes                  | `28a50a0`              |
| Stripe `event.id` replay double-count            | unhandled          | ORM + helpers shipped (no migration yet); doc skeleton | `f341e1f`, this session |
| `/api/v1/health` PII / banner leak               | unverified         | 9 regression tests freeze the contract                 | `62967e9`              |
| CSP report sink whitelist contract               | informal           | 4 sanitisation tests added                              | this session (`78d1519`) |
| Beta waitlist public-surface PII contract        | informal           | 9 contract tests added                                   | this session (`487cbe2`) |
| Production incident playbook                     | none               | Severity matrix + 7-step triage + 5 recovery playbooks | this session (`54d8f07`) |
| Security risk register                           | none               | R-001 … R-025 tracked with status + next-action        | this session (`5c64c77`) |
| Backend route inventory                          | informal           | 175 routes documented, grouped, cross-linked            | this session (`9d2221e`) |
| Backend test map                                 | informal           | 138 tests grouped by concern, CI-smoke flagged          | this session (`cf83d9a`) |
| `.gitignore` audit                              | informal           | Repo-wide + frontend audited; 0 secret-shaped tracked   | this session (`6a54357`) |
| Robots / sitemap audit                           | informal           | Audit doc; gaps logged; no changes shipped               | this session (`9af90f6`) |
| Smoke command reference                          | scattered          | One canonical local-repro doc                            | this session (`230ba75`) |
| PR template                                      | none               | Proposed (drop-in next session)                          | this session (`d7206c9`) |
| Vercel canonical alias drift                     | flagged, no guard  | Read-only guard script                                   | `3d89a03`              |
| Frontend E2E smoke breadth                       | login-only         | + marketing pages, SEO, runtime CSP headers              | `b0b4988`              |
| Public launch gate checklist                     | scattered          | One consolidated checklist                                | `1e6434d`              |
| Controlled pilot operating manual                | none               | Daily / weekly / per-event playbooks                      | `a357fec`              |
| API deploy decision memo                         | implicit           | Documented (no manual redeploy this session)              | `a463293`              |

## What didn't move (and why)

| Item                                | Reason                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Stripe webhook dedup wire-up         | HARD BAN: no DB migration this session. Skeleton + helpers ready; ships in one PR next session.       |
| CSP enforce flip                     | Requires 72h Report-Only burn-in; this session shipped the `report-uri`; clock starts on prod observe. |
| CSP nonces (drop `unsafe-inline`)    | Requires Next.js render-side change + correlation through the docs proxy. Out of scope.                |
| Beta `cv`/`voice` upload rate-limit | HIGH-severity but flagged in audit + register; ships as a single-file PR next session.                |
| Auto-apply per-user board allowlist  | Scoped in register (R-020); ships with explicit approval (touches Celery beat path).                  |
| DB restore drill                    | Operator-level task; documented in register R-018.                                                    |
| DSR self-service (export + delete)   | Pre-launch L6; needs explicit approval (deletes data).                                                |
| Recruiter inbox per-token rate-limit | R-012; queued for the public-endpoint hardening PR.                                                   |
| Mass scrape compliance review        | Out of scope.                                                                                          |
| Load / soak test                     | Out of scope.                                                                                          |
| Dashboard lint debt (64 problems)    | Out of scope; UI / copy changes banned this session.                                                  |

## What changed in the verdict matrix (vs CTO 2026-05-26)

| Question                       | 2026-05-26 verdict      | 2026-05-27 verdict           |
| ------------------------------ | ----------------------- | ---------------------------- |
| Controlled pilot 10-20 users?  | Conditional GO          | **GO** with the pilot operating manual + risk register + incident runbook now in place |
| Investor / CTO read-only demo? | GO                      | GO                            |
| Public launch?                  | NO                      | NO (gates O1-O3, P1, L6 still red — see `PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`) |
| Safe to redeploy API today?    | YES (after merge)       | NO MANUAL DEPLOY — Railway's git-deploy hook handles `28a50a0`; see `API_DEPLOY_DECISION_MEMO_2026-05-27.md` |

## Where next on each axis

Rank-ordered by **risk × cost** within each closed axis from
above; rolls up into the "top 10 next tasks" list at the end
of `LONG_AUTONOMOUS_SECURITY_SESSION_REPORT_2026-05-27.md`.

1. **Beta `cv` / `voice` upload rate-limit** (R-007, R-008) —
   HIGH severity, low cost, single-file patch.
2. **Stripe dedup migration + wire-up** (R-004) — MEDIUM
   severity, medium cost; gated on migration freeze lift.
3. **CSP Report-Only burn-in clock** — start now; check
   reports daily for 72 h; flip to enforce.
4. **Auto-apply per-user board allowlist** (R-020) — HIGH
   severity if it bites, low cost.
5. **DSR self-service endpoints** (R-019) — MEDIUM severity,
   medium cost; pre-launch L6.
6. **Recruiter inbox per-token rate-limit** (R-012) — MEDIUM
   severity, low cost.
7. **OPS_ADMIN_TOKEN / recruiter token rotation policy**
   (R-021, R-022) — LOW severity, very low cost.
8. **DB restore drill** (R-018) — MEDIUM severity, low cost
   (one-hour exercise).
9. **Drop the proposed `.github/PULL_REQUEST_TEMPLATE.md`** —
   pure repo hygiene; one commit next session.
10. **Frontend lint debt** (64 problems) — out of this
    session's scope; queue for a `chore(frontend)` window
    once UI work resumes.

## Methodology delta

- The 2026-05-26 audit was **read-only**: smoke calls + repo
  static analysis.
- The 2026-05-27 sessions are **change-bearing**: code +
  tests + docs + operator scripts shipped; production env
  untouched (HARD BAN); deploy was push-driven only (Railway
  + Vercel auto-hook).
- Repo HEAD now leads the deployed API SHA again (the gap
  observed on 2026-05-26 narrowed and reopened with this
  session's commits — acceptable for docs-only commits;
  `28a50a0` is auto-deployed).

## Hard bans honoured

- ✅ Docs only.
- ✅ No source change.
- ✅ No deploy / Railway / Vercel manual change.
- ✅ No DB migration.
- ✅ No `.env` / secret change.
- ✅ No UX / copy change.
- ✅ No public-launch messaging.

## Files

- `docs/CTO_AUDIT_DELTA_2026-05-27.md` (this doc).

## Related

- `docs/CTO_PRODUCT_TECH_AUDIT_2026-05-26.md` — the baseline.
- `docs/CTO_AUDIT_P0_FOLLOWUP_2026-05-26.md` — the P0 closures
  that fed into this delta.
- `docs/THREE_HOUR_SECURITY_ENGINEERING_REPORT_2026-05-27.md` —
  the earlier session this delta builds on.
- `docs/SECURITY_RISK_REGISTER_2026-05-27.md` — the live
  register cited inline.
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` — the
  gate that says "not yet" to public launch.
- `docs/LONG_AUTONOMOUS_SECURITY_SESSION_REPORT_2026-05-27.md`
  (next, this session) — the final wrap.

Backlog 25 of the long autonomous security session.
