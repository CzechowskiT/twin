# P0 — link online (checklista)

Repo GitHub: **https://github.com/CzechowskiT/twin** (po `git push`).

---

## A. Kod na GitHub (Mac, Terminal)

```bash
cd ~/Projects/twin
git remote add origin https://github.com/CzechowskiT/twin.git
# jeśli origin już jest: git remote set-url origin https://github.com/CzechowskiT/twin.git

git push -u origin cursor/phase1-monorepo-scaffold
```

Jeśli brak commitów lokalnych — najpierw `git pull` albo użyj skryptu `./scripts/wrzuc-na-github.sh CzechowskiT` (tworzy commit i pyta o Enter przed pushem).

---

## B. Railway — kolejność

**Żeby się nie rozjeżdżało z Vercelem:** na obu platformach ten **sam branch** GitHub (np. `cursor/phase1-monorepo-scaffold`). Po pushu poczekaj na zielony deploy; jeśli Railway pisze **SKIPPED** / „No changes to watched files”, wejdź w ostatni deployment i zrób **Redeploy** (wymuszenie).

1. **New project** → Deploy from GitHub → `CzechowskiT/twin`.
2. **PostgreSQL** (+ New → Database).
3. **Redis** (+ New → Database).
4. **API** — drugi serwis z tego samego repo:
   - Settings → **Root directory:** `backend` (monorepo — Railway buduje z folderu `backend`, inaczej `requirements.txt` nie trafia do kontekstu Dockera).
   - Settings → **Config file path:** `deploy/railway-api.toml`
   - **Variables** (RAW lub pojedynczo):

| Zmienna | Wartość |
|---------|---------|
| `SECRET_KEY` | `openssl rand -hex 32` na Macu |
| `ENVIRONMENT` | `production` |
| `DATABASE_URL` | Reference → Postgres |
| `CELERY_BROKER_URL` | `${{Redis.REDIS_URL}}` |
| `CELERY_RESULT_BACKEND` | `${{Redis.REDIS_URL}}` |
| `ANTHROPIC_API_KEY` | Twój klucz |
| `FRONTEND_URL` | Tymczasowo `https://placeholder.vercel.app` → **zmień po Vercel** |
| `CORS_ORIGINS` | **To samo** co `FRONTEND_URL` |
| `API_URL` | Zostaw puste lub URL API po wygenerowaniu domeny |
| `LINKEDIN_CLIENT_ID` | Jak w `.env` lokalnie |
| `LINKEDIN_CLIENT_SECRET` | Jak w `.env` |
| `LINKEDIN_REDIRECT_URI` | `https://<TWOJE-API>.up.railway.app/api/v1/auth/linkedin/callback` |
| `AUTO_APPLY_HEADLESS` | `true` (na serwerze bez monitora) |

5. **Networking** → Generate Domain → skopiuj URL API.
6. **Worker** — trzeci serwis, **Root directory:** `backend`, config: `deploy/railway-worker.toml` — **te same** zmienne co API (bez `FRONTEND_URL` można, ale API_URL nie jest wymagane dla workera).
7. **Beat** — czwarty serwis, **Root directory:** `backend`, config: `deploy/railway-beat.toml` — `CELERY_*` + ewentualnie reszta jak worker.

**Test:** `https://<API>/api/v1/health` → `{"status":"ok"}` (lub podobnie).

---

## C. Vercel

**Ten sam branch co Railway** (np. `cursor/phase1-monorepo-scaffold`): Vercel → Project → **Settings** → **Git** → **Production Branch** (i ewentualnie Preview = ten sam branch, jeśli testujesz preview).

1. Import `CzechowskiT/twin`, **Root Directory:** `frontend`.
2. **Environment variables (proxy do API):**
   - Zalecane (serwerowe, bez wpinania Railway URL do bundle przeglądarki): **`TWIN_API_BASE_URL`** = `https://<TWOJE-API>.up.railway.app` (bez końcowego `/`). Next.js proxy (`/api/v1/...`) używa tego na Vercel — patrz `frontend/src/lib/public-api-base.ts`.
   - Alternatywa: **`NEXT_PUBLIC_API_URL`** = ten sam adres API (wtedy URL Railway jest w kliencie; OK na beta).
3. Deploy → skopiuj URL aplikacji.

---

## D. Domknięcie

1. Railway → API → `FRONTEND_URL` i `CORS_ORIGINS` = URL z Vercel.
2. LinkedIn Developer → **Redirect URL** = ten sam co `LINKEDIN_REDIRECT_URI` na Railway.
3. **Redeploy** API na Railway.

---

## E. Test końcowy

- Wejdź na link Vercel → rejestracja → profil → pobierz oferty.
- LinkedIn login: tylko jeśli redirect w aplikacji LinkedIn = produkcyjny callback.

Szczegóły: [WDROZENIE_LINK.md](./WDROZENIE_LINK.md) · [BETA_ONLINE_PL.md](./BETA_ONLINE_PL.md)

---

## F. Szybki smoke z terminala (opcjonalnie)

Po ustawieniu `BASE_URL` na publiczny root API (jak w sekcji B, krok „Test”):

```bash
chmod +x scripts/smoke-p0.sh
BASE_URL="https://<TWOJE-API>.up.railway.app" ./scripts/smoke-p0.sh
# głębszy test (SELECT 1 w DB, 2 s timeout):
BASE_URL="https://<TWOJE-API>.up.railway.app" ./scripts/smoke-p0.sh --db
```
