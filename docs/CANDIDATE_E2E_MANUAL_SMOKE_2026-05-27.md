# Candidate E2E manual smoke (founder-safe, PL)

Cel: prosty, reczny test kandydata bez sekretow i bez operacji ryzykownych.
Zakres tylko odczyt/bezpieczne UI. Zero scrape/manual apply/auto-apply.

## Zasady bezpieczenstwa

1. Nie uzywaj kont produkcyjnych z realnymi danymi kandydatow.
2. Nie wykonuj "Apply now", "Auto-apply", scrape ani triggerow admin.
3. Nie wklejaj tokenow, hasel, cookie ani zrzutow z sekretami do dokumentow.
4. To jest test manualny founder-safe, nie test obciazeniowy.

## Krok po kroku (dokladnie)

1. Otworz `https://twin-sooty.vercel.app`.
2. Wejdz na `/login/candidate`.
3. Zaloguj sie kontem testowym pilota (bez podawania danych tutaj).
4. Po zalogowaniu przejdz na `/dashboard`.
5. Sprawdz, czy dashboard sie laduje i nie pokazuje bledu 500.
6. Otworz sekcje zgody (consent) i potwierdz, ze widzisz stan zgody.
7. Wejdz do sekcji kalendarza (`/dashboard/calendar` lub link w panelu).
8. Sprawdz, czy widac status integracji kalendarza (Google/Microsoft/ICS).
9. Wejdz na `/api/public-health` i potwierdz `status: "ok"`.
10. Zakoncz test bez uruchamiania apply/scrape i zapisz wynik w tabeli ponizej.

## Kryteria PASS / FAIL

- **PASS**:
  - logowanie dziala,
  - dashboard dziala,
  - consent jest widoczny i czytelny,
  - kalendarz jest dostepny,
  - `api/public-health` zwraca `status=ok`,
  - brak 500 w krytycznej sciezce.
- **FAIL**:
  - brak mozliwosci logowania,
  - dashboard nie laduje,
  - consent lub kalendarz sa niedostepne,
  - `public-health` nie daje `ok`,
  - wystapil blad 500 lub zachowanie ryzykowne.

## Tabela wynikow (uzupelnia founder)

| Data (UTC) | Operator | Konto testowe | Login | Dashboard | Consent | Kalendarz | Public health | 500 errors | Wynik koncowy | Dowod (screen/link) | Uwagi |
| ---------- | -------- | ------------- | ----- | --------- | ------- | --------- | ------------- | ---------- | ------------- | ------------------- | ----- |
| _pending_ | founder | pilot-test | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | _pending_ | Pierwszy manualny smoke jeszcze niewykonany |

