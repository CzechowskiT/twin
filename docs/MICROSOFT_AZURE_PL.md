# Microsoft / Azure — krok po kroku (jak Stripe)

Jedna aplikacja Azure obsługuje **logowanie** i **kalendarz Outlook** w TWIN.

---

## Sposób A — automatyczny (polecany, ~2 minuty Twojej uwagi)

### Krok 1 — Zaloguj się do Microsoft (raz)

W terminalu Cursora (**nowa zakładka**, nie „read-only”):

```bash
/Library/Frameworks/Python.framework/Versions/3.14/bin/az login --use-device-code --allow-no-subscriptions --tenant 651e0ae6-13dd-47e3-aad6-a007b758410f
```

**Ważne:** zaloguj się **prywatnym** kontem Microsoft (np. `@outlook.com`, `@hotmail.com`, `@protonmail.ch`).  
**Nie wybieraj** konta firmowego **Developico** — firma blokuje dostęp (`Conditional Access`).

### Odłączenie Developico od Twojego konta Microsoft (opcjonalnie)

Jeśli przy logowaniu ciągle widzisz **Developico**:

1. Wejdź: https://myaccount.microsoft.com/organizations  
2. Przy **Developico** wybierz **Opuść organizację** / **Leave organization**  
3. Potem uruchom w terminalu:

```bash
cd ~/Projects/twin && ./scripts/azure-personal-only.sh
```

1. Otwórz https://login.microsoft.com/device
2. Wpisz **kod z terminala**
3. Wybierz konto **osobiste** (Default Directory), nie Developico

### Krok 2 — Uruchom skrypt (reszta robi się sama)

```bash
cd ~/Projects/twin
./scripts/setup-microsoft-azure.sh
```

Skrypt:
- tworzy aplikację w Azure,
- ustawia redirect URI,
- generuje Client Secret,
- zapisuje `MICROSOFT_*` do `.env`.

### Krok 3 — Restart API

```bash
cd ~/Projects/twin
make api
```

(albo `./open-folder.sh --launch`)

### Krok 4 — Test

http://localhost:3000/login → **Kontynuuj z Microsoft**

---

## Sposób B — ręcznie w przeglądarce (gdy skrypt nie działa)

1. https://portal.azure.com → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Nazwa: `TWIN local`
3. Konta: **Accounts in any organizational directory and personal Microsoft accounts**
4. Skopiuj **Application (client) ID**
5. **Certificates & secrets** → **New client secret** → skopiuj wartość
6. **Authentication** → redirect URI (Web), **oba** adresy:

```
http://localhost:8000/api/v1/auth/microsoft/callback
http://localhost:8000/api/v1/calendar/microsoft/callback
```

7. Wklej do `.env`:

```bash
cd ~/Projects/twin
node scripts/sync-microsoft-env.mjs TWOJ_CLIENT_ID TWOJ_SECRET
```

8. Restart API.

---

## LinkedIn (osobno)

Masz już klucze w `.env` — po restarcie API użyj **Kontynuuj z LinkedIn** na `/login`.  
Instrukcja: `docs/LINKEDIN_KONFIGURACJA_PL.md`.

---

## Produkcja

W Azure dodaj te same redirecty z domeną Railway, np.  
`https://twoje-api.up.railway.app/api/v1/auth/microsoft/callback`
