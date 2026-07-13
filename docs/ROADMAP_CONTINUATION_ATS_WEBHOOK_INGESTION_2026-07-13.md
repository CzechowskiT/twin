# Roadmap continuation — ATS webhook ingestion (post-stable)

> **Status:** SPEC ONLY · **Implementation:** blocked until stable release

## Intent

Employer one-click attestation + ATS webhooks for placement verification (see `docs/PLACEMENT_VERIFICATION.md`) — reduce manual email ping-pong.

## Preconditions

1. Placement state machine stable on prod  
2. Security matrix sign-off for inbound webhook auth  
3. B2B pilot with single ATS vendor

## Hard bans (unchanged)

- No blind ATS writeback from recruiter waves  
- No success-fee CS tennis threads as primary path
