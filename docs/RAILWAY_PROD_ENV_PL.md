# Railway — produkcja: mail waitlist + Microsoft Calendar

API produkcyjne (z historii deployu): **`https://twin-production-bcd9.up.railway.app`**

## 1. Health / commit SHA (już OK)

Sprawdzenie:

```bash
curl -sS "https://twin-production-bcd9.up.railway.app/api/v1/health"
```

Oczekiwane (przykład):

```json
{"status":"ok","service":"twin-api","git_commit":"bc5f2bdddcec635ef9278838deda6942ab070ac6"}
```

Jeśli `git_commit` to `unknown`, w Railway → API → Variables dodaj (opcjonalnie) `GIT_COMMIT_SHA` z ostatniego deploya, albo polegaj na `RAILWAY_GIT_COMMIT_SHA` (Railway ustawia automatycznie po redeploy).

Po wdrożeniu `?ops=1`:

```bash
curl -sS "https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1"
```

- `mail_configured: true` — Resend lub SMTP + MAIL_FROM
- `microsoft_calendar_configured: true` — Azure app + zmienne poniżej

---

## 2. Mail waitlist (Resend — najprościej)

1. [resend.com](https://resend.com) → API Keys → utwórz klucz `re_…`
2. W Resend zweryfikuj domenę **albo** na start użyj adresu testowego z panelu (np. `onboarding@resend.dev`)
3. Railway → serwis **twin** (API) → **Variables**:

| Zmienna | Wartość |
|---------|---------|
| `RESEND_API_KEY` | `re_…` |
| `MAIL_FROM` | `TWIN <onboarding@resend.dev>` (lub Twój zweryfikowany nadawca) |

4. **Redeploy** API

Test: zapis na `/waitlist` — mail powitalny z linkami do panelu.

---

## 3. Microsoft Calendar (Azure)

1. [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Redirect URI (Web):  
   `https://twin-production-bcd9.up.railway.app/api/v1/calendar/microsoft/callback`
3. **Certificates & secrets** → New client secret → skopiuj wartość
4. **API permissions** → Microsoft Graph → Delegated: `Calendars.ReadWrite`, `User.Read`, `offline_access`
5. Railway → Variables:

| Zmienna | Wartość |
|---------|---------|
| `MICROSOFT_CLIENT_ID` | Application (client) ID |
| `MICROSOFT_CLIENT_SECRET` | secret z Azure |
| `MICROSOFT_CALENDAR_REDIRECT_URI` | jak wyżej (bez `/` na końcu) |
| `MICROSOFT_TENANT` | `common` |

6. **Redeploy** API

W aplikacji: **Dashboard → Calendar → Connect Microsoft 365 / Outlook**

---

## 4. Skrypt (gdy masz Railway CLI)

```bash
cp .env.railway.example .env.railway
# uzupełnij RESEND_API_KEY, MAIL_FROM, MICROSOFT_* w .env.railway

npx @railway/cli login
cd twin   # repo root
npx @railway/cli link    # wybierz projekt + serwis API "twin"
chmod +x scripts/railway-apply-production-env.sh
./scripts/railway-apply-production-env.sh
```

Plik `.env.railway` jest w `.gitignore` — sekretów nie commituj.

---

## 5. Vercel (już spięte)

Proxy health działa też przez front:

`https://twin-sooty.vercel.app/api/v1/health`

Upewnij się, że `NEXT_PUBLIC_API_URL` = `https://twin-production-bcd9.up.railway.app`
