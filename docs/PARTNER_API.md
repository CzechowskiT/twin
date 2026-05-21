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

## Railway

No extra service — same API host. Set ops token and mint partner keys after deploy.
