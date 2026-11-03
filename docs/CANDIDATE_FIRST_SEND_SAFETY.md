# Candidate-First send-safety

**Never sends mail.** Endpoint: `GET /api/v1/admin/pilot-os/candidate-first/invitation-packs/{id}/send-safety`

## Required for `allowed=true`

- Non-synthetic cohort  
- Cohort `FOUNDER_APPROVED` + approval/basis refs  
- Pack status `READY_UNSENT`  
- ≥1 recipient (masked)  
- Enrollment OFF  
- Invite-only ON  
- Separate `founder_send_approval_ref` ≥8 at evaluation time  

## Frozen

Launch NO-GO · Phase 3B BLOCKED · mass outreach FORBIDDEN · auto-apply OFF · ALTEN org pack NOT_PREPARED · no org tenant required
