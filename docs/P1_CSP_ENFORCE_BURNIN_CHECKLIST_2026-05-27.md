# P1 CSP enforce burn-in checklist — 2026-05-27

**Do not flip `Content-Security-Policy-Report-Only` → enforce** until
every box below is checked on the **preview alias** for 72h.

## Preconditions

- [ ] `report-uri /api/v1/csp-report` visible on `/` (FE runtime test in `e2e/smoke.spec.ts`)
- [ ] Backend sink rate-limited (`60/min`) and sanitization tests green
- [ ] No PII in `csp_reports` table sample (manual SQL spot-check)

## Burn-in (72h preview)

- [ ] Browser console: zero CSP violations on `/`, `/dashboard`, `/login/candidate`, `/register/candidate`, `/waitlist`, `/demo`, `/status`
- [ ] Stripe.js / analytics if any — no blocked scripts in report-only stream
- [ ] Vercel preview deploy matches `next.config` header test (`npm run test:security-headers`)

## Enforce flip (single PR)

- [ ] Rename header only in `frontend/next.config.ts` / middleware
- [ ] Rollback plan: revert header name to `-Report-Only`
- [ ] Post-flip: repeat console check on prod alias

## Owner

FE + founder sign-off. No Railway change required for enforce flip.
