# Microsoft 365 / Azure — logowanie i kalendarz w TWIN

Jedna aplikacja w **Microsoft Entra** obsługuje:
- **logowanie / rejestrację** (`/api/v1/auth/microsoft/...`)
- **kalendarz Outlook** (`/api/v1/calendar/microsoft/...`)

Bez `MICROSOFT_CLIENT_ID` i `MICROSOFT_CLIENT_SECRET` w `.env` przycisk Microsoft na stronie logowania przekieruje z błędem `microsoft_not_configured`.

---

## Krok 1 — Rejestracja aplikacji w Azure (10 min)

1. Wejdź: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade  
2. **New registration**  
   - Name: `TWIN local` (dowolna)  
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**  
   - Redirect URI: **Web** → na razie zostaw puste, dodasz za chwilę  
3. Po utworzeniu skopiuj **Application (client) ID** → to `MICROSOFT_CLIENT_ID`  
4. **Certificates & secrets** → **New client secret** → skopiuj wartość → `MICROSOFT_CLIENT_SECRET`  
5. **Authentication** → **Add a platform** → **Web** → dodaj **oba** adresy (dokładnie):

```
http://localhost:8000/api/v1/auth/microsoft/callback
http://localhost:8000/api/v1/calendar/microsoft/callback
```

6. **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated**:
   - `openid`, `profile`, `email`, `User.Read` (logowanie)
   - `Calendars.ReadWrite`, `offline_access` (kalendarz)  
7. **Grant admin consent** (jeśli masz konto firmowe z uprawnieniami admina).

---

## Krok 2 — Wklej do `~/Projects/twin/.env`

```env
MICROSOFT_CLIENT_ID=twoj_application_client_id
MICROSOFT_CLIENT_SECRET=twoj_client_secret
MICROSOFT_REDIRECT_URI=http://localhost:8000/api/v1/auth/microsoft/callback
MICROSOFT_CALENDAR_REDIRECT_URI=http://localhost:8000/api/v1/calendar/microsoft/callback
MICROSOFT_TENANT=common
```

Zapisz plik.

---

## Krok 3 — Restart API

Zatrzymaj API (Ctrl+C) i uruchom ponownie (`make api` lub `./open-folder.sh --launch`).

---

## Krok 4 — Sprawdzenie

- Logowanie: http://localhost:3000/login → **Kontynuuj z Microsoft**  
- Kalendarz: panel → połącz Microsoft 365  

---

## LinkedIn

LinkedIn jest osobną aplikacją — patrz `docs/LINKEDIN_KONFIGURACJA_PL.md`.  
Jeśli w `.env` masz już `LINKEDIN_CLIENT_ID` i `LINKEDIN_CLIENT_SECRET`, przycisk LinkedIn działa po restarcie API.

---

## Produkcja (Railway / Vercel)

W Azure dodaj redirecty z domeną produkcyjną, np.:

```
https://twoje-api.up.railway.app/api/v1/auth/microsoft/callback
https://twoje-api.up.railway.app/api/v1/calendar/microsoft/callback
```

Te same wartości ustaw w zmiennych Railway (`MICROSOFT_*`).
