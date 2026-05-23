# Railway demo environment checklist (API service)

Use this before an investor walkthrough. **No secrets belong in git** — set variables in the [Railway dashboard](https://railway.app) or via CLI when authenticated.

**Production API:** `https://twin-production-bcd9.up.railway.app`  
**Production frontend:** `https://twin-sooty.vercel.app`

---

## Required API variables

| Variable | Example value | Purpose |
|----------|---------------|---------|
| `DEMO_MODE_ENABLED` | `true` | Enables `GET /api/v1/demo/snapshot` (404 when `false`) |
| `DEMO_USER_EMAIL` | `demo@twin.career` | Binds live snapshot + health to the seeded demo user |

Optional (defaults shown in seed script):

| Variable | Default |
|----------|---------|
| `DEMO_USER_EMAIL` alias | `INVESTOR_DEMO_EMAIL` also accepted in seed CLI |

---

## Verify (no login required)

```bash
API=https://twin-production-bcd9.up.railway.app

# Health — expect status ok
curl -sS "$API/api/v1/health" | python3 -m json.tool

# Snapshot — expect demo_mode true, demo_user_configured true, source live_db after seed
curl -sS "$API/api/v1/demo/snapshot" | python3 -c "
import sys, json
d=json.load(sys.stdin)
print('demo_mode:', d.get('demo_mode'))
print('demo_user_configured:', d.get('demo_user_configured'))
print('source:', d.get('source'))
"

# Full readiness script (from repo root)
./scripts/verify-investor-demo-ready.sh
```

**Ready when:** `demo_user_configured` is `true`, `source` is `live_db`, and `mvp-stats` shows `total_applications >= 1` and `interviews_scheduled >= 1`.

---

## One-time seed (founder / dev with DB URL)

Password **only** in your terminal — never commit.

```bash
# Railway: Project → Postgres → Connect → copy DATABASE_PUBLIC_URL (or use linked shell)
export DATABASE_URL='postgresql://…'   # or DATABASE_PUBLIC_URL
export DEMO_USER_PASSWORD='your-12+-char-secret'
python3 scripts/seed-investor-demo.py --reset-password
python3 scripts/seed-investor-demo.py --print-credentials   # recruiter inbox token once
```

With Railway CLI (logged in, project linked):

```bash
export DEMO_USER_PASSWORD='…'
railway run python3 scripts/seed-investor-demo.py --reset-password
```

---

## Set variables via Railway CLI (optional)

```bash
railway link    # select twin production project + API service
railway variables set DEMO_MODE_ENABLED=true DEMO_USER_EMAIL=demo@twin.career
```

Redeploy or restart the API service after changing env vars.

---

## Logged-in demo smoke (password from vault)

```bash
API=https://twin-production-bcd9.up.railway.app
curl -sS -X POST "$API/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@twin.career","password":"YOUR_DEMO_PASSWORD"}'
```

Expect `access_token` in JSON. Wrong password → `401` (confirms account exists).

---

## Related docs

- [DEMO_LOGIN_FOR_FOUNDER.md](./DEMO_LOGIN_FOR_FOUNDER.md) — PL login instructions for founders  
- [INVESTOR_DEMO_RUNBOOK.md](./INVESTOR_DEMO_RUNBOOK.md) — full walkthrough  
- [RAILWAY_PROD_ENV_CHECKLIST.md](./RAILWAY_PROD_ENV_CHECKLIST.md) — Stripe, mail, Microsoft, etc.
