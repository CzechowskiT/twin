# Logowanie przez Apple — instrukcja dla founder (TWIN)

**Krótko:** przycisk „Kontynuuj z Apple” na stronie logowania. **Opcjonalne** — TWIN działa też przez e-mail, Google, LinkedIn i GitHub.

**Prod callback (nie zmieniaj):**  
`https://twin-production-bcd9.up.railway.app/api/v1/auth/apple/callback`

---

## A) Czy potrzebuję?

- **Nie musisz** — to dodatek dla użytkowników z iPhone / Mac.
- Wymaga **Apple Developer Program** — ok. **99 USD / rok** ([apple.com/developer](https://developer.apple.com/programs/)).
- Na demo inwestorskim możesz **pominąć** — przycisk Apple **nie pojawia się** na stronie logowania, dopóki wszystkie zmienne `APPLE_*` nie są ustawione na Railway (`apple_oauth_configured: false` w `GET /api/v1/health?ops=1`). Agent nie może zalogować się do Twojego konta Apple Developer — to musisz zrobić Ty.

---

## B) Co skopiować gdzie

Wklej wartości w **Railway → projekt twin → serwis API → Variables**  
(albo w pliku `.env.railway` i napisz agentowi: *„sekrety w .env.railway”*).

| Zmienna Railway | Skąd w Apple Developer | Przykład (nie wklejaj cudzych!) |
|-----------------|------------------------|----------------------------------|
| `APPLE_CLIENT_ID` | Identifiers → **Services ID** (np. `pl.career.twin.web`) | `pl.career.twin.web` |
| `APPLE_TEAM_ID` | Membership → **Team ID** | 10 znaków, np. `AB12CD34EF` |
| `APPLE_KEY_ID` | Keys → klucz „Sign in with Apple” | 10 znaków |
| `APPLE_PRIVATE_KEY` | Plik **.p8** pobrany przy tworzeniu klucza (cała treść od `BEGIN` do `END`) | jednorazowy download |
| `APPLE_REDIRECT_URI` | Już ustawione — **skopiuj dokładnie:** | `https://twin-production-bcd9.up.railway.app/api/v1/auth/apple/callback` |

Po zapisaniu Railway zrobi redeploy (1–2 min).

Alternatywa dla agenta / CLI (sekrety tylko lokalnie, nie w repo):

```bash
APPLE_CLIENT_ID='…' APPLE_TEAM_ID='…' APPLE_KEY_ID='…' \
  APPLE_PRIVATE_KEY="$(cat AuthKey_XXX.p8)" \
  ./scripts/railway-apply-apple-oauth.sh
```

---

## C) Apple Developer — tylko niezbędne kliknięcia

1. Wejdź na [developer.apple.com/account](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles**.
2. **Identifiers → App IDs** → utwórz (lub wybierz) App ID TWIN → włącz **Sign In with Apple** → Save.
3. **Identifiers → Services IDs** → **+** → opis np. „TWIN Web Login” → Identifier = ten sam co `APPLE_CLIENT_ID` → włącz **Sign In with Apple** → Configure:
   - **Primary App ID** — z kroku 2
   - **Domains:** `twin-production-bcd9.up.railway.app`
   - **Return URLs:** `https://twin-production-bcd9.up.railway.app/api/v1/auth/apple/callback`
4. **Keys → +** → nazwa np. „TWIN Apple Login” → zaznacz **Sign In with Apple** → Continue → Register → **Download .p8** (tylko raz!) → zapisz **Key ID**.
5. **Membership** (menu po lewej) → skopiuj **Team ID**.

**Uwaga:** jeśli Apple poprosi o plik weryfikacji domeny — skopiuj treść i napisz agentowi; wdroży plik pod adresem `.well-known/…` na Railway.

---

## D) Test

1. Otwórz [twin-sooty.vercel.app/login](https://twin-sooty.vercel.app/login) — **Kontynuuj z Apple** widać dopiero po kroku B i redeploy. Kliknij → zaloguj się kontem Apple.
2. Status integracji: [twin-sooty.vercel.app/status](https://twin-sooty.vercel.app/status) — wiersz **Apple** powinien być zielony / „configured”.
3. Albo (bez sekretów w odpowiedzi): health API — pole `apple_oauth_configured` = `true`.

---

## Gdy coś nie działa

| Objaw | Co sprawdzić |
|-------|----------------|
| Przekierowanie z błędem | `APPLE_REDIRECT_URI` **identyczny** z Return URL w Apple |
| Brak przycisku Apple na logowaniu | Normalne — UI ukrywa Apple, dopóki `apple_oauth_configured` nie jest `true` |
| Błąd po wejściu w stary link Apple | Użyj e-maila; po wdrożeniu zmiennych przycisk wróci sam |
| Brak e-maila po logowaniu | Przy pierwszym logowaniu Apple musi pokazać e-mail; powtórne logowanie czasem go ukrywa |

Więcej technicznie: [`LINKEDIN_OAUTH.md`](./LINKEDIN_OAUTH.md) (sekcja 8 — Apple). Sekrety ogólnie: [`FOUNDER_SECRETS_WHERE.md`](./FOUNDER_SECRETS_WHERE.md).

---

*Dokument dla founder — bez żargonu. Ostatnia aktualizacja: 2026-05-23.*
