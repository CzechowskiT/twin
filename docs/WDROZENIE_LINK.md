# TWIN w internecie — link dla znajomych (bez żargonu)

**Cel:** znajomy wchodzi w link w przeglądarce, zakłada konto, widzi panel.  
**Nie instaluje** Dockera ani nic na komputerze.

Potrzebujesz **3 darmowych kont** (jednorazowo, ~1–2 h):
1. [GitHub](https://github.com) — schowek na kod  
2. [Railway](https://railway.app) — silnik (oferty, baza)  
3. [Vercel](https://vercel.com) — strona, którą widzą ludzie  

---

## CZĘŚĆ A — Kod na GitHub (15 min)

### A1. Konto i nowe repozytorium
1. Wejdź na https://github.com → zaloguj się (lub załóż konto).  
2. Prawy górny róg → **+** → **New repository**.  
3. Nazwa: `twin`  
4. Zostaw **puste** (bez README, bez .gitignore).  
5. **Create repository**.  
6. **Zapisz swój login** z góry strony (np. `jan-kowalski`) — będzie w adresie.

### A2. Wrzucenie kodu z Maca
1. Otwórz **Terminal** (Wyszukiwarka → Terminal).  
2. Wklej **całość** (zamień `TWÓJ_LOGIN` na login z A1):

```bash
cd ~/Projects/twin
chmod +x scripts/wrzuc-na-github.sh
./scripts/wrzuc-na-github.sh CzechowskiT
```

3. Jeśli GitHub poprosi o hasło — użyj **Personal Access Token** (nie zwykłe hasło):  
   GitHub → Settings → Developer settings → Personal access tokens → Generate → zaznacz `repo` → skopiuj token i wklej jako hasło.

**Gotowe A** gdy na github.com/TWÓJ_LOGIN/twin widać pliki projektu.

---

## CZĘŚĆ B — Railway, silnik w tle (45 min)

1. https://railway.app → zaloguj przez **GitHub**.  
2. **New Project** → **Deploy from GitHub repo** → wybierz `twin`.  
3. **+ New** → **Database** → **PostgreSQL** (poczekaj aż się utworzy).  
4. **+ New** → **Database** → **Redis**.  

### Serwis „API” (strona techniczna, bez niej nic nie działa)
5. **+ New** → **GitHub Repo** → znowu `twin`.  
6. Kliknij ten serwis → **Settings**:  
   - **Config file path:** `deploy/railway-api.toml`  
7. **Variables** → **RAW Editor** — wklej (potem poprawisz adres strony):

```env
SECRET_KEY=WKLEJ_TUTAJ_DŁUGI_CIĄG_Z_TERMINALA
ENVIRONMENT=production
ANTHROPIC_API_KEY=twój_klucz_z_console.anthropic.com
FRONTEND_URL=https://na-razie-placeholder.vercel.app
CORS_ORIGINS=https://na-razie-placeholder.vercel.app
CELERY_BROKER_URL=${{Redis.REDIS_URL}}
CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}
```

8. W Variables: **Add Reference** → `DATABASE_URL` z Postgres.  
9. **Networking** → **Generate Domain** → skopiuj adres (np. `https://twin-production-xxxx.up.railway.app`).  
10. W przeglądarce otwórz: `TEN_ADRES/api/v1/health` — powinno być coś w stylu `{"status":"ok"}`.

**SECRET_KEY** — w Terminalu na Macu:
```bash
openssl rand -hex 32
```
Skopiuj wynik do `SECRET_KEY=` w Railway.

### Worker i Beat (pobieranie ofert)
11. **+ New** → **GitHub Repo** → `twin` → Settings → Config: `deploy/railway-worker.toml`  
    - Te same zmienne co API (SECRET_KEY, DATABASE_URL, CELERY_*, ANTHROPIC).  
12. Jeszcze raz **+ New** → `twin` → Config: `deploy/railway-beat.toml`  
    - Te same zmienne co worker.

---

## CZĘŚĆ C — Vercel, link dla ludzi (20 min)

1. https://vercel.com → zaloguj przez **GitHub**.  
2. **Add New…** → **Project** → importuj `twin`.  
3. **Root Directory:** kliknij Edit → wpisz `frontend` → OK.  
4. **Environment Variables:**  
   - Nazwa: `NEXT_PUBLIC_API_URL`  
   - Wartość: adres API z Railway (Część B, krok 10)  
5. **Deploy** — poczekaj ~2 min.  
6. Skopiuj adres Vercel (np. `https://twin-xxx.vercel.app`).

### Połączenie z powrotem z Railway
7. Railway → serwis **API** → **Variables**  
8. Zmień `FRONTEND_URL` i `CORS_ORIGINS` na adres z Vercel (krok 6).  
9. **Redeploy** API.

---

## GOTOWE — co wysłać znajomym

Wyślij **tylko adres z Vercel**, np.:

> Hej, testuję TWIN — agent ofert pod handlowców. Wejdź: https://twin-xxx.vercel.app  
> Załóż konto emailem, uzupełnij profil, wgraj CV.

---

## Coś nie działa?

| Problem | Rozwiązanie |
|--------|-------------|
| Biała strona / błąd logowania | Na Vercel sprawdź `NEXT_PUBLIC_API_URL` = dokładnie adres Railway |
| „Network error” | W Railway `CORS_ORIGINS` = dokładnie adres Vercel (https, bez `/` na końcu) |
| Brak ofert | W Railway sprawdź czy **worker** jest zielony (Running) |

Techniczny opis: [BETA_ONLINE_PL.md](./BETA_ONLINE_PL.md)
