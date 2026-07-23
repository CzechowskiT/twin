# TWIN RC1 Controlled Pilot Pack — 2026-07-23

**Verdict target:** A only if §24 complete; else B (support ownership / DNS).  
**Frozen:** Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED.

## Index

| Doc | Role |
|-----|------|
| `docs/PRODUCTION_TOPOLOGY_RC1.json` | Machine topology + stance |
| `docs/RC1_SECTION_24_CHECKLIST.md` | Flip gate |
| `docs/RC1_ON_CALL_ROSTER.md` | Role placeholders |
| `docs/RC1_SYNTHETIC_PILOT_IDENTITIES.md` | Invite-only identities |
| `docs/RC1_DOMAIN_DNS_FOUNDER_ACTION.md` | Afternic → Vercel DNS |
| `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` | Daily ops |
| `docs/O7_RESTORE_DRILL_EVIDENCE_2026-07-23.md` | Backup/restore (staging) |
| `docs/LAUNCH_DAY_MONITORING_ROLLBACK_RUNBOOK_2026-06-04.md` | Rollback |
| `scripts/rc1-prod-e2e-smoke.py` | Persona E2E |
| `scripts/rc1-security-gate.sh` | Security honesty gate |
| `frontend/scripts/production-topology-rc1-guard.test.ts` | CI drift guard |

## Operational URLs

- FE: `https://twin-sooty.vercel.app`  
- API: `https://twin-production-bcd9.up.railway.app`  
- Preferred (blocked by Afternic): `https://twin.care` / `https://app.twin.care`

## Feedback channel

Pilot feedback: mailto `contact@twin.care` + in-app notifications. No public signup form.

## Perf / a11y / browser

Existing guards remain source of truth (`test:wave-critical-i18n-a11y-guard`, Playwright prod smokes). RC1 does not broaden feature surface.
