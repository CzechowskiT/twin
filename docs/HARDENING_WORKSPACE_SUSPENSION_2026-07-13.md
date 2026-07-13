# Hardening track — workspace suspension (2026-07-13)

> **Mode:** policy doc + negative test matrix — no LIVE suspension flip

## Policy

Recruiter workspace suspension blocks:

- Inbox decisions  
- Notification prefs writes  
- Saved view mutations  

Read-only surfaces (C5 timeline) remain visible for audit continuity.

## Test stance

Covered indirectly via recruiter token auth tests in #451 batch (`backend/tests/test_recruiter_tenancy.py` when present).

**Status:** PENDING product slice — documented for next batch.
