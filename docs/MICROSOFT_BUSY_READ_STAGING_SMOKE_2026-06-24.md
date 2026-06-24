# Microsoft Busy-Read Staging Smoke — Runbook (founder, non-technical)

**Date:** 2026-06-24  
**Audience:** Founder / operator — no terminal expertise required  
**Goal:** Confirm Microsoft busy-read stays **safe on production** (gates OFF) and know how to run staging checks before enabling live read-only busy slots.

---

## PL — Checklist założyciela (krótki)

### Co to jest (prostym językiem)

TWIN może pokazać **read-only bloki zajętości** z kalendarza Microsoft kandydata — **bez** tworzenia spotkań, wysyłania zaproszeń ani zapisu w kalendarzu.

Na **produkcji** to jest celowo **wyłączone**. Aplikacja pokazuje **demo sloty** i uczciwy komunikat „tylko staging”. To jest poprawne i bezpieczne.

### Co musi zostać WYŁĄCZONE na produkcji

| Ustawienie (Railway API) | Na produkcji |
|--------------------------|--------------|
| `MICROSOFT_BUSY_READ_ENABLED` | **false** |
| `MICROSOFT_OAUTH_CONNECT_GATE_ENABLED` | **false** |
| `MICROSOFT_CALENDAR_WRITE_ENABLED` | **false** |

### Checklist przed każdym deployem (dry-run — bez HTTP do prod)

Inżynier uruchamia z folderu `frontend/`:

```bash
TWIN_BUSY_READ_SMOKE_DRY_RUN=1 npm run verify:prod-microsoft-busy-read
```

**Oczekiwany wynik:** PASS — tryb `dry_run_static`, testy statyczne (skrypty, brak logowania tokenów). **Bez** połączenia z produkcją.

### Checklist po deployu (bezpieczny HTTP — bramki OFF)

```bash
TWIN_PROD_BASE_URL=https://twin-sooty.vercel.app npm run verify:prod-microsoft-busy-read
```

**Oczekiwany wynik:** PASS — bramki Microsoft **false**; niezalogowane API zwraca 401; health pokazuje gates OFF.

JWT **nie jest wymagany** dla domyślnej ścieżki bezpiecznej.

### Opcjonalnie: konto testowe z JWT

Jeśli masz JWT testowy w menedżerze haseł (`TWIN_PROD_TEST_JWT`):

```bash
TWIN_PROD_BASE_URL=https://twin-sooty.vercel.app \
  TWIN_PROD_TEST_JWT=<wklej-z-sejfu> \
  npm run verify:prod-microsoft-busy-read
```

**Oczekiwany wynik:** readiness `product_gate_enabled: false`, preview `preview_mode: demo`, zapis interview **403**.

**Nigdy** nie wklejaj JWT na czat, email ani zrzuty ekranu.

### Staging — live busy-read (przyszłość, NIE produkcja)

Tylko po jawnej sesji staging:

1. Na **staging Railway API** ustaw `MICROSOFT_BUSY_READ_ENABLED=true` (write gate nadal **false**).
2. Połącz **testowe** konto Microsoft 365 ze scope **Calendars.Read** tylko.
3. Inżynier uruchamia live smoke:

```bash
TWIN_PROD_BASE_URL=<staging-frontend-url> \
  TWIN_BUSY_READ_SMOKE_ALLOW_LIVE=1 \
  TWIN_PROD_TEST_JWT=<staging-test-jwt> \
  npm run verify:prod-microsoft-busy-read
```

**Uwaga:** `TWIN_BUSY_READ_SMOKE_ALLOW_LIVE=1` jest **wymagane** dla live Graph. **Nie** łącz z `TWIN_BUSY_READ_SMOKE_DRY_RUN=1`.

### Co widzisz w UI

Na powierzchniach gotowości kalendarza (kandydat, board, rekruter, firma, oferta):

- Bursztynowy banner **„Tylko staging — podgląd Microsoft busy-read”** gdy brama live jest wyłączona
- Demo sloty busy ze **zredagowanymi** szczegółami wydarzeń
- **Brak** live przekierowania „Połącz Microsoft” dopóki OAuth connect gate nie jest celowo włączony na staging

### Board checklist (read-only)

Po deploy: `/board/microsoft-busy-read-staging-checklist` — read-only lista kontrolna z linkami do calendar-readiness.

### Twarde zakazy

- Brak sync kalendarza, zapisów Graph, zaproszeń, emaili, wyświetlania tokenów w UI
- Brak włączania live busy-read na produkcji bez zgody założyciela
- Phase 3B, stress, zmiany shell/gate/layout — poza zakresem

### Gdy smoke failuje

| Objaw | Prawdopodobna przyczyna | Działanie |
|-------|-------------------------|-----------|
| `failed alignment` w commit gate | Prod deploy za repo | Poczekaj na deploy Vercel/Railway lub uruchom smoke z pasującego commita |
| Health pokazuje `microsoft_busy_read_enabled: true` na prod | Złe env Railway | Ustaw bramkę z powrotem na **false** natychmiast; powiadom inżynierię |
| Interview write zwraca 200 na prod | Write gate włączony | Ustaw `MICROSOFT_CALENDAR_WRITE_ENABLED=false` na Railway API |

---

## EN — Founder checklist (short)

### What this is (plain language)

TWIN can show **read-only busy time blocks** from a candidate's Microsoft calendar — **without** creating meetings, sending invites, or writing to their calendar.

On **production** this is intentionally **off**. The app shows **demo slots** and honest “staging only” copy. That is correct and safe.

### What stays OFF on production (do not change without a planned staging window)

| Setting (Railway API) | Must be on prod |
|----------------------|-----------------|
| `MICROSOFT_BUSY_READ_ENABLED` | **false** |
| `MICROSOFT_OAUTH_CONNECT_GATE_ENABLED` | **false** |
| `MICROSOFT_CALENDAR_WRITE_ENABLED` | **false** |

Legacy interview write (`POST /calendar/microsoft/interviews`) is **blocked** when `MICROSOFT_CALENDAR_WRITE_ENABLED=false`.

### Pre-deploy checklist (dry-run — no prod HTTP)

Engineering runs from the `frontend/` folder:

```bash
TWIN_BUSY_READ_SMOKE_DRY_RUN=1 npm run verify:prod-microsoft-busy-read
```

**Expected:** PASS — mode `dry_run_static`, static checks only (scripts exist, no token logging). **No** production network calls.

### Post-deploy safety check (safe HTTP — gates OFF)

```bash
TWIN_PROD_BASE_URL=https://twin-sooty.vercel.app npm run verify:prod-microsoft-busy-read
```

**Expected:** PASS with gates OFF — unauthenticated APIs return 401; health shows Microsoft gates **false**.

No JWT required for the default safe path.

### Optional: authenticated check (founder test account)

If you have a production test JWT in your password manager (`TWIN_PROD_TEST_JWT`):

```bash
TWIN_PROD_BASE_URL=https://twin-sooty.vercel.app \
  TWIN_PROD_TEST_JWT=<paste-from-vault> \
  npm run verify:prod-microsoft-busy-read
```

**Expected:** readiness `product_gate_enabled: false`, preview `preview_mode: demo`, interview write **403**.

Never paste the JWT into chat, email, or screenshots.

### Staging-only live busy-read (future — not production)

Only after explicit staging window:

1. On **staging Railway API only**, set `MICROSOFT_BUSY_READ_ENABLED=true` (still keep write gate **false**).
2. Connect a **test** Microsoft 365 work/school account with **Calendars.Read** only.
3. Run live smoke (engineering):

```bash
TWIN_PROD_BASE_URL=<staging-frontend-url> \
  TWIN_BUSY_READ_SMOKE_ALLOW_LIVE=1 \
  TWIN_PROD_TEST_JWT=<staging-test-jwt> \
  npm run verify:prod-microsoft-busy-read
```

**Note:** `TWIN_BUSY_READ_SMOKE_ALLOW_LIVE=1` is **required** for live Graph checks. Do **not** combine with `TWIN_BUSY_READ_SMOKE_DRY_RUN=1`.

### What you should see in the product UI

On calendar readiness surfaces (candidate, board, recruiter, company, offer cards):

- Amber **“Staging-only — Microsoft busy-read preview”** banner when live gate is off
- Demo busy slots with **redacted** event details
- **No** “Connect Microsoft” live redirect unless OAuth connect gate is deliberately enabled on staging

### Board checklist (read-only)

After deploy: `/board/microsoft-busy-read-staging-checklist` — read-only checklist with links to calendar-readiness.

### Hard bans (unchanged)

- No calendar sync, Graph writes, invites, email, or token display in UI
- No enabling live busy-read on production without founder sign-off
- Phase 3B, stress tests, shell/layout changes — out of scope

### If smoke fails

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `failed alignment` in commit gate | Prod deploy behind repo | Wait for Vercel/Railway deploy or run smoke from matching commit |
| Health shows `microsoft_busy_read_enabled: true` on prod | Wrong Railway env | Set gate back to **false** immediately; notify engineering |
| Interview write returns 200 on prod | Write gate on | Set `MICROSOFT_CALENDAR_WRITE_ENABLED=false` on Railway API |

---

## Smoke mode reference (engineering)

| Env var | Value | Effect |
|---------|-------|--------|
| `TWIN_BUSY_READ_SMOKE_DRY_RUN` | `1` | Static checks only — no prod HTTP |
| *(default)* | unset | Safe HTTP — gates OFF verification |
| `TWIN_BUSY_READ_SMOKE_ALLOW_LIVE` | `1` | Enables live Graph probe (test 8) on staging only |
| `TWIN_PROD_TEST_JWT` | vault secret | Optional authenticated checks — never log |

## Related docs

- [MICROSOFT_BUSY_READ_READINESS_2026-06-24.md](./MICROSOFT_BUSY_READ_READINESS_2026-06-24.md)
- [MICROSOFT_CALENDAR_SCOPE_AUDIT_2026-06-24.md](./MICROSOFT_CALENDAR_SCOPE_AUDIT_2026-06-24.md)
- [RAILWAY_PROD_ENV_PL.md](./RAILWAY_PROD_ENV_PL.md) — Microsoft Calendar section

## Launch stance

| Item | Status |
|------|--------|
| Microsoft busy-read live on prod | **NOT SHIPPED** — gates default off |
| Public launch | **NO-GO** |
| Phase 3B | **HARD BLOCKED** |
