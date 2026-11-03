# Wave 2 Recruiter module prod smoke evidence

**Date:** 2026-07-21  
**SHA:** `d64e9bbe812ae1ac0bfe73399b03a4b0162c3d55`  
**Alembic:** `089_recruiter_wave2_hard_live`  
**Alignment:** FE+API public-health match @ `d64e9bbe`

## Command

```bash
cd frontend
# Use Railway prod RECRUITER_INBOX_TOKEN (never commit)
TWIN_PROD_SMOKE_WRITE=1 WAVE2_SMOKE_MODULES=all \
  npm run test:wave2-recruiter-module-prod-smoke
```

## Result

| Suite check | Result |
|-------------|--------|
| 0 harness | PASS |
| 1 unauth | PASS |
| 2 enrollment blocked | PASS (`BLOCKED_BY_FOUNDER`, enrollment false) |
| 3 per-module auth | **PASS 20/20** |

No JWT printed. No real outbound email. No ATS write. No calendar invites to humans. Demo fixture subject IDs rejected.
