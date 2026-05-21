# Recruiter batch acceptance inbox (pilot)

North star: **short list of pre-qualified applications** — accept for interview or decline, not thousands of CVs.

## Setup

| Env (API + Vercel proxy) | Value |
|--------------------------|--------|
| `RECRUITER_INBOX_TOKEN` | Global pilot secret (`./scripts/generate-deploy-secrets.sh`) |
| Per-company token | Ops: **`POST /api/v1/admin/recruiter-company-tokens`** or UI `/admin/recruiter-tokens` → full `inbox_url` |

Company tokens embed `company_slug`; global token still requires `company_slug` query param.

## URL

```
https://<frontend>/recruiter/inbox?token=<RECRUITER_INBOX_TOKEN>&company_slug=acme-corp
```

`company_slug` must match `slugify(company)` on job rows (e.g. `Acme Corp` → `acme-corp`).

## API

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/recruiter/inbox?company_slug=` | `X-Twin-Recruiter-Token` |
| POST | `/api/v1/recruiter/inbox/{id}/respond` body `{ "action": "accept" \| "decline" }` | same |

- **accept** → application status `interview`
- **decline** → `rejected`

## Next (post-pilot)

Per-company tokens, employer SSO, calendar slot proposals on accept.
