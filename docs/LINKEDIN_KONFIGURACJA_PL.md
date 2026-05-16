# LinkedIn — logowanie w TWIN (5–10 minut)

Na ekranie logowania widać **„LinkedIn login coming soon”**, gdy w pliku `.env` **brakuje kluczy** z aplikacji LinkedIn. Samo posiadanie konta LinkedIn nie wystarczy — trzeba utworzyć **aplikację deweloperską**.

---

## Krok 1 — Aplikacja na LinkedIn

1. Wejdź: https://www.linkedin.com/developers/apps  
2. **Create app** (lub wybierz istniejącą).  
3. W zakładce **Products** dodaj: **Sign In with LinkedIn using OpenID Connect**.  
4. Zakładka **Auth** → **OAuth 2.0 settings** → **Authorized redirect URLs** → dodaj **dokładnie** adresy zwracane przez API (na ekranie logowania, gdy `NEXT_PUBLIC_API_URL` jest ustawione na Vercelu, zobaczysz też gotowy URL produkcyjny do skopiowania):

```
http://localhost:8000/api/v1/auth/linkedin/callback
```

(Jeśli masz już API na Railway, dodaj też adres produkcyjny, np.  
`https://twoje-api.up.railway.app/api/v1/auth/linkedin/callback`)

5. Skopiuj **Client ID** i **Client Secret** z zakładki Auth.

---

## Krok 2 — Wklej klucze do `.env`

Otwórz plik `~/Projects/twin/.env` i **dopisz** (lub uzupełnij):

```env
FRONTEND_URL=http://localhost:3000
LINKEDIN_CLIENT_ID=wkład_tutaj_client_id
LINKEDIN_CLIENT_SECRET=wkład_tutaj_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:8000/api/v1/auth/linkedin/callback
```

Zapisz plik.

---

## Krok 3 — Restart API

1. Zatrzymaj terminal z API (Ctrl+C).  
2. Uruchom ponownie: `make api` albo `./open-folder.sh --launch`.

---

## Krok 4 — Sprawdzenie

W przeglądarce otwórz:

http://localhost:8000/api/v1/auth/linkedin/status

Powinno być: `{"configured":true}`

Odśwież http://localhost:3000/login — zamiast „coming soon” zobaczysz **Continue with LinkedIn** / **Kontynuuj z LinkedIn**.

---

## Co się dzieje po kliknięciu

1. Przekierowanie na LinkedIn (logujesz się tam, jeśli trzeba).  
2. Zgoda na udostępnienie e-maila i profilu.  
3. Powrót do TWIN — konto jest tworzone lub łączone.  
4. Imię i nazwisko z LinkedIn trafia do **profilu kandydata** (możesz dokończyć CV i umiejętności).

---

## Railway (gdy masz API w chmurze)

W Railway → serwis **API** → **Variables** dodaj te same 3 zmienne LinkedIn + ustaw:

- `LINKEDIN_REDIRECT_URI` = `https://TWOJE-API.up.railway.app/api/v1/auth/linkedin/callback`  
- Ten sam adres dodaj w aplikacji LinkedIn (Auth → redirect URLs).  
- `FRONTEND_URL` = adres z Vercel.

---

## Nadal nie działa?

| Objaw | Co zrobić |
|--------|-----------|
| Dalej „coming soon” | Sprawdź status URL powyżej — musi być `configured: true` |
| `redirect_uri` mismatch | Adres w LinkedIn i w `.env` muszą być **identyczne** |
| Brak e-maila | W aplikacji LinkedIn włącz OpenID Connect (nie stary „Sign in with LinkedIn”) |
