# Public launch blocker register — 2026-07-13

> Append-only register. Each blocker must be **GREEN** or explicitly **WAIVED** with founder sign-off before public GO.

**Batch update 2026-07-14T12:00Z:** Closed batch — LB-104 **CLOSED** (C1–C5 per-module evidence complete); LB-201/LB-005 remain BLOCKED (O7/R-019 preflight UNSET); Gate F pack refreshed; PR #473 merge confirmed @ `874b8586`.

**Batch update 2026-07-14T09:30Z:** LB-106 **CLOSED** — canonical 60min stabilization soak GH run #29315813862 PASS (3731s, 13 snapshots, `identityDriftDetected=false`, `credentialsSet=true`, DB 077, `failReasons=[]`); evidence `reports/stabilization/29315813862/`; rejected drift run #29313170353; duplicate #29316738867 already completed (cancel N/A).

**Batch update 2026-07-14T06:45Z:** Closed batch — PR #471 merged @ `09b9963a`; guard #10 LIVE truth; verifier `credentialsSet=true` via dotenv; stabilization-monitor run #29312315268 PASS (54s, **superseded** by #29315813862 60min soak).

**Batch update 2026-07-14T04:35Z:** Founder Evidence Chain + Gate F Readiness — prod @ `ae14bfb58fc0`, DB 077, credentials SET, recruiter smoke PASS, candidate API PARTIAL, O7/R-019 BLOCKED.

---

## P0 / launch-critical

| ID | Blocker | Severity | Owner | Status | Remediation |
|----|---------|----------|-------|--------|-------------|
| LB-001 | Gate F founder decision not recorded | P0 | Founder | **OPEN** | Complete Gate F checklist; record YES/NO in decision doc |
| LB-002 | Founder smoke credentials UNSET | P0 | Founder | **CLOSED** | `preflight:founder-smoke-env` SET; `verify:production-v3:077` loads dotenv — `credentialsSet=true` @ 2026-07-14 |
| LB-003 | Wave B3 referrals not merged (#448) | P0 | Eng | **CLOSED** | PR #470 merged; Wave B/C guards 16/16 PASS @ `ad7944b8` |
| LB-004 | Public launch stance `noGo` | P0 | Product | **OPEN** | Founder scoped launch decision §G checkboxes |
| LB-005 | Self-service account delete (R-019) | P1→P0 at scale | Eng | **BLOCKED** | API on prod; no disposable test account in env — never founder/demo@twin.career |

---

## Release train

| ID | Blocker | Severity | Status | Remediation |
|----|---------|----------|--------|-------------|
| LB-101 | PR #452 mergeable | P1 | **CLOSED** | Rebased to `753ecf70` — MERGEABLE CLEAN |
| LB-102 | #451 remote CI frontend-build | P1 | **CLOSED** | All workflows green + Vercel Ready @ `e7a568ac` |
| LB-103 | PR #453 mergeable | P1 | **CLOSED** | Rebased to `934a48a7` — MERGEABLE CLEAN |
| LB-103b | PR #454 CONFLICTING | P1 | **CLOSED** | Rebased to `26f9da96` — MERGEABLE CLEAN |
| LB-103c | PR #455 stack | P1 | **CLOSED** | Rebased to `e36df2cb` — MERGEABLE CLEAN |
| LB-105 | Merge orchestrator drift #451 | P1 | **CLOSED** | #451 omitted from `EXPECTED_HEADS` — stops drift loop |
| LB-103 | Prod Alembic head behind train (070 vs 077) | P1 | **CLOSED** | Post-merge deploy `ead5b0a0` SUCCESS; prod `db_ok=true`; verifier `expect-077` PASS @ 2026-07-14 |
| LB-104 | No founder smoke PASS docs for C1–C5 | P1 | **CLOSED** | Per-module records @ `docs/FOUNDER_SMOKE_C1_C5_PER_MODULE_EVIDENCE_2026-07-14.md` — all C1–C5 PASS @ prod `a5f3f6ea`; aggregate `docs/FOUNDER_WAVE_BC_SMOKE_EVIDENCE_2026-07-14.md` |
| LB-106 | 60-minute prod stabilization soak evidence | P1 | **CLOSED** | GH run #29315813862 PASS — 3731s, 13 snapshots, `identityDriftDetected=false`, `credentialsSet=true`, DB `077_candidate_activity_timeline`, `failReasons=[]`; evidence `reports/stabilization/29315813862/stabilization-evidence-29315813862.{json,md}` |

---

## Security / compliance

| ID | Blocker | Severity | Status | Remediation |
|----|---------|----------|--------|-------------|
| LB-201 | O7 post-scaffold DR re-drill | P1 | **BLOCKED** | `RAILWAY_TOKEN`/`DATABASE_PUBLIC_URL` UNSET in agent env — founder staging restore per `O7_RESTORE_DRILL_RUNBOOK_2026-06-11.md` |
| LB-202 | L6 erasure self-service gap | P2 at pilot | **WAIVED** | Manual DSR runbook; re-verify before uncontrolled signup |
| LB-203 | No centralized log drains | P2 | **ACCEPTED** | Hobby plan; Dashboard/CLI; upgrade path documented |

---

## Code / quality (fixed this batch)

| ID | Blocker | Severity | Status | Fix |
|----|---------|----------|--------|-----|
| LB-301 | `release-train-v4-scenarios.ts` duplicate `headSha` | P1 | **FIXED** | Pushed on #451 |
| LB-302 | `/dashboard/trust` missing from route registries | P2 | **FIXED** | founder demo crosslinks |
| LB-303 | `CONTROLLED_PILOT_PRIMARY_LIMITS` drift | P1 | **FIXED** | 8/5/4 restored |
| LB-304 | R-019 self-service delete API | P1 | **FIXED** (branch) | `POST /candidates/me/delete-account` + live UI |
| LB-305 | R-019 static guard matrix incomplete | P2 | **FIXED** | Trust link marker + 25-test matrix @ `519ed956` |

---

## Hard bans (never flip without explicit founder GO)

- Stripe LIVE checkout
- ATS writeback / live sync
- Microsoft Calendar write
- Auto-apply execution
- External notification delivery (email/Slack)
- Product PR auto-merge without smoke PASS

---

## Waiver log

| ID | Item | Waiver | Expiry |
|----|------|--------|--------|
| WV-001 | L6 manual erasure | Signed 2026-06-03 | Until self-service delete ships |
| WV-002 | Phase 3B local execution | Disabled | Use isolated GH Actions runner only |

---

**Register stance:** 3 OPEN · 11 FIXED/CLOSED · 0 PARTIAL · 2 BLOCKED · 2 WAIVED/ACCEPTED · Launch **NO-GO**

---

## Path A operator handoff (2026-07-13T12:35Z)

Credentials **UNSET** — merge train and founder smoke **NOT executed** (no fake PASS).

When credentials SET, founder runs (in order):

1. `export DEMO_USER_PASSWORD=…` + `export RECRUITER_TOKEN=…`
2. `cd frontend && npm run preflight:founder-smoke-env && npm run preflight:founder-smoke-orchestration`
3. Wave B/C browser smoke with `PLAYWRIGHT_ALLOW_PROD_SMOKE=1` (evidence → `reports/founder-smoke/`)
4. Manual GitHub merge #449→#450→#448→#451→#452→#453→#454→#455 (NO auto-merge; CI wait after each)
5. Railway `alembic upgrade head` → 077
6. `npm run probe:prod-public && npm run verify:production-v3:077`
7. R-019 on **disposable** test account only
8. O7 Railway restore drill
9. Gate F decision

Rehearsal @ UNSET batch: `sim:integration-070-077` PASS @ 12:32Z · `plan:merge-train-extended` PASS · `probe:prod-public` 110/110 @ 12:32Z · `verify:production-v3:077` FAIL (prod head 072 on partial branch — expected until merge+migrate).

#462 demo (`e788dd9f`): axe 2/2 PASS re-verified @ 12:35Z; SHORT video exports ffprobe PASS; FULL 38.5s/108s NOT rendered; separate founder narrative approval; do not merge without sign-off.
