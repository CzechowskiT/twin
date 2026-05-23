# Vercel production branch

**Project:** [twin](https://vercel.com/twin/twin)  
**Production URL:** https://twin-sooty.vercel.app  
**Root directory:** `frontend/`

## Required settings

| Setting | Value |
|---------|--------|
| Git repository | `CzechowskiT/twin` (not `CzechowskiD/twin`) |
| **Production Branch** | `cursor/phase1-monorepo-scaffold` |
| Preview (optional) | Same branch if you test preview = prod |

There is **no `main` branch** on the remote. If Production Branch is `main` or `master`, deploys will fail or never pick up fixes.

## Verify after push

```bash
git fetch origin cursor/phase1-monorepo-scaffold
git rev-parse --short origin/cursor/phase1-monorepo-scaffold
```

In Vercel → **Deployments** → latest **Production** → commit SHA must match the command above.

## If deploy stays red

1. **Wrong branch** — Settings → Git → Production Branch → `cursor/phase1-monorepo-scaffold` → Redeploy.
2. **Wrong repo** — Settings → Git → connect `CzechowskiT/twin`.
3. **Build error** — open failed deployment log; fix locally with `cd frontend && npm run build` and `npx tsc --noEmit`.
4. **Env vars** — Production needs at least `NEXT_PUBLIC_API_URL` (Railway API). See `docs/DEPLOY.md` and `docs/KONFIGURACJA_PROD_KROK_PO_KROKU.md`.
5. **Stale green deploy** — Redeploy last successful Production build after branch fix.

## Local build (matches Vercel)

```bash
cd frontend
npm run build          # uses `next build` (Turbopack by default in package.json)
npx tsc --noEmit
```

If Turbopack fails in CI, use `next build --webpack` per `frontend/package.json`.

See also: [DEPLOY.md](./DEPLOY.md) (deploy truth table).
