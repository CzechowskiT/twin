# Pilot org selection workspace

**Rule:** Never invent customers. Synthetic `nova-hiring-pl` is **not** eligible for `FOUNDER_APPROVED` real-pilot path.

## Approval statuses

| Status | Meaning |
|--------|---------|
| `CANDIDATE` | Named for consideration; no invites |
| `FOUNDER_APPROVED` | Founder approved + ≥1 named recipient |
| `REJECTED` | Explicitly rejected |
| `WITHDRAWN` | Withdrawn after candidate |

## Current workspace (repo truth)

| Slug | Status | Real? | Notes |
|------|--------|-------|-------|
| _(empty)_ | — | — | No Founder-approved real org in DB |
| `nova-hiring-pl` | synthetic demo only | **NO** | Topology / recruiter smoke identity |

## Founder intake (complete approval)

Required before `FOUNDER_APPROVED` (API + `/admin/pilot-os`):

| Field | Min | Notes |
|-------|-----|-------|
| `slug` / `display_name` | yes | Candidate create |
| `legal_name` | ≥2 | Legal entity name |
| `sponsor_label` | ≥2 | Named sponsor |
| `approved_by_label` | ≥2 | Who approved |
| `founder_org_approval_ref` | ≥8 | Explicit org approval reference |
| `recipient_emails` | ≥1 | Named invitees (masked in UI) |

Separate **send** gate: `founder_send_approval_ref` ≥8 + `GET …/send-safety` PASS. Pack stays `READY_UNSENT` until then.

See `docs/FIRST_REAL_PILOT_ACTIVATION.json`.

## Selection criteria (human)

1. Real PL desk employer with recruiting need  
2. Named recipients (recruiter + optional hiring manager)  
3. Consent to invite-only controlled pilot (not public launch)  
4. Agree to temporary canonical URL `https://twin-sooty.vercel.app` until DNS  
5. Contact path escalates to Tomasz / `contact@twin.care`

## Gate

Invites and pack send require `FOUNDER_APPROVED` + non-synthetic + named recipients.  
API: `POST /api/v1/admin/pilot-os/organizations/{id}/approve`
