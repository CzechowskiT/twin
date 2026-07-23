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
| _(empty)_ | — | — | No Founder-approved real org in DB at OS ship |
| `nova-hiring-pl` | synthetic demo only | **NO** | Topology / recruiter smoke identity |

## Selection criteria (human)

1. Real PL desk employer with recruiting need  
2. Named recipients (recruiter + optional hiring manager)  
3. Consent to invite-only controlled pilot (not public launch)  
4. Agree to temporary canonical URL `https://twin-sooty.vercel.app` until DNS  
5. Contact path escalates to Tomasz / `contact@twin.care`

## Gate

Invites and pack send require `FOUNDER_APPROVED` + non-synthetic + named recipients.  
API: `POST /api/v1/admin/pilot-os/organizations/{id}/approve`
