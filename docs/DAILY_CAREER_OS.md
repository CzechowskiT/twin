# Daily Career Operating System (Epic 1.2)

**Status:** Continuous career copilot — not an autonomous agent  
**Alembic:** `109_daily_career_os`  
**API:** `/api/v1/candidates/me/career-copilot/daily*`  
**UI:** `/dashboard` (above fold) + `/dashboard/career`  
**Extends:** Career Copilot 2.0 + Adaptive Career Intelligence  
**Phase 3 Autonomous Career Agent:** NOT STARTED  

## Mission

Answer every day: what changed, what matters, next action, what am I neglecting, opportunity shifts, goal progress, what to review/prepare/learn/decide — with evidence, dismiss/snooze/complete, no external auto-action.

## Architecture

```
career_copilot (2.0) → career_copilot_adaptive (1.1) → career_daily_os (1.2)
GET /me/career-copilot → build_daily_os_aggregate (includes adaptive + daily)
```

## Models (Alembic 109)

| Table | Role |
|-------|------|
| `candidate_daily_briefs` | Persistent daily brief |
| `candidate_career_change_events` | Evidence-only diffs |
| `candidate_career_inbox_items` | Career inbox + fatigue |
| `candidate_career_inbox_audits` | Append-only audit |
| `candidate_career_reminders` | In-product (+ email opt-in) |
| `candidate_opportunity_watchlist` | Watch roles/companies/… |
| `candidate_daily_cadence` | Quiet hours, caps, intensity |
| `candidate_daily_privacy_settings` | Disable learning/briefs/reminders |
| `candidate_recommendation_weights` | Versioned calibration |
| `candidate_momentum_snapshots` | Evidence momentum |
| `candidate_progress_reviews` | Weekly/monthly + approval |

## Safety

- No external auto-action / auto-submit / SMS / recruiter outreach  
- Market/salary/employer strategy → UNKNOWN without evidence  
- No mental health / protected attributes  
- `kpi_excluded: true`  
- Kill-switch graceful degradation  

## Stance

Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED · invite-only · Phase 3 Agent NOT_STARTED · candidate-first · synthetic ≠ real
