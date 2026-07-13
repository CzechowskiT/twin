# Public launch blocker register — 2026-07-13

> Append-only register. Each blocker must be **GREEN** or explicitly **WAIVED** with founder sign-off before public GO.

---

## P0 / launch-critical

| ID | Blocker | Severity | Owner | Status | Remediation |
|----|---------|----------|-------|--------|-------------|
| LB-001 | Gate F founder decision not recorded | P0 | Founder | **OPEN** | Complete Gate F checklist; record YES/NO in decision doc |
| LB-002 | Founder smoke credentials UNSET | P0 | Founder | **OPEN** | Set `DEMO_USER_PASSWORD` + recruiter token; run Wave B/C smoke runbooks |
| LB-003 | Wave B3 referrals not merged (#448) | P0 | Eng | **OPEN** | Merge train #449→#450→#448 after smoke PASS |
| LB-004 | Public launch stance `noGo` | P0 | Product | **OPEN** | Founder scoped launch decision §G checkboxes |
| LB-005 | Self-service account delete (R-019) | P1→P0 at scale | Eng | **PARTIAL** | API+UI shipped on #451 branch; prod deploy + founder smoke pending |

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
| LB-103 | Prod Alembic head behind train (070 vs 077) | P1 | **EXPECTED** | Execute release train merges + Railway migrate |
| LB-104 | No founder smoke PASS docs for C1–C5 | P1 | **OPEN** | Browser smoke per wave runbooks |

---

## Security / compliance

| ID | Blocker | Severity | Status | Remediation |
|----|---------|----------|--------|-------------|
| LB-201 | O7 post-scaffold DR re-drill | P1 | **OPEN** | Founder staging restore per `O7_RESTORE_DRILL_RUNBOOK_2026-06-11.md` |
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

**Register stance:** 6 OPEN · 5 FIXED/CLOSED · 1 PARTIAL · 2 WAIVED/ACCEPTED · Launch **NO-GO**
