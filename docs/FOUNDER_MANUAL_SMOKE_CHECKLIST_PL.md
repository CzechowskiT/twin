# Founder — manual smoke (13 kroków, PL)

**Cel:** szybka weryfikacja prod bez sekretów w dokumencie i bez ryzykownych akcji.  
**Frontend:** https://twin-sooty.vercel.app  
**Zakaz:** Apply now, auto-apply, scrape, admin triggerów, eksportu haseł/tokenów.

## Kroki 1–13

| # | Akcja | PASS gdy |
|---|--------|----------|
| 1 | Otwórz stronę główną `/` | Ładuje się bez 500; widoczny CTA waitlist/login |
| 2 | Wejdź na `/login/candidate` | Formularz logowania (email + hasło lub ścieżka OAuth) |
| 3 | Zaloguj się kontem testowym pilota (hasło poza tym docsem) | Przekierowanie do workspace/dashboard |
| 4 | Otwórz `/dashboard` | Panel kandydata bez 500; brak „Apply now” / live auto-apply |
| 5 | Sprawdź zgodę / consent (sekcja na dashboardzie lub ustawienia) | Stan zgody czytelny; bez wymuszania wysyłki aplikacji |
| 6 | Otwórz `/dashboard/calendar` | Integracje (Google/Microsoft/ICS) + pusty tydzień ma komunikat, nie błąd |
| 7 | Otwórz `/dashboard/settings/auto-apply` | Copy mówi o harmonogramie/test sweep — **nie** klikaj „run now” |
| 8 | Otwórz `/dashboard/career` | Career compass ładuje się |
| 9 | Otwórz `/dashboard/billing` | Plany / tier bez crashu |
| 10 | Otwórz `/dashboard/identity` | Status tożsamości bez overclaimu KYC |
| 11 | Otwórz `/dashboard/acceptance` + `/profile` | Acceptance + profil bez 500 |
| 12 | Otwórz `/api/public-health` (JSON) | `status: "ok"`, `db_ok: true`, brak tokenów w payloadzie |
| 13 | Otwórz `/status` + opcjonalnie `/workspace/candidate/jobs` | Status deployu OK; jobs wymaga sesji (redirect login gdy wylogowany) |

## Opcjonalnie (bez dodatkowych kroków w tabeli)

- `/dashboard/referrals` — linki poleceń  
- Top 20 → **Nietrafione** → odśwież → ta sama oferta nie wraca (regresja feedbacku)

## Tabela wyników

| Data (UTC) | Operator | 1–13 | 500? | Uwagi |
|------------|----------|------|------|-------|
| | | | | |

## Werdykt

- **PASS smoke:** wszystkie krytyczne kroki 1–13 OK, public-health OK.  
- **Nie oznacza public launch GO** — delegated apply i pełne bramki prawne pozostają osobno (`docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md`).

Powiązane: [CANDIDATE_E2E_MANUAL_SMOKE_2026-05-27.md](./CANDIDATE_E2E_MANUAL_SMOKE_2026-05-27.md)
