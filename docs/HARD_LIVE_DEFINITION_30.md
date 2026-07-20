# Hard LIVE definition (30 criteria)

**Canonical.** A capability may be marked **LIVE** only when **all applicable** criteria PASS. Mark **N/A** only with a one-line justification (e.g. “no mutations — read-only marketing page”).

**Date:** 2026-07-20  
**Stance:** Pilot **BLOCKED_BY_FOUNDER** · Gate F **PENDING** · Launch **NO-GO** · PMF **INSUFFICIENT_DATA**

## Criteria (1–30)

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | Route or API exists in production deploy (not orphan fixture) | Public URL or authenticated path on prod |
| 2 | Backend handler registered on prod API router | Code + Railway deploy SHA |
| 3 | ORM model(s) exist when persistence claimed | `models.py` |
| 4 | Alembic migration applied on prod when new tables/columns | Alembic head matches Railway |
| 5 | Authn required for private surfaces | 401 without token |
| 6 | Authz / role check for persona boundary | Wrong role → 403 |
| 7 | Tenancy isolation where multi-tenant | Cross-tenant read/write blocked |
| 8 | Real persistence on create/update (not localStorage-only) | DB row survives reload |
| 9 | Reads return persisted data (not hardcoded demo fixture as sole source) | Prod smoke |
| 10 | Mutations enabled in production (submit not permanently disabled) | UI + API |
| 11 | Idempotency or safe retry for money/placement/consent writes | Tests |
| 12 | Append-only audit or domain event for sensitive mutations | `audit_events` / platform events |
| 13 | Feature flag default documented; prod value known | Flag registry |
| 14 | No “LIVE” badge on preview/demo/sample/mocked paths | UI copy + activation registry |
| 15 | External integration truly connected when claimed (OAuth/webhook) | public-health or smoke |
| 16 | Worker/Celery path exercised when async claimed | Task success log or test |
| 17 | Observability: structured log or metric for critical path | Log/metric name |
| 18 | Error path returns safe, localized message (no stack/secrets) | API + i18n |
| 19 | Privacy: consent gate for PII processing where required | Consent timestamp |
| 20 | Export/deletion path exists or documented DSR SLA for PII modules | Trust/privacy ops |
| 21 | No fixture/demo IDs (`demo-candidate-001`) as production truth | Code review |
| 22 | Automated tests cover happy path + auth failure | pytest / frontend guard |
| 23 | CI green on merge commit | GitHub Actions |
| 24 | Aligned prod FE+API SHA (or acceptable docs-only drift) | public-health |
| 25 | Authenticated prod smoke PASS for the module | Smoke script/report |
| 26 | Rollback documented (flag off / migration reverse / prior deploy) | Ops pack |
| 27 | Owner + on-call path named | Capability map owner |
| 28 | No hard-ban conflict (ATS live-sync, Stripe public, auto-apply, MS write) | Hard-ban registry |
| 29 | i18n: no raw user-facing literals outside locale system | `t()` / backend locale |
| 30 | Acceptance criteria in capability map row satisfied | Map `LIVE criteria` column |

## Forbidden LIVE claims

- Screens/routes without persistence
- Fixtures / demo journeys / sample data as sole backend
- Read-only mocks with disabled submits
- Flag-off or INTERNAL_ONLY surfaces
- “Coming soon” / COMING_SOON integrations
- Docs-only or Notion-only workflows

## Status vocabulary (unchanged)

`LIVE | LIVE_BEHIND_FLAG | PILOT | PARTIAL | INTERNAL_ONLY | DEMO_ONLY | PAUSED | BLOCKED | DEPRECATED | NOT_BUILT | REJECTED`
