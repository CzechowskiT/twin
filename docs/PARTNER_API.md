# Partner API (integrator exports)

Machine-to-machine access for ATS vendors and analytics — **no end-user session**.

## Authentication

Header: `X-Twin-Partner-Token: <secret>`

Tokens are stored **hashed** in `partner_api_keys`. Legacy env `PARTNER_EXPORT_TOKEN` still works as a single shared secret.

## Mint keys (ops)

With `OPS_ADMIN_TOKEN` or `BETA_ADMIN_TOKEN`:

```http
POST /api/v1/admin/partner-api-keys
Authorization: Bearer <ops-token>
Content-Type: application/json

{"label": "acme-ats", "scopes": "export"}
```

Response includes plaintext `token` **once** — store it in your secret manager.

```http
GET /api/v1/admin/partner-api-keys
Authorization: Bearer <ops-token>
```

## Exports

| Endpoint | Scope |
|----------|--------|
| `GET /api/v1/partner/exports/applications-recent.csv?limit=200` | `export` |

CSV columns exclude candidate email (internal IDs only). Increase limit up to 500.

### Example (curl)

Replace `https://<api-host>` with your Railway API URL (e.g. `https://twin-production-bcd9.up.railway.app`).

```bash
curl -fsS \
  -H "X-Twin-Partner-Token: $PARTNER_EXPORT_TOKEN" \
  "https://<api-host>/api/v1/partner/exports/applications-recent.csv?limit=50" \
  -o twin-applications-recent.csv
```

Minted DB keys use the same header; only the token value changes.

Check wiring without downloading data:

```bash
curl -fsS "https://<api-host>/api/v1/health?ops=1" | jq '.partner_export_configured'
```

## Railway (founder)

No extra service — same API host.

| Variable | Service | Notes |
|----------|---------|--------|
| `PARTNER_EXPORT_TOKEN` | **API** | Optional legacy shared secret (`openssl rand -hex 32`). Prefer minted keys via admin API. |
| `OPS_ADMIN_TOKEN` | **API** | Required to mint/revoke partner keys (`POST /api/v1/admin/partner-api-keys`). |

Never commit tokens. Generate locally with `scripts/generate-deploy-secrets.sh` or Railway Variables UI.
