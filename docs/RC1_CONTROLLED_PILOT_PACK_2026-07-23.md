# TWIN RC1 Controlled Pilot Pack — 2026-07-23

**Verdict:** `A_CONTROLLED_PILOT_OPERATIONAL` — Pilot `READY_FOR_CONTROLLED_PILOT`.  
**Frozen:** Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED · Gate F PASS.

## Index

| Doc | Role |
|-----|------|
| `docs/PRODUCTION_TOPOLOGY_RC1.json` | Machine topology + stance |
| `docs/RC1_SECTION_24_CHECKLIST.md` | Flip gate (§24 green) |
| `docs/RC1_ON_CALL_ROSTER.md` | Primary Tomasz + secondary `contact@twin.care` |
| `docs/RC1_SYNTHETIC_PILOT_IDENTITIES.md` | Invite-only identities |
| `docs/RC1_DOMAIN_DNS_FOUNDER_ACTION.md` | Afternic → Vercel DNS (non-blocking) |
| `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` | Daily ops |
| `docs/O7_RESTORE_DRILL_EVIDENCE_2026-07-23.md` | Backup/restore (staging) |
| `docs/LAUNCH_DAY_MONITORING_ROLLBACK_RUNBOOK_2026-06-04.md` | Rollback |
| `scripts/rc1-prod-e2e-smoke.py` | Persona E2E |
| `scripts/rc1-security-gate.sh` | Security honesty gate |
| `frontend/scripts/production-topology-rc1-guard.test.ts` | CI drift guard |

## Operational URLs

- **TEMPORARY_PILOT_CANONICAL_URL / FE:** `https://twin-sooty.vercel.app`  
- API: `https://twin-production-bcd9.up.railway.app`  
- Preferred (Afternic NS parks apex — non-blocking): `https://twin.care` / `https://app.twin.care`

## Ownership

- Primary / escalation / rollback: Tomasz Czechowski  
- Secondary: role-based monitored `contact@twin.care` → escalates to Tomasz

## Feedback channel

Pilot feedback: mailto `contact@twin.care` + in-app notifications. Invite-only registration; no public signup / mass enrollment.

## Perf / a11y / browser

Existing guards remain source of truth (`test:wave-critical-i18n-a11y-guard`, Playwright prod smokes). RC1 does not broaden feature surface.
