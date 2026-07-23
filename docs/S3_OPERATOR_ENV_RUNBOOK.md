# S3 / R2 data-room — operator env runbook

**Purpose:** Exact environment variable names required by code for S3-compatible storage (AWS S3, Cloudflare R2, MinIO).  
**Never paste secret values.** No fake placeholders that look like credentials.

Stance unchanged: Pilot `BLOCKED_BY_FOUNDER` · Launch `NO-GO` · Enrollment OFF · Phase 3B `BLOCKED`.

Code source: `backend/app/config.py` (`s3_*`) + `backend/app/services/s3_storage.py`.

---

## Exact env var names

| Variable | Purpose | Required for S3 LIVE |
|----------|---------|----------------------|
| `S3_BUCKET_NAME` | Bucket name | **yes** |
| `S3_ACCESS_KEY_ID` | Access key id | **yes** |
| `S3_SECRET_ACCESS_KEY` | Secret access key | **yes** |
| `S3_ENDPOINT_URL` | Endpoint (R2/MinIO); omit for default AWS | optional (required for R2/MinIO) |
| `S3_REGION` | Region (`auto` common for R2) | optional (code default `auto`) |

Storage enables only when `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_BUCKET_NAME` are all non-empty.

Local fallback when S3 unset (dev): `DATA_ROOM_LOCAL_UPLOAD_DIR` / `DATA_ROOM_LOCAL_UPLOAD_ENABLED` — not S3 LIVE.

Related alias sometimes scanned in audits: `S3_BUCKET` — **not** read by `s3_storage.py`; use `S3_BUCKET_NAME`.

---

## Operator steps

1. Create bucket + API token (Cloudflare R2 or AWS IAM least privilege).
2. Set the variables on Railway API (`twin`); worker if background uploads use the same store.
3. Redeploy. Confirm HeadBucket may fail on R2 while presigned PUT/GET still work (logged warning is OK).
4. Smoke: investor data-room upload/download path when Founder authorizes.

---

## Cursor vs human

| Step | Cursor | Human |
|------|--------|-------|
| Document exact names | done | — |
| Create bucket / keys | cannot | **required** |
| Set Railway env | can apply if values provided out-of-band | provide values |
| Fake PASS without keys | **forbidden** | — |

See also: `docs/FOUNDER_SECRETS_WHERE.md`, `docs/EXTERNAL_CONNECTOR_OPERATOR_HANDOFF.md` (Slack).
