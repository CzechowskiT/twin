# TWIN online — beta pod linkiem (bez Dockera u testerów)

Ten przewodnik jest dla Ciebie jako założyciela. **Beta testerzy** dostaną tylko link (np. `https://twin.vercel.app`) — nie instalują nic na komputerze.

Szacowany czas pierwszego wdrożenia: **2–3 godziny** (głównie konta GitHub, Vercel, Railway).

---

## Co dostaniesz na końcu

| Adres | Co to jest |
|--------|------------|
| `https://twoja-nazwa.vercel.app` | Strona TWIN (logowanie, panel) |
| `https://twoje-api.up.railway.app` | Silnik w tle (oferty, dopasowanie) |

---

## Krok 0 — Kod na GitHubie (wymagane)

Vercel i Railway łączą się z repozytorium Git.

1. Załóż konto na [github.com](https://github.com) jeśli nie masz.
2. Utwórz **puste** repozytorium (np. `twin`), bez README.
3. W terminalu na Macu (w folderze projektu):

```bash
cd ~/Projects/twin
git remote add origin https://github.com/TWOJ_LOGIN/twin.git
git push -u origin cursor/phase1-monorepo-scaffold
```

(Zamień `TWOJ_LOGIN` na swój login GitHub.)

---

## Krok 1 — Railway: baza, Redis i API

[Railway](https://railway.app) hostuje backend (API + zadania w tle).

### 1.1 Projekt

1. **New Project** → **Deploy from GitHub repo** → wybierz `twin`.
2. Dodaj plugin **PostgreSQL** (kliknij **+ New** → Database → PostgreSQL).
3. Dodaj plugin **Redis** (Database → Redis).

### 1.2 Serwis API

1. **+ New** → **GitHub Repo** → ten sam `twin` (drugi serwis w projekcie).
2. **Settings**:
   - **Root Directory**: zostaw puste (korzeń repo).
   - **Config file path**: `deploy/railway-api.toml`
3. **Variables** (skopiuj szablon z `.env.production.example` w repo):

| Zmienna | Wartość |
|---------|---------|
| `SECRET_KEY` | Wygeneruj: w terminalu `openssl rand -hex 32` |
| `ENVIRONMENT` | `production` |
| `ANTHROPIC_API_KEY` | Twój klucz z console.anthropic.com |
| `FRONTEND_URL` | Na razie `https://placeholder.vercel.app` — poprawisz po Kroku 2 |
| `CORS_ORIGINS` | To samo co `FRONTEND_URL` |
| `CELERY_BROKER_URL` | `${{Redis.REDIS_URL}}` (Railway reference) |
| `CELERY_RESULT_BACKEND` | `${{Redis.REDIS_URL}}` |

4. **Variables** → **Add Reference**:
   - `DATABASE_URL` ← z Postgres
   - `REDIS_URL` ← z Redis (opcjonalnie, jeśli kod tego wymaga)

5. **Networking** → **Generate Domain** → skopiuj URL API, np. `https://twin-api-production.up.railway.app`

6. Poczekaj na zielony deploy. Sprawdź w przeglądarce:  
   `https://TWOJE-API.up.railway.app/api/v1/health`  
   Powinno być: `{"status":"ok"}` (lub podobne).

### 1.3 Worker i Beat (pobieranie ofert w tle)

Dodaj **dwa kolejne serwisy** z tego samego repo:

**Worker**

- Config file: `deploy/railway-worker.toml`
- Te same zmienne co API (SECRET_KEY, DATABASE_URL, CELERY_*, ANTHROPIC_API_KEY)
- **Bez** publicznej domeny

**Beat**

- Config file: `deploy/railway-beat.toml`
- Te same zmienne co worker

> Worker z Playwright zużywa więcej RAM. Jeśli deploy się wywala, w Railway zwiększ plan serwisu worker (Hobby).

---

## Krok 2 — Vercel: strona dla użytkowników

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import `twin` z GitHub.
2. **Root Directory**: wybierz `frontend`.
3. **Environment Variables**:

| Nazwa | Wartość |
|--------|---------|
| `NEXT_PUBLIC_API_URL` | URL API z Railway (Krok 1.2) |

4. **Deploy**.

5. Skopiuj adres Vercel, np. `https://twin-xyz.vercel.app`.

6. Wróć do **Railway → API → Variables** i ustaw:
   - `FRONTEND_URL` = adres Vercel
   - `CORS_ORIGINS` = ten sam adres  
   Zrób **Redeploy** API.

---

## Krok 3 — LinkedIn (opcjonalnie)

Jeśli chcesz logowanie LinkedIn w produkcji:

1. [LinkedIn Developer](https://www.linkedin.com/developers/) → aplikacja → Redirect URL:  
   `https://TWOJE-API.up.railway.app/api/v1/auth/linkedin/callback`
2. W Railway (API): `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` (ten sam callback).

Bez tego działa **logowanie e-mailem** — wystarczy na beta.

---

## Krok 4 — Pierwszy test beta

1. Wejdź na adres Vercel.
2. **Zarejestruj się** (e-mail + hasło).
3. Uzupełnij profil, wgraj CV.
4. Kliknij **Pobierz ze wszystkich portali** — poczekaj 1–2 minuty, odśwież listę.

Wyślij testerom ten sam link + krótką instrukcję (3 kroki z README).

---

## Alternatywa: jeden serwer VPS (Docker)

Jeśli wolisz **jedną fakturę** i jedną maszynę (np. Hetzner ~20 PLN/mies.):

```bash
# Na serwerze z Dockerem
git clone https://github.com/TWOJ_LOGIN/twin.git
cd twin
cp .env.production.example .env
# Edytuj .env — hasła, domeny, SECRET_KEY
docker compose -f docker-compose.prod.yml up --build -d
```

Szczegóły: [DEPLOY.md](./DEPLOY.md).

---

## Koszty (orientacyjnie)

| Usługa | Beta |
|--------|------|
| Vercel (frontend) | często 0 PLN |
| Railway (API + DB + Redis + worker) | ~5–20 USD/mies. |
| Domena własna (opcjonalnie) | ~50 PLN/rok |

---

## Problemy?

| Objaw | Co zrobić |
|--------|-----------|
| Biały ekran / błąd logowania | Sprawdź `NEXT_PUBLIC_API_URL` na Vercel i redeploy frontendu |
| „Network error” | `CORS_ORIGINS` musi być **dokładnie** URL Vercel (https, bez slash na końcu) |
| Brak ofert po scrape | Sprawdź logi **worker** na Railway; pracuj.pl może blokować — to normalne na starcie |
| Health API nie działa | Poczekaj na deploy; sprawdź `DATABASE_URL` |

Techniczny opis angielski: [DEPLOY.md](./DEPLOY.md).
