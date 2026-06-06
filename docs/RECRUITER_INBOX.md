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

Alias: `company=` is accepted instead of `company_slug=`. The UI shows company **names**; the API still uses slugs internally.

`company_slug` must match `slugify(company)` on job rows (e.g. `Acme Corp` → `acme-corp`).

### Local investor demo (optional, gitignored env)

Set on the frontend (never commit real tokens):

- `NEXT_PUBLIC_RECRUITER_INBOX_DEMO_TOKEN` — from `scripts/seed-investor-demo.py --print-credentials`
- `NEXT_PUBLIC_RECRUITER_INBOX_DEMO_COMPANY` — default `nova-hiring-pl`

Opening `/recruiter/inbox` then auto-loads the queue when both are set.

## API

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/recruiter/inbox?company_slug=` | `X-Twin-Recruiter-Token` |
| POST | `/api/v1/recruiter/inbox/{id}/respond` body `{ "action": "accept" \| "decline" }` | same |

- **accept** → application status `interview`
- **decline** → `rejected`

Inbox rows include `match_score`, `match_score_label`, `match_reasons[]`, and nested **`review_card`** (deterministic, locale via `X-Locale`). See `docs/RECRUITER_TRUST_ROADMAP_2026-06-06.md`.

## Next (post-pilot)

Per-company tokens, employer SSO, calendar slot proposals on accept.
