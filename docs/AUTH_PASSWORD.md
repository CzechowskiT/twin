# Password flows (email accounts)

TWIN supports **forgot / reset** (unauthenticated) and **change password** (logged in) for users with a bcrypt password (`hashed_password` on `users`). OAuth-only accounts have no password until one is set via reset or registration.

## URLs (frontend)

| Flow | Path |
|------|------|
| Log in | `/login`, `/login/candidate`, `/login/recruiter`, `/login/investor` — link **Forgot password?** |
| Request reset email | `/forgot-password` |
| Set new password from email link | `/reset-password?token=…` |
| Change password while logged in | `/profile` — **Account password** section |

Production example base: `https://twin-sooty.vercel.app` (see `FRONTEND_URL` on the API).

## API

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| `POST` | `/api/v1/auth/forgot-password` | No | Body: `{ "email" }`. Always returns generic ack (no enumeration). Rate limit: SlowAPI 5/min + optional `AUTH_FORGOT_PASSWORD_RATE_LIMIT_PER_MINUTE`. |
| `POST` | `/api/v1/auth/reset-password` | No | Body: `{ "token", "password" }` (min 8 chars). Token TTL: `PASSWORD_RESET_TOKEN_TTL_MINUTES` (default 60). Rate limit: 3/min. |
| `PATCH` | `/api/v1/auth/me/password` | Bearer JWT | Body: `{ "current_password", "new_password" }`. Invalidates outstanding reset tokens. Rate limit: 10/min. |

`GET /api/v1/auth/me` includes `has_password_login` so the UI can hide the change form for OAuth-only users.

## Email (reset link)

Reset messages use `app.services.mail.send_password_reset_email` (Resend or SMTP).

Configure **one** of:

- **Resend:** `RESEND_API_KEY`, `MAIL_FROM` (verified sender)
- **SMTP:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`

Also required:

- `FRONTEND_URL` — base URL embedded in reset links (`{FRONTEND_URL}/reset-password?token=…`)

If mail is not configured, the API still returns the generic forgot-password message; in development the reset URL may be logged server-side.

## Security

- Reset tokens: `secrets.token_urlsafe(32)`, stored as SHA-256 in `password_reset_tokens`, single active token per user, deleted on use or password change.
- Passwords: bcrypt via passlib.
- Forgot-password response does not reveal whether the email exists.

## Tests

```bash
cd backend && pytest tests/test_password_reset.py tests/test_change_password.py -q
```

## Founder / demo

- Demo login: see `docs/DEMO_LOGIN_FOR_FOUNDER.md`.
- Ops reset of demo password: `scripts/seed-investor-demo.py --reset-password` (not the same as user self-service forgot-password).
