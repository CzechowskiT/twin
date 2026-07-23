# RC1 domain DNS — Founder action (twin.care)

## Observed (2026-07-23)

| Item | Value |
|------|--------|
| Current NS | `ns1.afternic.com` / `ns2.afternic.com` (marketplace parking) |
| Apex response | 114-byte HTML redirect to `/lander` |
| Vercel project | `twin` — domains **attached**: `twin.care`, `www.twin.care`, `app.twin.care` |
| Intended NS | `ns1.vercel-dns.com` / `ns2.vercel-dns.com` |
| Operational URL (until DNS) | `https://twin-sooty.vercel.app` |

Cursor/CLI **cannot** change Afternic nameservers. No Railway/Vercel terminal work required from Founder beyond registrar UI.

## Exact Founder steps

1. Log into the registrar / Afternic control panel that owns **twin.care**.  
2. Remove marketplace/parking hold if present.  
3. Either:  
   - **A (preferred):** Set nameservers to `ns1.vercel-dns.com` and `ns2.vercel-dns.com`, **or**  
   - **B:** Keep current DNS host and create A record `@ → 76.76.21.21` (and `www` / `app` CNAME to `cname.vercel-dns.com` per Vercel inspect).  
4. Wait for propagation; confirm `curl -sI https://twin.care/login/candidate` returns Vercel/`x-matched-path` and HTML length ≫ 114.  
5. Confirm `https://app.twin.care` serves the app.  
6. Notify agent to re-verify topology guard + CORS (already pre-seeded).

## Until then

Controlled pilot uses **`https://twin-sooty.vercel.app`** as operational frontend. Launch remains NO-GO (no marketing of twin.care as open product).
