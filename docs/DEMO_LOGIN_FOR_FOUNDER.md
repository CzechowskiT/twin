# Logowanie do demo TWIN (dla founderów)

Instrukcja po polsku — bez terminala. Hasła **nie ma** w tym pliku (dostajesz je raz, bezpiecznym kanałem).

## Gdzie się zalogować

1. Otwórz: **https://twin-sooty.vercel.app/login**
2. Wpisz e-mail i hasło demo (od zespołu dev).

Alternatywnie: strona główna https://twin-sooty.vercel.app → **Zaloguj się**.

## Konto demo (founder — Twoje konto)

| Pole | Wartość |
|------|---------|
| **E-mail** | `czechowski@protonmail.ch` (Twoje konto produkcyjne) |
| **Hasło** | To samo, którego używasz na produkcji — **nie** resetujemy go przy konfiguracji demo. |

Po zalogowaniu `/demo` i panel rozpoznają Cię jako użytkownika demo (`NEXT_PUBLIC_DEMO_USER_EMAIL` + `DEMO_USER_EMAIL` na Railway). Profil (imię, CV) **nie** jest nadpisywany personą „Alex Kowalski”.

### Konto demo@twin.career (legacy, opcjonalne)

| Pole | Wartość |
|------|---------|
| **E-mail** | `demo@twin.career` |
| **Hasło** | Jednorazowo od agenta / dev (Signal, 1Password — **nie** w GitHubie). |

> **Uwaga:** Użyj **najnowszego hasła od dev** tylko jeśli celowo logujesz się na `demo@twin.career`.

Hasło legacy można zresetować przez dev (`seed-investor-demo.py --reset-password`) — **nie** używaj tego na koncie founder.

### Jednolinijkowiec dla dev (seed na produkcji)

W Railway: **Postgres → Connect → `DATABASE_PUBLIC_URL`**, potem w terminalu (hasło **nie** commituj):

```bash
export DATABASE_URL='…wklej DATABASE_PUBLIC_URL…'
export DEMO_USER_PASSWORD='twoje-haslo-12-znakow'
python3 scripts/seed-investor-demo.py --reset-password
```

API: `DEMO_MODE_ENABLED=true`, `DEMO_USER_EMAIL=czechowski@protonmail.ch`. Vercel: `NEXT_PUBLIC_DEMO_USER_EMAIL` — ten sam e-mail.

```bash
./scripts/railway-apply-founder-demo-env.sh
./scripts/vercel-apply-founder-demo-env.sh   # po `cd frontend && npx vercel link -p twin-sooty`
# Uzupełnienie profilu bez resetu hasła (Railway Postgres → DATABASE_PUBLIC_URL):
export DATABASE_URL='…'
python3 scripts/ensure-founder-demo-profile.py
```

Patrz też [RAILWAY_DEMO_ENV_CHECKLIST.md](./RAILWAY_DEMO_ENV_CHECKLIST.md).

## Dashboard (oferty) zamiast onboardingu

Po zalogowaniu kliknij **Panel** / **Dashboard**. Jeśli widzisz krok **5/5 — CV**:

1. Kliknij **„Pomiń na razie”** (Skip for now) — przejdziesz do listy ofert.
2. Albo odśwież stronę po tym, jak dev uruchomi seed na produkcji (konto demo ma wtedy gotowy profil).

Hasło się **nie zmienia**, dopóki dev nie zrobi resetu hasła.

## Test auto-aplikacji („Uruchom teraz (test)”)

Ścieżka w panelu: **https://twin-sooty.vercel.app/dashboard/settings/auto-apply**

### Wymagania (muszą być spełnione)

1. Zalogowany jako `czechowski@protonmail.ch`
2. Profil uzupełniony (CV tekstowe lub plik — seed founder ustawia placeholder)
3. **Zgoda RODO** na auto-aplikowanie — checkbox „Włącz auto-aplikowanie nocne” + modal zgody
4. Przełącznik **włączony** (is_active) — wtedy widać przycisk **„Uruchom teraz (test)”**

### Co robi przycisk

- Woła **`POST /api/v1/auto-apply/trigger`** (synchronicznie w API, **nie** przez Celery)
- Przetwarza **jedną** najlepszą dopasowaną ofertę powyżej progu wyniku (test, nie pełna nocna partia)
- Dla ofert **investor-demo** (seed demo) zapisuje aplikację w TWIN **bez** wysyłki na prawdziwy Pracuj.pl
- Dla **prawdziwych** ofert z scrapera uruchamia Playwright (wymaga Chromium na Railway API)

### Czego oczekiwać po kliknięciu

| Wynik | Komunikat (PL) | Gdzie sprawdzić |
|-------|----------------|-----------------|
| Sukces demo | „Gotowe: Demo: aplikacja zapisana w TWIN…” | **Panel** (`/dashboard`) — sekcja Aplikacje, nowy wiersz „applied”, auto-applied |
| Brak ofert | „Brak kwalifikujących dopasowań…” | Obniż próg wyniku lub poczekaj na nowe dopasowania |
| Limit dzienny | „Osiągnięto dzienny limit…” | Jutro albo zwiększ limit w ustawieniach |
| Błąd serwera | Czerwony/żółty komunikat z API | Dev: logi Railway API |

Po sukcesie odświeżą się statystyki: **Ostatnie uruchomienie**, **Łącznie auto-aplikacji**. Link **„Zobacz aplikacje →”** pod komunikatem.

### Nocny harmonogram (02:00 Europe/Warsaw)

Pełny sweep o 02:00 idzie przez **Celery worker** (beat + Redis). Przycisk testowy to ta sama logika co noc, ale **1 oferta** i od razu w odpowiedzi HTTP.

Weryfikacja workera (dev): `GET https://twin-production-bcd9.up.railway.app/api/v1/health/celery-status` → `worker_active: true`.

## Co powinieneś zobaczyć po zalogowaniu

- **Przycisk „Demo”** w nagłówku (obok logo oraz obok **Kalendarz** / **Panel**) — prowadzi na `/demo` (symulacja + live apply po zalogowaniu).
- Na koncie founder (`czechowski@protonmail.ch`) dodatkowo **wyróżniony pasek Demo** na górze panelu (`/dashboard`).
- **5 dopasowanych ofert** (demo inwestorskie + ranking).
- **Aplikacja** w toku i **zaplanowana rozmowa** w kalendarzu.
- **Data room** w trybie demo (lokalny podgląd, gdy S3 wyłączone na prod).

Strona marketingowa bez logowania: https://twin-sooty.vercel.app/demo

## Plan B — własne konto

Jeśli demo nie działa (np. stare hasło):

1. Wejdź na https://twin-sooty.vercel.app/login
2. **Załóż konto** na swój e-mail firmowy.
3. Przejdź onboarding (zgody RODO, CV — możesz wkleić krótki tekst zamiast pliku).

To konto nie ma gotowych 5 ofert demo — służy do sprawdzenia „prawdziwej” ścieżki użytkownika.

## Gdy coś nie działa

- Founder: loguj się jako `czechowski@protonmail.ch` (własne hasło).
- Legacy demo: `demo@twin.career` — reset hasła tylko przez dev (`seed-investor-demo.py --reset-password`), nie na koncie founder.
- Status API (dla dev): https://twin-production-bcd9.up.railway.app/api/v1/health

## Bezpieczeństwo

Konto tylko do prezentacji produktu. Nie publikuj hasła i nie używaj go poza TWIN.

---

*Ostatnia aktualizacja: 2026-05-23 — demo na koncie founder (`czechowski@protonmail.ch`), config-only Railway/Vercel + `ensure-founder-demo-profile.py`.*
