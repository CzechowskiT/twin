# Microsoft Busy-Read Staging Smoke — Runbook (founder, non-technical)

**Date:** 2026-06-24  
**Audience:** Founder / operator — no terminal expertise required  
**Goal:** Confirm Microsoft busy-read stays **safe on production** (gates OFF) and know how to run staging checks before enabling live read-only busy slots.

## What this is (plain language)

TWIN can show **read-only busy time blocks** from a candidate's Microsoft calendar — **without** creating meetings, sending invites, or writing to their calendar.

Today on **production** this is intentionally **off**. The app shows **demo slots** and honest “staging only” copy. That is correct and safe.

## What stays OFF on production (do not change without a planned staging window)

| Setting (Railway API) | Must be on prod |
|----------------------|-----------------|
| `MICROSOFT_BUSY_READ_ENABLED` | **false** |
| `MICROSOFT_OAUTH_CONNECT_GATE_ENABLED` | **false** |
| `MICROSOFT_CALENDAR_WRITE_ENABLED` | **false** |

Legacy interview write (`POST /calendar/microsoft/interviews`) is **blocked** when `MICROSOFT_CALENDAR_WRITE_ENABLED=false`.

## One-command production safety check (after deploy)

Ask engineering to run (or run from the `frontend/` folder):

```bash
TWIN_PROD_BASE_URL=https://twin-sooty.vercel.app npm run verify:prod-microsoft-busy-read
```

**Expected:** PASS with gates OFF — unauthenticated APIs return 401; health shows Microsoft gates **false**.

No JWT required for the default safe path.

## Optional: authenticated check (founder test account)

If you have a production test JWT in your password manager (`TWIN_PROD_TEST_JWT`):

```bash
TWIN_PROD_BASE_URL=https://twin-sooty.vercel.app \
  TWIN_PROD_TEST_JWT=<paste-from-vault> \
  npm run verify:prod-microsoft-busy-read
```

**Expected:** readiness `product_gate_enabled: false`, preview `preview_mode: demo`, interview write **403**.

Never paste the JWT into chat, email, or screenshots.

## Staging-only live busy-read (future — not production)

Only after explicit staging window:

1. On **staging Railway API only**, set `MICROSOFT_BUSY_READ_ENABLED=true` (still keep write gate **false**).
2. Connect a **test** Microsoft 365 work/school account with **Calendars.Read** only.
3. Run live smoke (engineering):

```bash
TWIN_PROD_BASE_URL=<staging-frontend-url> \
  TWIN_BUSY_READ_SMOKE_ALLOW_LIVE=1 \
  TWIN_PROD_TEST_JWT=<staging-test-jwt> \
  npm run verify:prod-microsoft-busy-read
```

## What you should see in the product UI

On calendar readiness surfaces (candidate, board, recruiter, company, offer cards):

- Amber **“Staging-only — Microsoft busy-read preview”** banner when live gate is off
- Demo busy slots with **redacted** event details
- **No** “Connect Microsoft” live redirect unless OAuth connect gate is deliberately enabled on staging

## Hard bans (unchanged)

- No calendar sync, Graph writes, invites, email, or token display in UI
- No enabling live busy-read on production without founder sign-off
- Phase 3B, stress tests, shell/layout changes — out of scope

## If smoke fails

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `failed alignment` in commit gate | Prod deploy behind repo | Wait for Vercel/Railway deploy or run smoke from matching commit |
| Health shows `microsoft_busy_read_enabled: true` on prod | Wrong Railway env | Set gate back to **false** immediately; notify engineering |
| Interview write returns 200 on prod | Write gate on | Set `MICROSOFT_CALENDAR_WRITE_ENABLED=false` on Railway API |

## Related docs

- [MICROSOFT_BUSY_READ_READINESS_2026-06-24.md](./MICROSOFT_BUSY_READ_READINESS_2026-06-24.md)
- [MICROSOFT_CALENDAR_SCOPE_AUDIT_2026-06-24.md](./MICROSOFT_CALENDAR_SCOPE_AUDIT_2026-06-24.md)
- [RAILWAY_PROD_ENV_PL.md](./RAILWAY_PROD_ENV_PL.md) — Microsoft Calendar section

## Launch stance

| Item | Status |
|------|--------|
| Microsoft busy-read live on prod | **NOT SHIPPED** — gates default off |
| Public launch | **NO-GO** |
| Phase 3B | **HARD BLOCKED** |
