# TWIN: integracja z Cursor przy zakazie kosztów bez zgody

Stan: 3 listopada 2026. Poprawka przygotowana i testowana lokalnie, bez aktywacji
agenta, zmiany konfiguracji produkcji, merge, push do gałęzi lub wdrożenia.

## Zweryfikowana baza

- Repozytorium: `CzechowskiT/twin`.
- Baza poprawki: `cursor/phase1-monorepo-scaffold`, commit
  `0f8d07f67e10891832f166ee4fc442d6554b445f`.
- PR #543 pozostaje otwarty; sprawdzony HEAD:
  `aaf3372cecc226ccef79b61b94c31f928b82629a`. Nie jest częścią tej poprawki.
- Istnieje kod połączenia ChatGPT → TWIN MCP/Dispatcher → Cursor Cloud Agents.
  Dostęp do repozytorium nie oznacza, że aplikacja MCP jest podłączona w tym czacie.
- Oficjalna dokumentacja Cursor potwierdza, że Cloud Agents zużywają rozliczane
  użycie modelu. Zadanie „read-only” też uruchamia agenta i nie jest bezkosztowym
  testem integracji.

## Poprawka

Domyślne ustawienie serwera: `AGENT_DISPATCH_BILLABLE_EXECUTION_ENABLED=false`.
Tylko operator kontrolujący konfigurację serwera może je zmienić. Argument MCP,
treść promptu, metadata ani obecność klucza Cursor nie stanowią zgody kosztowej.

| Ścieżka | Zachowanie przy domyślnej blokadzie |
| --- | --- |
| REST/MCP: nowe zadanie, także read-only lub dispatch_now=false | HTTP 403 / błąd MCP `founder_cost_approval_required`; bez nowego rekordu i locka |
| Worker: wcześniej zakolejkowane zadanie | Terminalny `failed` z przyczyną kosztową; zwolnienie locka, bez wywołania Cursor |
| Panel Foundera: automatyczna pętla wykonania | `needs_founder` z przyczyną kosztową; bez automatycznych ponowień |
| Cursor API v1 i v0: utworzenie agenta | Blokada przed żądaniem HTTP |
| Operator: wznowienie operacji | Blokada przed działaniami zewnętrznymi |
| GitHub adapter: zapisy, workflow dispatch, merge | Blokada przed żądaniem HTTP |
| Cursor: odczyt metadanych i anulowanie | Zachowane; nadal wymagają właściwego uwierzytelnienia |
| Nowe narzędzie MCP get_twin_cursor_readiness | Wyłącznie kontrola lokalnej konfiguracji, zakres agent_runs:read; bez wywołań zewnętrznych |

Gotowość raportuje osobno obecność klucza, brak jego zdalnej weryfikacji,
blokadę wykonania oraz brak egzekwowanego budżetu dostawcy. Nie przedstawia samej
obecności sekretu jako działającego połączenia. `/health` zawiera ten sam status.

## Granice tej poprawki

- To blokada wykonania, **nie** licznik wydatków, limit PLN ani rejestr zgód na
  pojedyncze zadanie. Samo ustawienie flagi na true nie dowodzi zgody Foundera.
- Nie potwierdzono aktualnego planu Cursor, dostępnego limitu, działania sekretu,
  aktywnego połączenia MCP w ChatGPT ani konfiguracji produkcyjnego serwera.
- Nie wdrożono tej blokady na produkcji. Nie wolno zakładać, że działający dziś
  Dispatcher już ją egzekwuje.
- Nie blokuje ona istniejących zadań rozpoczętych poza Dispatcherem, ręcznych
  działań w Cursor/GitHub ani opłat za wcześniej działającą infrastrukturę.
- Zachowane NO-GO dla uruchomienia pilota, canary, realnych zaproszeń,
  designation, zwiększania capów i Phase 3B. Status wszystkich P0 nie był
  ponownie audytowany. Brak zgody na merge i produkcyjny deploy.

## Weryfikacja

Regresja obejmuje REST, MCP, kolejkę, bezpośredni klient Cursor v0/v1,
metadane, anulowanie oraz GitHub Operator. Używane są wyłącznie mocki HTTP i
bazy SQLite w pamięci. Proces testów ma zablokowane połączenia sieciowe IPv4/IPv6.
Wynik: 135 testów Dispatchera/Operatora i 29 testów panelu Foundera zaliczonych
(164 różne testy). Zmieniony test wznowienia Operatora sprawdzono także osobno.
Kontrola składni zmienionych modułów i `git diff --check`: PASS.

## Następny etap

Najpierw ustalić sposób podłączenia TWIN MCP do bieżącego konta ChatGPT oraz
przygotować zakres pojedynczego testu. Przed jakimkolwiek płatnym wykonaniem
zweryfikować plan i rzeczywiste mechanizmy limitu Cursor, skutki CI/deploy oraz
przedstawić Founderowi konkretny zakres, limit kosztowy w PLN i warunki zatrzymania.
Do uzyskania zgody flaga pozostaje false; nie podnosić limitów, nie tworzyć
infrastruktury i nie uruchamiać agenta. Wdrożenie zabezpieczenia także wymaga
uprzedniego rozstrzygnięcia ewentualnych kosztów CI/deploy.

## Źródła

- [Repozytorium](https://github.com/CzechowskiT/twin)
- [PR #543](https://github.com/CzechowskiT/twin/pull/543)
- [Cursor Cloud Agents i rozliczanie](https://cursor.com/docs/cloud-agent)
- [Oficjalne endpointy Cursor](https://cursor.com/docs/cloud-agent/api/endpoints)
- [Tworzenie obiektu commitu GitHub](https://docs.github.com/en/rest/git/commits)
- [Referencje GitHub: osobna zmiana gałęzi](https://docs.github.com/en/rest/git/refs)
