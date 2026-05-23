# Logowanie do demo TWIN (dla founderów)

Instrukcja po polsku — bez terminala. Hasła **nie ma** w tym pliku (dostajesz je raz, bezpiecznym kanałem).

## Gdzie się zalogować

1. Otwórz: **https://twin-sooty.vercel.app/login**
2. Wpisz e-mail i hasło demo (od zespołu dev).

Alternatywnie: strona główna https://twin-sooty.vercel.app → **Zaloguj się**.

## Konto demo

| Pole | Wartość |
|------|---------|
| **E-mail** | `demo@twin.career` |
| **Hasło** | Jednorazowo od agenta / dev (Signal, 1Password, wiadomość prywatna — **nie** w GitHubie). |

> **Uwaga:** Użyj **najnowszego hasła od dev** (po każdym resecie — nie szukaj go w repozytorium).

Hasło można zresetować bez Twojej pracy w terminalu — wystarczy prośba do zespołu dev.

### Jednolinijkowiec dla dev (seed na produkcji)

W Railway: **Postgres → Connect → `DATABASE_PUBLIC_URL`**, potem w terminalu (hasło **nie** commituj):

```bash
export DATABASE_URL='…wklej DATABASE_PUBLIC_URL…'
export DEMO_USER_PASSWORD='twoje-haslo-12-znakow'
python3 scripts/seed-investor-demo.py --reset-password
```

API musi mieć `DEMO_MODE_ENABLED=true` i `DEMO_USER_EMAIL=demo@twin.career` — patrz [RAILWAY_DEMO_ENV_CHECKLIST.md](./RAILWAY_DEMO_ENV_CHECKLIST.md).

## Dashboard (oferty) zamiast onboardingu

Po zalogowaniu kliknij **Panel** / **Dashboard**. Jeśli widzisz krok **5/5 — CV**:

1. Kliknij **„Pomiń na razie”** (Skip for now) — przejdziesz do listy ofert.
2. Albo odśwież stronę po tym, jak dev uruchomi seed na produkcji (konto demo ma wtedy gotowy profil).

Hasło się **nie zmienia**, dopóki dev nie zrobi resetu hasła.

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

- E-mail musi być dokładnie: `demo@twin.career` (małe litery).
- „Nieprawidłowe dane logowania” → poproś dev o **reset hasła demo** (`seed-investor-demo.py --reset-password`).
- Status API (dla dev): https://twin-production-bcd9.up.railway.app/api/v1/health

## Bezpieczeństwo

Konto tylko do prezentacji produktu. Nie publikuj hasła i nie używaj go poza TWIN.

---

*Ostatnia aktualizacja: 2026-05-23 — reset hasła demo na produkcji (Railway `responsible-success`); hasło tylko od dev.*
