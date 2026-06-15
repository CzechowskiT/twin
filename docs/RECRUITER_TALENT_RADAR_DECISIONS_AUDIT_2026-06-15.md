# Recruiter Talent Radar — Decisions Persistence + Audit Trail

**Date:** 2026-06-15  
**Status:** Implemented (pilot)  
**Scope:** Company-scoped recruiter workspace; no email send; no auto outreach.

## Summary

Talent Radar actions are now persisted in `recruiter_talent_radar_decisions` and mirrored into the existing append-only `recruiter_audit_events` ledger. Recruiters can shortlist, snooze (7/30/90 days), dismiss (category reason), prepare drafts (audit-only), and open review cards (audit-only).

## Actions

| Action | Persists state | Audit event | Notes |
|--------|----------------|-------------|-------|
| `shortlisted` | Yes | `radar_shortlisted` | Visible under Shortlisted filter |
| `snoozed` | Yes | `radar_snoozed` | Hidden from Active until `snooze_until` |
| `dismissed` | Yes | `radar_dismissed` | Reason = category code only (no free text) |
| `draft_prepared` | Row logged | `radar_draft_prepared` | Does not change filter bucket |
| `review_card_opened` | Row logged | `radar_review_card_opened` | Does not change filter bucket |

**Hard bans preserved:** no launch GO changes, no automatic outreach, no email send from radar UI.

## Database

- **Migration:** `058_recruiter_talent_radar_decisions`
- **Table:** `recruiter_talent_radar_decisions`
  - `application_id`, `company_slug`, `action_type`, `meta_json`, `snooze_until`, `created_at`
- **ORM:** `RecruiterTalentRadarDecision`

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/recruiter/talent-radar/decisions` | Record a decision |
| `GET` | `/api/v1/recruiter/talent-radar/decisions` | List latest decisions (optional `decision_filter`, `application_id`) |
| `GET` | `/api/v1/recruiter/talent-radar` | Each suggestion includes `latest_decision` |
| `GET` | `/api/v1/recruiter/talent-radar/digest` | Weekly digest summary (2026-06-15) — dashboard only, no email |

Auth: same recruiter token + `company_slug` as inbox.

### POST body

```json
{
  "application_id": 123,
  "action_type": "snoozed",
  "snooze_days": 30,
  "dismiss_reason_code": "low_fit",
  "meta": { "source": "talent_radar" }
}
```

- `snooze_days`: required for `snoozed` — must be `7`, `30`, or `90`
- `dismiss_reason_code`: required for `dismissed` — one of `wrong_role`, `low_fit`, `timing`, `already_contacted`, `other`

## Frontend

- **BFF:** `/api/recruiter/talent-radar/decisions` (GET/POST proxy)
- **Page:** `/recruiter/talent-radar`
  - Decision filter bar: Active / Shortlisted / Snoozed / Dismissed
  - Snooze + dismiss modals
  - **Draft modal** (2026-06-15 fix): loading → visible panel → copy/close/review card; audit `draft_prepared` with radar snapshots (no message body)
  - **Visual polish** (2026-06-15): `bg-slate-950/85` + `backdrop-blur-md` overlay; solid modal panel; copy-only badge; grouped card chips; nested details panel; trust footer
  - Optimistic UI + toast confirmations
  - Badges on candidate cards
- **Weekly digest** (2026-06-15): `/recruiter/talent-radar/digest` — aggregates decisions + radar signals; deduplicated sections (max 5), draft aggregation per candidate; copy-only summary; `test:recruiter-talent-radar-weekly-digest-premium`; see `docs/RECRUITER_TALENT_RADAR_WEEKLY_DIGEST_2026-06-15.md`
- **i18n:** PL + EN under `recruiterTalentRadar.*` and `recruiterAudit.actionRadar*`

## Audit trail

Radar actions append to `recruiter_audit_events` via `log_recruiter_audit_event`. Allowed meta keys extended with `snooze_days` and `dismiss_reason_code`. No PII, no decline notes, no message bodies.

## Tests

| Suite | Command |
|-------|---------|
| Frontend decisions (15 cases) | `npm run test:recruiter-talent-radar-decisions` |
| Frontend draft action (14 cases) | `npm run test:recruiter-talent-radar-draft-action` |
| Frontend visual polish (12 cases) | `npm run test:recruiter-talent-radar-visual-polish` |
| Frontend weekly digest (17 cases) | `npm run test:recruiter-talent-radar-weekly-digest` |
| Frontend radar MVP | `npm run test:recruiter-talent-radar-mvp` |
| Backend decisions | `pytest tests/test_recruiter_talent_radar_decisions.py -q` |
| Backend audit trail | `pytest tests/test_recruiter_audit_trail.py -q` |

## Files touched

**Backend:** migration 058, `models.py`, `recruiter_talent_radar_decisions.py`, `recruiter_audit_trail.py`, `recruiter_talent_radar.py`, `api/recruiter.py`, tests.

**Frontend:** `recruiter-talent-radar-decisions.ts`, BFF route, decision filter/modals, client + card updates, `i18n.ts`, `recruiter-audit-trail.ts`, test script.

## Verification checklist

1. Load radar with valid token + company slug
2. Shortlist a candidate → appears under Shortlisted filter with badge
3. Snooze 7d → hidden from Active, visible under Snoozed
4. Dismiss with reason → visible under Dismissed
5. Prepare draft → modal opens (title includes “nie wysłano” / “not sent”), **copy-only badge**, strong overlay (no card bleed-through), copy primary / review secondary / close tertiary; badge **Szkic przygotowany — nie wysłano** on success; audit row `draft_prepared` with radar snapshots (no message body). On audit failure: local draft + warning.
6. Open review card → audit row logged
7. Confirm no send-email CTA anywhere on radar page
