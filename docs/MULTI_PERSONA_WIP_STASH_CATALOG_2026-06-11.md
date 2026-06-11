# Multi-Persona WIP Stash Catalog — 2026-06-11

**Purpose:** Index local git stashes from the mixed multi-persona MVP orchestration so work can be recovered selectively without re-applying everything into the clean scaffold.

**Archive branch:** `wip/multi-persona-mvp-local-snapshot-2026-06-11` @ `1c35bce` (committed dirty tree before reset).

**Scaffold reference:** `origin/cursor/phase1-monorepo-scaffold` @ `cd4b698` (2026-06-11).

**Hot files (do not blind-merge):**

| File / area | Risk |
|---|---|
| `frontend/src/lib/i18n.ts` | Mass key additions; conflicts across all workstreams |
| `frontend/src/app/recruiter/inbox/recruiter-inbox-client.tsx` | Premium inbox UI — do not overwrite |
| `frontend/src/lib/overlays/premium/generated/*.ts` | Regenerated overlays; locale-specific |
| `backend/app/api/recruiter.py` | Shared recruiter API surface |
| `backend/app/services/recruiter_inbox.py` | Inbox service coupling |
| `backend/app/database/models.py` | ORM changes stack with migrations |
| `backend/alembic/versions/*.py` | Duplicate `051_*` revisions in WIP |

**Legend — recommendation:**

- **reuse** — cherry-pick or copy specific files after clean branch exists
- **inspect manually** — mixed persona/files; read diff before any apply
- **discard after confirmation** — superseded by archive branch or scaffold merges
- **split required** — multiple workstreams in one stash; never `git stash pop` wholesale

---

## Stashes 0–47 (multi-persona MVP program, 2026-06-11)

| Index | Branch | Persona | Likely workstream | Files (summary) | Migrations | Hot files | Recommendation |
|---|---|---|---|---|---|---|---|
| 0 | `feature/recruiter-scheduling-mvp-2026-06-11` | recruiter | Manual scheduling | `i18n.ts` (+48) | no | i18n | inspect manually |
| 1 | `feature/investor-room-mvp-2026-06-11` | mixed | Investor room + recruiter calendar | calendar, recruiter, router, models, inbox, i18n, premium/de | no | all hot | split required |
| 2 | `feature/recruiter-analytics-mvp-2026-06-11` | mixed | Analytics + inbox (duplicate of 1) | same as stash 1 | no | all hot | discard after confirmation |
| 3 | `feature/company-pipeline-quality-metrics-2026-06-11` | — | temp (empty) | — | no | — | discard after confirmation |
| 4 | `feature/company-billing-plan-usage-readiness-2026-06-11` | company | Billing + scheduling router | router, i18n | no | i18n | inspect manually |
| 5 | `feature/recruiter-compliance-audit-trail-mvp-2026-06-11` | — | empty | — | no | — | discard after confirmation |
| 6 | `feature/recruiter-compliance-audit-trail-mvp-2026-06-11-clean` | mixed | Pre-company-pipeline mix | calendar_microsoft, router, models, inbox, i18n, premium/fr | no | all hot | split required |
| 7 | `feature/recruiter-scheduling-mvp-2026-06-11` | company | Company team full WIP | docs matrices, package.json, i18n (+220), premium paths | no | i18n, premium | split required |
| 8 | `feature/recruiter-compliance-audit-trail-mvp-2026-06-11` | recruiter | Docs + calendar + inbox | calendar_microsoft, inbox, i18n (-91) | no | inbox, i18n | inspect manually |
| 9 | `feature/recruiter-compliance-audit-trail-mvp-2026-06-11` | company | Company team WIP | docs, inbox, premium paths | no | inbox, premium | inspect manually |
| 10 | `feature/company-pipeline-quality-metrics-2026-06-11` | company | Pipeline quality + inbox | package.json, inbox, i18n (+323), premium | no | inbox, i18n, premium | split required |
| 11 | `feature/recruiter-compliance-audit-trail-mvp-2026-06-11-clean` | recruiter | Audit trail MVP | calendar_microsoft, recruiter.py, models, inbox, i18n | no | recruiter, models, inbox | reuse (audit trail slice) |
| 12 | `feature/recruiter-scheduling-mvp-2026-06-11` | mixed | Scheduling + company dashboard | calendar, calendar_microsoft, docs, i18n (+225), premium | no | all hot | split required |
| 13 | `feature/company-jobs-roles-management-mvp-2026-06-11` | recruiter | Audit on jobs branch | recruiter.py, models, i18n | no | recruiter, models | inspect manually |
| 14 | `feature/recruiter-scheduling-mvp-2026-06-11` | recruiter | Scheduling subagent | router, models, inbox | no | models, inbox | inspect manually |
| 15 | `feature/recruiter-scheduling-mvp-2026-06-11` | recruiter | Audit cleanup | inbox only | no | inbox | discard after confirmation |
| 16 | `feature/company-billing-plan-usage-readiness-2026-06-11` | mixed | Billing + investor pages | recruiter, router, models, investor pages, i18n, persona-access | no | recruiter, i18n | split required |
| 17 | `feature/investor-data-room-request-access-2026-06-11` | mixed | Company dashboard + recruiter | recruiter, router, models, for-companies, i18n | no | recruiter, i18n | split required |
| 18 | `feature/company-jobs-roles-management-mvp-2026-06-11` | recruiter | Pre-scheduling final | recruiter, models, inbox service, i18n, premium/fr | no | all hot | split required |
| 19 | `feature/investor-room-mvp-2026-06-11` | investor | Block scheduling | router, i18n (-91), premium/fr | no | i18n, premium | inspect manually |
| 20 | `feature/company-team-permissions-mvp-2026-06-11` | company | All WIP before scheduling | docs, package.json, i18n (+327) | no | i18n | split required |
| 21 | `feature/company-team-permissions-mvp-2026-06-11` | company | Unrelated WIP | router, models, docs, persona-access | no | models | inspect manually |
| 22 | `fix/candidate-google-calendar-reconnect-loop-2026-06-11` | investor | Data room panel refactor | data-room page, investor-data-room-panel, i18n | no | i18n | reuse (data room slice) |
| 23 | `feature/company-jobs-roles-management-mvp-2026-06-11` | recruiter | Inbox persona hook | inbox, persona-access | no | inbox | inspect manually |
| 24 | `feature/company-jobs-roles-management-mvp-2026-06-11` | recruiter | Inbox revert | inbox (-34 lines) | no | inbox | discard after confirmation |
| 25 | `feature/investor-data-room-request-access-2026-06-11` | investor | Package bump | package.json, document-title-sync | no | — | inspect manually |
| 26 | `wip/recruiter-mvp-local-snapshot-2026-06-11` | mixed | Pre-scheduling i18n mass | docs, i18n (+396/-173) | no | i18n | split required |
| 27 | `feature/company-pipeline-quality-metrics-2026-06-11` | mixed | Calendar before roadmap | calendar.py, package.json, i18n | no | i18n | inspect manually |
| 28 | `feature/recruiter-scheduling-mvp-2026-06-11` | mixed | Scheduling + investor workspace | calendar, docs, investor page, i18n, premium/it | no | all hot | split required |
| 29 | `fix/candidate-google-calendar-reconnect-loop-2026-06-11` | candidate | Calendar fix i18n | i18n (+99) | no | i18n | inspect manually |
| 30 | `feature/recruiter-pipeline-mvp-2026-06-11` | mixed | Pipeline + data room | router, data-room, recruiter workspace, i18n, premium | no | all hot | split required |
| 31 | `feature/recruiter-integrations-readiness-2026-06-11` | recruiter | Scheduling on integrations | models (+32), i18n (+178) | no | models, i18n | inspect manually |
| 32 | `feature/company-billing-plan-usage-readiness-2026-06-11` | recruiter | Scheduling recruiter API | recruiter.py, i18n | no | recruiter, i18n | inspect manually |
| 33 | `feature/recruiter-compliance-audit-trail-mvp-2026-06-11` | recruiter | Notes/scorecards overlay | recruiter, i18n, premium/es, overlays ar/ja/zh | no | recruiter, i18n, premium | split required |
| 34 | `feature/investor-roadmap-founder-updates-2026-06-11` | mixed | Audit trail + roadmap i18n | calendar, models, inbox service, docs, i18n, premium/ja | no | all hot | split required |
| 35 | `feature/company-pipeline-quality-metrics-2026-06-11` | mixed | Applications + MS calendar + premium all | applications, router, schemas, microsoft_calendar_oauth, premium all locales | no | premium | split required |
| 36 | `feature/recruiter-pipeline-mvp-2026-06-11` | recruiter | Pipeline i18n | package.json, i18n (+210) | no | i18n | inspect manually |
| 37 | `feature/candidate-interview-prep-mvp-2026-06-11` | mixed | Company jobs mega mix | candidates, recruiter, router, models, investor pages, inbox (+127), i18n (+437), premium de/es | no | all hot | split required |
| 38 | `feature/recruiter-scheduling-mvp-2026-06-11` | recruiter | Audit stash | router, models, i18n (+388) | no | models, i18n | inspect manually |
| 39 | `feature/investor-roadmap-founder-updates-2026-06-11` | mixed | Audit trail mixed overlays | inbox, i18n, premium ar/fr/it/zh | no | inbox, i18n, premium | split required |
| 40 | `cursor/phase1-monorepo-scaffold` | mixed | Scheduling on scaffold | recruiter, router, models, inbox, docs, i18n, premium/es, persona-access | no | all hot | split required |
| 41 | `feature/recruiter-scheduling-mvp-2026-06-11` | recruiter | Candidate search paths | docs, premium paths | no | premium | inspect manually |
| 42 | `wip/recruiter-mvp-local-snapshot` | recruiter | Audit trail service full | recruiter, models, recruiter_audit_trail.py, inbox, i18n, premium/ja | no | recruiter, models, inbox | reuse (audit trail backend) |
| 43 | `feature/recruiter-pipeline-mvp-2026-06-11` | recruiter | JA overlay | package.json, i18n, premium paths | no | i18n, premium | inspect manually |
| 44 | `wip/recruiter-mvp-local-snapshot` | recruiter | JA premium only | premium/ja (+30) | no | premium | inspect manually |
| 45 | `feature/recruiter-notes-scorecards-mvp-2026-06-11` | mixed | **Orchestrator mega-stash** | duplicate `051_*`, `052_*`, `053_*`, `054_*` migrations + all recruiter services + tests + docs + frontend routes | **yes — duplicate 051/052** | migrations + all hot | **split required** — source for file-level cherry-pick only |
| 46 | `feature/recruiter-pipeline-mvp-2026-06-11` | recruiter | Pipeline inbox hook | inbox (+13) | no | inbox | inspect manually |
| 47 | `feature/candidate-interview-prep-mvp-2026-06-11` | — | empty | — | no | — | discard after confirmation |

---

## Stashes 48+ (pre-June-11 / unrelated)

Stashes `48`–`88` predate the 2026-06-11 multi-persona program (calendar alert fixes, vision slice, career assistant, billing layout, etc.). **Do not apply** during MVP recovery unless a specific older task is resurrected. Consult `git stash show stash@{N}` before any use.

Notable older entries:

| Index | Note |
|---|---|
| 48–51 | Calendar success alert contrast WIP (2026-06-10) |
| 52–67 | Scaffold CI, vision slice, demo snapshots |
| 68–88 | Career assistant, competitive features, OAuth, billing |

---

## Recovery workflow

1. **Never** `git stash pop` stashes marked **split required** onto `cursor/phase1-monorepo-scaffold`.
2. Prefer **`wip/multi-persona-mvp-local-snapshot-2026-06-11`** for full-file recovery over stashes.
3. For backend workstreams, follow `docs/ALEMBIC_WORKSTREAM_MIGRATION_PLAN_2026-06-11.md` — do not reuse WIP migration filenames.
4. For i18n/inbox/premium hot files, rebuild keys on the clean branch using workstream-scoped namespaces only.

---

## Counts

| Metric | Value |
|---|---|
| Total stashes in repo | 89 (`stash@{0}` … `stash@{88}`) |
| Multi-persona catalogued (this doc) | 48 (indices 0–47) |
| Empty / discard candidates | 4 (3, 5, 47, plus duplicates 1≈2) |
| Split required (high risk) | 18 |
| Contains Alembic migrations | 1 (stash 45 — **must not apply as-is**) |
