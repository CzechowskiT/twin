# First Customer Success Checklists — Controlled Pilot

**Stance:** Pilot READY · Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED  
**KPI until real org:** `NO_REAL_PILOT_DATA`  
**Canonical URL:** https://twin-sooty.vercel.app

## A. Founder — before invites

| # | Checkpoint | Done? |
|---|------------|-------|
| 1 | Select real employer (not `nova-hiring-pl`) | |
| 2 | Name ≥1 recipient emails | |
| 3 | `FOUNDER_APPROVE` via `/admin/pilot-os` or CLI | |
| 4 | Prepare invitation pack → `READY_UNSENT` | |
| 5 | Send only with `founder_send_approval_ref` | |
| 6 | Confirm on-call primary/secondary CONFIGURED | |
| 7 | Open support channel (`contact@twin.care`) | |
| 8 | Status CLI: `python scripts/controlled-pilot-os-status.py` | |

## B. Customer — first login (recruiter / company admin)

| # | Checkpoint | Done? |
|---|------------|-------|
| 1 | Open invite link on twin-sooty (or twin.care after DNS) | |
| 2 | Register/login with invite-only email | |
| 3 | Accept GDPR / ToS / job-data / AI matching consents | |
| 4 | Complete company/recruiter onboarding | |
| 5 | Reach inbox or company home without error | |
| 6 | Connect calendar (Google) or download ICS fallback | |
| 7 | Submit one feedback (bug/suggestion/NPS) if friction | |

## C. Candidate (if in same cohort)

| # | Checkpoint | Done? |
|---|------------|-------|
| 1 | Invite-only register | |
| 2 | Onboarding + profile | |
| 3 | First match visible | |
| 4 | Optional: first application | |

## D. Success milestones (controlled pilot — not Launch GO)

| Milestone | Signal |
|-----------|--------|
| M1 First login | funnel `signup_completed` / session |
| M2 Onboarding done | `onboarding_completed` |
| M3 First useful action | inbox view / first match / company home |
| M4 Feedback or support path known | ticket or feedback row |
| M5 Week-1 review | playbook day 7 |

## E. Admin ops daily (15 min)

1. `GET /api/v1/admin/pilot-os/status` or CLI  
2. Open support tickets / SLA breach  
3. Feedback queue (open / high priority)  
4. Health `rc1_*` + worker active  
5. Do **not** flip Launch / Enrollment / Phase 3B

## Exact Founder actions (now)

1. Approve first real pilot organization + recipients.  
2. Prepare + send invitation pack with explicit approval ref.  
3. Monitor first-week playbook.

## Exact customer actions (after invite)

1. Login on operational URL.  
2. Complete consents + onboarding.  
3. Use primary workflow (inbox / matches).  
4. Contact support or leave in-app feedback if blocked.
