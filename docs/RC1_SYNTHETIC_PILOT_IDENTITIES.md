# RC1 synthetic pilot identities

**Purpose:** Repeatable invite-only smoke / cohort prep without open registration.  
**Never commit passwords.** Values live in gitignored `.env.local` / Railway.

| Persona | Identity | Auth path | Notes |
|---------|----------|-----------|-------|
| Candidate | `demo@twin.career` | `/api/v1/auth/login/json` + `DEMO_USER_PASSWORD` | Existing demo; metrics-excluded where configured |
| Recruiter | company `nova-hiring-pl` | `RECRUITER_INBOX_TOKEN` → `POST /api/v1/auth/recruiter/session` | Token must match Railway `twin` |
| Company | same demo JWT + company slug OR recruiter JWT | `/api/v1/company/*?company_slug=nova-hiring-pl` | RBAC may 401 for pure candidate JWT |
| Investor | `demo@twin.career` (or invite) | JWT | Data-room NDA + Postgres secure download |
| Admin / ops | `OPS_ADMIN_TOKEN` | header-gated ops routes | Negative unauth must stay 401/403/404 |

## Allowlist (production)

Railway:

- `PILOT_REGISTRATION_INVITE_ONLY=true`
- `PILOT_EMAIL_ALLOWLIST=demo@twin.career` (+ future named pilots, comma-separated)

Open self-serve registration remains **OFF** while Launch=NO-GO and Enrollment=OFF.

## Invite-only rule

New `/api/v1/auth/register` in production with invite-only flag accepts **only** allowlisted emails. Empty allowlist ⇒ no new signups.
