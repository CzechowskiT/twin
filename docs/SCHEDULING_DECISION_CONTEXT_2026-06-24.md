# Scheduling Decision Context — 2026-06-24

Read-only cross-surface layer linking offer readiness, placement verification, and calendar readiness.

## Status

| Item | Status |
|------|--------|
| Live scheduling | **NOT SHIPPED** |
| Calendar sync / event write | **BLOCKED** |
| Invite / email / notification | **BLOCKED** |
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |

## Surfaces

| Route | Surface key |
|-------|-------------|
| `/dashboard/offer-readiness` | `offer_readiness` |
| `/profile/offer-readiness` | `offer_readiness` |
| `/recruiter/offer-readiness` | `offer_readiness` |
| `/company/offer-readiness` | `offer_readiness` |
| `/board/offer-readiness` | `offer_readiness` |
| `/dashboard/placement-verification` | `placement_verification` |
| `/board/placement-verification` | `placement_verification` |
| `/dashboard/calendar/readiness` | `calendar_readiness` |
| `/board/calendar-readiness` | `calendar_readiness` |

## Tests

```bash
cd frontend
npm run test:scheduling-decision-context
```
