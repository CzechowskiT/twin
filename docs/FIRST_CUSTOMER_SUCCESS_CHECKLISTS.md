# First Customer Success Checklists — Controlled Pilot

**Stance:** Pilot READY · Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED  
**KPI until real org:** `NO_REAL_PILOT_DATA`  
**Canonical URL:** https://twin-sooty.vercel.app  
**Control plane:** `/admin/pilot-os` · `GET /api/v1/admin/pilot-os/first-customer-success`  
**Machine:** `docs/FIRST_CUSTOMER_SUCCESS.json` · Phase 2 handoff only: `docs/PHASE2_PRODUCTION_HARDENING_HANDOFF.md`

## A. Founder — before invites

| # | Checkpoint | Done? |
|---|------------|-------|
| 1 | Select real employer (not `nova-hiring-pl` / schema probes) | |
| 2 | Complete intake: slug, display, legal, sponsor, recipients | |
| 3 | `data_processing_basis_ref` + success criteria label on approve | |
| 4 | `FOUNDER_APPROVE` via `/admin/pilot-os` (no send) | |
| 5 | Prepare invitation pack → `READY_UNSENT` (PL/EN pack embedded) | |
| 6 | Send-safety gate PASS only with `founder_send_approval_ref` ≥8 | |
| 7 | Confirm on-call primary/secondary CONFIGURED | |
| 8 | Open support channel (`contact@twin.care`) | |
| 9 | Status: Pilot OS First Customer panel or FCS API | |

## B. Customer — first 30 minutes (recruiter / company admin)

| # | Checkpoint | Done? |
|---|------------|-------|
| 1 | Open invite link on twin-sooty (or twin.care after DNS) | |
| 2 | Register/login with invite-only email | |
| 3 | Accept GDPR / ToS / job-data / AI disclosure | |
| 4 | Complete company/recruiter onboarding | |
| 5 | Create or open first role | |
| 6 | Add first authorized candidate | |
| 7 | Run Candidate Intelligence → open evidence | |
| 8 | Correction (if needed) → human accept/decline | |
| 9 | Company visibility / pipeline review | |
| 10 | Feedback or support if friction | |

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
| M1 First login | funnel activated ≥1 |
| M2 Onboarding done | onboarding_completed |
| M3 First role + candidate | real_roles ≥1, profiles ≥1 |
| M4 AI review + human decision | intelligence + human_reviews |
| M5 Company pipeline review | company_pipeline_reviews ≥1 |
| M6 Feedback | feedback ≥1 |
| M7 Week-1 review | weekly summary with real KPI |
| M8 Continuation | Founder records CONTINUE_*/PAUSE/STOP |

Default thresholds: `DEFAULT_SUCCESS_CRITERIA` in `first_customer_success.py` (pilot-only, not Launch GO).

## E. Admin ops daily (15 min)

1. `GET /api/v1/admin/pilot-os/first-customer-success` or Pilot OS UI  
2. Open support tickets / SLA breach  
3. Feedback queue  
4. Health + worker active  
5. Do **not** flip Launch / Enrollment / Phase 3B  
6. Do **not** invent orgs, CVs, or KPI  

## Exact Founder actions (now)

1. Approve first real pilot organization + recipients + basis refs.  
2. Prepare pack; send only with separate send approval ref.  
3. Monitor first-week playbook + weekly review.  
4. Record continuation decision when criteria allow.

## Exact customer actions (after invite)

1. Login on operational URL.  
2. Complete consents + onboarding.  
3. Role → candidate → AI intel → human decision.  
4. Contact support or leave in-app feedback if blocked.
