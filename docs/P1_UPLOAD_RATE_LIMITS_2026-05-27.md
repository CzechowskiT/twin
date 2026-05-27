# P1 Upload rate limits — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`  
**Runtime commit:** `ff22f3a` (`fix(security): wire Stripe webhook dedup and upload rate limits`)

## Summary

Public beta waitlist file uploads and authenticated candidate CV /
intro-audio uploads now carry **SlowAPI** caps. Size limits were
already enforced via `Settings` (`beta_upload_max_bytes`,
`cv_max_bytes`); this slice adds **request-frequency** gates.

## Limits shipped

| Endpoint | Auth | Key | Limit | Test file |
| -------- | ---- | --- | ----- | --------- |
| `POST /api/v1/beta/waitlist/{code}/cv` | referral code | IP | 10/min | `test_beta_waitlist_upload_rate_limit.py` |
| `POST /api/v1/beta/waitlist/{code}/voice` | referral code | IP | 10/min | (same family — CV test is representative) |
| `POST /api/v1/candidates/me/cv` | JWT | `user_or_ip_key` | 20/min | — |
| `POST /api/v1/candidates/me/intro-audio` | JWT | `user_or_ip_key` | 20/min | — |

## Still unbounded (documented gaps)

| Endpoint | Why deferred |
| -------- | ------------ |
| `POST /api/v1/candidates/me/profile-documents` | Needs product cap discussion (multi-doc uploads) |
| `POST /api/v1/investor/data-room/uploads` | NDA-gated; low traffic; presign path separate |
| `POST /api/v1/investor/data-room/uploads/{id}/file` | Local-dev only when S3 off |

## Rollback

Revert `ff22f3a` decorators on `beta_waitlist.py` and
`candidates.py`. No migration, no env vars.

## Verify

```bash
cd backend && pytest tests/test_beta_waitlist_upload_rate_limit.py -q
```
