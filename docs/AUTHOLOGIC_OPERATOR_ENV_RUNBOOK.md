# Authologic KYC — operator env runbook

**Purpose:** Exact environment variable names required by code for `plat_identity_kyc` / Authologic Customer API.  
**Never paste secret values.** No fake placeholders that look like credentials.

Stance unchanged: Pilot `BLOCKED_BY_FOUNDER` · Launch `NO-GO` · Enrollment OFF · Phase 3B `BLOCKED`.

Code source: `backend/app/config.py` (`authologic_*`) + `backend/app/services/authologic_client.py`.

---

## Exact env var names

| Variable | Purpose | Required for LIVE KYC start |
|----------|---------|------------------------------|
| `AUTHOLOGIC_API_BASE_URL` | Customer API base URL (sandbox or prod) | **yes** |
| `AUTHOLOGIC_API_LOGIN` | HTTP Basic username | **yes** |
| `AUTHOLOGIC_API_KEY` | HTTP Basic password / API key | **yes** |
| `AUTHOLOGIC_STRATEGY` | Conversation strategy id (default in code: `public:default`) | yes (has code default) |
| `AUTHOLOGIC_SERVER_PUBLIC_URL` | Absolute public API URL for CreateConversation `callbackUrl` | optional but recommended |
| `AUTHOLOGIC_CALLBACK_TOKEN` | Shared secret for `?token=` on KYC callback routes | optional |

Configured only when `AUTHOLOGIC_API_BASE_URL`, `AUTHOLOGIC_API_LOGIN`, `AUTHOLOGIC_API_KEY`, and `AUTHOLOGIC_STRATEGY` are all non-empty (`is_authologic_configured`).

---

## Operator steps

1. Obtain sandbox credentials from Authologic (https://developer.authologic.com) — out of band.
2. Set the variables above on Railway API service (`twin`). Worker only if it calls Authologic (today: API owns KYC).
3. Redeploy API. Do not commit values.
4. Smoke: authenticated KYC start path; confirm no auto-KYC without `plat_authologic_auto_kyc` controls.
5. Auto-KYC (`plat_authologic_auto_kyc`) stays OFF until Founder RELEASE_WITH_CONTROLS after keys + manual-first path.

---

## Cursor vs human

| Step | Cursor | Human |
|------|--------|-------|
| Document exact names | done | — |
| Create Authologic account / keys | cannot | **required** |
| Set Railway env | can apply if values provided out-of-band | provide values |
| Fake PASS without keys | **forbidden** | — |
