# Logowanie do demo TWIN (dla founderów)

Instrukcja po polsku — bez terminala. Hasła **nie ma** w tym pliku (dostajesz je raz, bezpiecznym kanałem).

## Gdzie się zalogować

1. Otwórz: **https://twin-sooty.vercel.app/login**
2. Wpisz e-mail demo (patrz poniżej).

Alternatywnie: strona główna https://twin-sooty.vercel.app → **Zaloguj się**.

## Zalecane konto demo (inwestor / prezentacja)

| Pole | Wartość |
|------|---------|
| **E-mail** | `demo@twin.career` |
| **Hasło** | Jednorazowo od agenta / dev (Signal, 1Password — **nie** w GitHubie), **albo** brak hasła gdy dev włączy logowanie bez hasła na tym koncie. |

Po zalogowaniu `/demo` i panel rozpoznają użytkownika demo (`NEXT_PUBLIC_DEMO_USER_EMAIL` + `DEMO_USER_EMAIL` na Railway, domyślnie `demo@twin.career`). Profil (imię, CV) po seedzie to persona „Alex Kowalski” — **dane przykładowe**, nie live feed.

Publiczny podgląd bez logowania: https://twin-sooty.vercel.app/demo — zawsze oznaczony jako **DEMO · SAMPLE DATA** (`GET /api/v1/demo/snapshot` → `source: demo_seed` lub `static_fallback`, `sample_data: true`).

### Jednorazowy seed na produkcji (dev)

W Railway: **Postgres → Connect → `DATABASE_PUBLIC_URL`**, potem w terminalu (hasło **nie** commituj):

```bash
export DATABASE_URL='…wklej DATABASE_PUBLIC_URL…'
export DEMO_USER_EMAIL=demo@twin.career
# opcjonalnie hasło:
export DEMO_USER_PASSWORD='twoje-haslo-12-znakow'
python3 scripts/seed-investor-demo.py --reset-password
```

API: `DEMO_MODE_ENABLED=true`, `DEMO_USER_EMAIL=demo@twin.career`. Vercel: `NEXT_PUBLIC_DEMO_USER_EMAIL=demo@twin.career`.

```bash
./scripts/railway-apply-founder-demo-env.sh   # ustawia demo@twin.career, nie founder PII
./scripts/vercel-apply-founder-demo-env.sh   # po `cd frontend && npx vercel link -p twin-sooty`
```

Patrz też [RAILWAY_DEMO_ENV_CHECKLIST.md](./RAILWAY_DEMO_ENV_CHECKLIST.md).

---

## Opcjonalnie: konto founder (prywatne)

<details>
<summary>Founder — własny e-mail prod (nie zalecane na demo inwestorskie)</summary>

| Pole | Wartość |
|------|---------|
| **E-mail** | `czechowski@protonmail.ch` (Twoje konto produkcyjne) |
| **Hasło** | To samo, którego używasz na produkcji — **nie** resetujemy go przy konfiguracji demo. |

Użyj tylko do własnych testów produktu. Na rozmowę z inwestorem preferuj **`demo@twin.career`**, żeby nie mieszać PII founder z publicznym `/demo`.

```bash
export FOUNDER_DEMO_EMAIL=czechowski@protonmail.ch
export DEMO_USER_EMAIL="$FOUNDER_DEMO_EMAIL"
python3 scripts/ensure-founder-demo-profile.py
```

</details>

## Dashboard (oferty) zamiast onboardingu

Po zalogowaniu kliknij **Panel** / **Dashboard**. Jeśli widzisz krok **5/5 — CV**:

1. Kliknij **„Pomiń na razie”** (Skip for now) — przejdziesz do listy ofert.
2. Albo odśwież stronę po tym, jak dev uruchomi seed na produkcji (konto demo ma wtedy gotowy profil).

## Test auto-aplikacji („Uruchom teraz (test)”)

Ścieżka w panelu: **https://twin-sooty.vercel.app/dashboard/settings/auto-apply**

### Wymagania (muszą być spełnione)

1. Zalogowany jako `demo@twin.career` (lub inny użytkownik z uzupełnionym profilem)
2. Profil uzupełniony (CV tekstowe lub plik — seed ustawia placeholder)
3. **Zgoda RODO** na auto-aplikowanie — checkbox „Włącz auto-aplikowanie nocne” + modal zgody
4. Przełącznik **włączony** (is_active) — wtedy widać przycisk **„Uruchom teraz (test)”**

### Co robi przycisk

- Woła **`POST /api/v1/auto-apply/trigger`** (synchronicznie w API, **nie** przez Celery)
- Przetwarza **jedną** najlepszą dopasowaną ofertę powyżej progu wyniku (test, nie pełna nocna partia)
- Dla ofert **investor-demo** (seed demo) zapisuje aplikację w TWIN **bez** wysyłki na prawdziwy Pracuj.pl

## Co powinieneś zobaczyć po zalogowaniu

- **Przycisk „Demo”** w nagłówku — `/demo` (symulacja + sample apply po zalogowaniu).
- **5 dopasowanych ofert** (demo inwestorskie + ranking).
- **Aplikacja** w toku i **zaplanowana rozmowa** w kalendarzu (po seedzie).

Strona marketingowa bez logowania: https://twin-sooty.vercel.app/demo

## Plan B — własne konto

Jeśli demo nie działa:

1. Wejdź na https://twin-sooty.vercel.app/login
2. **Załóż konto** na swój e-mail firmowy.
3. Przejdź onboarding (zgody RODO, CV).

To konto nie ma gotowych 5 ofert demo — służy do sprawdzenia „prawdziwej” ścieżki użytkownika.

## Gdy coś nie działa

- Zalecane demo: `demo@twin.career` — reset hasła przez dev (`seed-investor-demo.py --reset-password`).
- Status API (dla dev): https://twin-production-bcd9.up.railway.app/api/v1/health

## Bezpieczeństwo

Konto tylko do prezentacji produktu. Nie publikuj hasła i nie używaj go poza TWIN.

---

*Ostatnia aktualizacja: 2026-05-26 — zalecane demo `demo@twin.career`; snapshot API `demo_seed` / `sample_data`; founder e-mail w sekcji prywatnej.*
