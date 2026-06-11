# Company team & permissions MVP (2026-06-11)

## Scope (live)

- **GET** `/api/v1/company/team` — read-only readiness payload for a resolved company slug.
- **UI** `/company/team` — dark B2B workspace tab showing:
  - Readiness flags (`invites_live`, `rbac_live`, `membership_model_live`) — all **false**.
  - Current session kind + label (global pilot vs company token).
  - List of **RecruiterCompanyToken** labels for the slug (no secret material).
  - Disabled invite CTA labeled **not live**.
  - Five **read-only** role permission preview cards.

## Hard bans (MVP)

- No outbound **invitations** or email sends.
- No **privilege escalation** or role assignment APIs.
- No **fake team members** — only token labels + current session metadata.

## Auth

Same recruiter access gate as inbox: `X-Twin-Recruiter-Token` + `company_slug` via `_resolved_company_slug`.

## Frontend guardrails

`npm run test:company-team-permissions-mvp` — static checks for forbidden patterns, proxy path, nav, and i18n parity.

## Roadmap (not in this slice)

Employer SSO membership, RBAC enforcement, invite flows with audit trail, and token mint/revoke UI for company admins.
