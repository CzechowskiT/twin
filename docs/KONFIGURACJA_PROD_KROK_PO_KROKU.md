# Konfiguracja produkcji — krok po kroku (bez technicznego żargonu)

Plik z hasłami na Macu: **`.env.railway`** (ukryty — w Finderze: `Cmd + Shift + .`).

## Agent / jedna komenda (zalecane)

```bash
./scripts/apply-prod-autonomous.sh
```

Pełny opis: `docs/PROD_AUTONOMOUS.md`. Jeśli Railway CLI nie jest podlinkowany, skrypt kopiuje zmienne do schowka — wklej w Raw Editor (poniżej).

## Sposób najszybszy (schowek)

### Railway (API)

1. W Terminalu:

   ```bash
   cd /Users/tomek/Projects/twin
   ./scripts/copy-railway-vars-to-clipboard.sh
   ```

2. Otworzy się Railway w przeglądarce (albo wejdź na [railway.com](https://railway.com)).
3. Projekt **twin** → serwis **API** (ten z adresem `twin-production-bcd9...`).
4. Zakładka **Variables** → **Raw Editor** (surowy edytor).
5. **Cmd + V** (wklej) → **Save** / **Update variables**.
6. Poczekaj na zielony deploy (~2 min).

### Vercel (strona)

1. W Terminalu:

   ```bash
   ./scripts/copy-vercel-vars-to-clipboard.sh
   ```

2. [vercel.com](https://vercel.com) → projekt **twin** → **Settings** → **Environment Variables** → **Production**.
3. Wklej linie ze schowka (każda linia `NAZWA=wartość` — Vercel czasem prosi o dodawanie po jednej; wtedy dodaj ręcznie te 5 nazw z `.env.railway`).
4. **Deployments** → **Redeploy** ostatniego buildu.

## Sprawdzenie

- [https://twin-sooty.vercel.app/admin/metrics](https://twin-sooty.vercel.app/admin/metrics) — w polu hasła wklej `OPS_ADMIN_TOKEN` z `.env.railway`, kliknij odśwież. Powinny być liczki, nie „Unauthorized”.

### Demo inwestorskie (Railway API — nazwy zmiennych)

Ustaw na serwisie **API** (Raw Editor lub `./scripts/railway-apply-production-env.sh`):

| Zmienna | Wartość (przykład) |
|---------|-------------------|
| `DEMO_MODE_ENABLED` | `true` |
| `DEMO_USER_EMAIL` | `demo@twin.career` |

Hasło demo ustawiasz tylko przy seedzie (`DEMO_USER_PASSWORD` lokalnie — **nie** commituj). Po seedzie:

```bash
./scripts/verify-investor-demo-ready.sh
```

Skrypt sprawdza `/api/v1/health`, `/demo/snapshot` (`source: live_db`), `mvp-stats` (aplikacje + rozmowy ≥ 1).

## Uwaga bezpieczeństwa

Jeśli ktoś widział Twoje tokeny w czacie lub mailu — po skonfigurowaniu możesz wygenerować nowe:

```bash
./scripts/generate-deploy-secrets.sh
```

i powtórzyć wklejenie na Railway/Vercel.
