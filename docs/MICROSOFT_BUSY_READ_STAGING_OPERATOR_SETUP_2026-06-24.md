# Microsoft Busy-Read — Staging Operator Setup (2026-06-24)

**Audience:** Founder / operator — bez wiedzy technicznej  
**Cel:** Przygotować **dedicated staging** do późniejszego live smoke read-only busy-read — **bez** uruchamiania Graph teraz, **bez** dotykania produkcji.  
**Powiązane:** [MICROSOFT_BUSY_READ_STAGING_SMOKE_2026-06-24.md](./MICROSOFT_BUSY_READ_STAGING_SMOKE_2026-06-24.md) — runbook smoke (PL+EN)

---

## PL — Checklist operatora

### 1. Czym jest staging (a czym nie jest)

| Środowisko | URL | Użycie busy-read live |
|------------|-----|------------------------|
| **Produkcja frontend** | `https://twin-sooty.vercel.app` | **NIE** — bramki OFF |
| **Produkcja API (Railway)** | `https://twin-production-bcd9.up.railway.app` | **NIE** — bramki OFF |
| **Staging** | **Osobny** Vercel preview/staging + **osobny** Railway API (staging/safe) | **TAK** — tylko tutaj, po świadomej sesji |

Staging to **nie** produkcja pod inną nazwą. Frontend staging musi wskazywać na **staging Railway API**, nie na `twin-production-bcd9`.

### 2. Wartości do zebrania (przed live smoke)

Wypełnij w menedżerze haseł / notatce operatora (nigdy na czat, email, zrzut ekranu):

| # | Wartość | Opis |
|---|---------|------|
| 1 | **Staging frontend URL** | Pełny URL Vercel preview/staging, np. `https://twin-…-git-….vercel.app` |
| 2 | **Staging API / public-health** | Jeśli inny niż proxy z frontu: URL do `GET …/api/v1/health?ops=1` |
| 3 | **Konto testowe staging** | Login/hasło użytkownika testowego **tylko na staging** |
| 4 | **Staging JWT** | Token Bearer po zalogowaniu na staging (DevTools → Application → localStorage lub nagłówek sieci) |
| 5 | **Azure App Registration** | Potwierdzenie, że rejestracja TWIN ma poprawne redirect URI dla **staging API** callback |

Zmienne lokalne (do terminala, nie commituj):

```bash
export TWIN_STAGING_BASE_URL='PASTE_STAGING_FRONTEND_URL_HERE'
export TWIN_STAGING_TEST_JWT='PASTE_STAGING_JWT_HERE'
```

### 3. Wymagane scope Azure (delegated)

- `offline_access`
- `User.Read`
- `Calendars.Read`

### 4. Zakazane scope Azure (delegated)

- `Calendars.ReadWrite`
- `Mail.Send`
- `OnlineMeetings.ReadWrite`

Jeśli którykolwiek zakazany scope jest w tokenie lub w Azure — **STOP**, popraw przed live smoke.

### 5. Bramki env na **staging Railway API**

| Zmienna | Wartość na staging |
|---------|-------------------|
| `MICROSOFT_BUSY_READ_ENABLED` | **true** |
| `MICROSOFT_OAUTH_CONNECT_GATE_ENABLED` | **true** |
| `MICROSOFT_CALENDAR_WRITE_ENABLED` | **false** |

Frontend staging (Vercel): odpowiedniki `NEXT_PUBLIC_MICROSOFT_BUSY_READ_ENABLED=true`, `NEXT_PUBLIC_MICROSOFT_OAUTH_CONNECT_GATE_ENABLED=true` — write **bez** publicznej flagi ON.

### 6. Bramki env na **produkcji** (nie zmieniać)

| Zmienna | Wartość na prod |
|---------|-----------------|
| `MICROSOFT_BUSY_READ_ENABLED` | **false** |
| `MICROSOFT_OAUTH_CONNECT_GATE_ENABLED` | **false** |
| `MICROSOFT_CALENDAR_WRITE_ENABLED` | **false** |

### 7. Komendy terminala (kolejność — później, gdy staging gotowy)

Wszystkie z folderu repo `frontend/`. **Nie** uruchamiaj live kroku bez kompletu wartości z §2.

**Krok A — dry-run (bez HTTP):**

```bash
cd /Users/tomek/Projects/twin/frontend
export TWIN_STAGING_BASE_URL='PASTE_STAGING_FRONTEND_URL_HERE'
TWIN_PROD_BASE_URL="$TWIN_STAGING_BASE_URL" \
TWIN_BUSY_READ_SMOKE_DRY_RUN=1 \
npm run verify:prod-microsoft-busy-read
```

**Krok B — safe HTTP staging (bramki / health):**

```bash
cd /Users/tomek/Projects/twin/frontend
TWIN_PROD_BASE_URL="$TWIN_STAGING_BASE_URL" \
npm run verify:prod-microsoft-busy-read
```

**Krok C — JWT staging bez live Graph:**

```bash
cd /Users/tomek/Projects/twin/frontend
export TWIN_STAGING_TEST_JWT='PASTE_STAGING_JWT_HERE'
TWIN_PROD_BASE_URL="$TWIN_STAGING_BASE_URL" \
TWIN_PROD_TEST_JWT="$TWIN_STAGING_TEST_JWT" \
npm run verify:prod-microsoft-busy-read
```

**Krok D — live read-only staging smoke (Graph):**

```bash
cd /Users/tomek/Projects/twin/frontend
TWIN_PROD_BASE_URL="$TWIN_STAGING_BASE_URL" \
TWIN_PROD_TEST_JWT="$TWIN_STAGING_TEST_JWT" \
TWIN_BUSY_READ_SMOKE_ALLOW_LIVE=1 \
npm run verify:prod-microsoft-busy-read
```

**Uwagi:**

- `TWIN_BUSY_READ_SMOKE_ALLOW_LIVE=1` **tylko** na staging, **nigdy** z prod URL.
- **Nie** łącz `TWIN_BUSY_READ_SMOKE_DRY_RUN=1` z `TWIN_BUSY_READ_SMOKE_ALLOW_LIVE=1`.
- Nazwa `TWIN_PROD_BASE_URL` w skrypcie to historycznie „base URL smoke” — na staging ustawiasz ją na **staging frontend**.

### 8. Warunki STOP (przerwij natychmiast)

| # | Warunek | Działanie |
|---|---------|-----------|
| 1 | Brak staging URL | Zatrzymaj — uzupełnij `TWIN_STAGING_BASE_URL` |
| 2 | Brak JWT przy kroku live (D) | Zatrzymaj — zaloguj test user, zapisz JWT w sejfie |
| 3 | Użyto URL produkcji (`twin-sooty` / `twin-production-bcd9`) jako staging | **STOP** — to nie jest staging |
| 4 | `MICROSOFT_CALENDAR_WRITE_ENABLED=true` (staging lub prod) | **STOP** — ustaw z powrotem **false** |
| 5 | Zakazany scope Azure w tokenie / rejestracji | **STOP** — usuń scope, odśwież token |
| 6 | Token pojawia się w logach terminala / czacie | **STOP** — nie wklejaj JWT; rotuj jeśli wyciekł |
| 7 | W UI/API widać surowy subject/body/location/attendees wydarzeń | **STOP** — zgłoś inżynierii (redakcja) |
| 8 | Invite / email / sync / write do kalendarza | **STOP** — rollback bramek, powiadom inżynierię |

**Twarde zakazy (poza zakresem tej sesji):**

- Phase 3B, controlled multitab, browser stress, headless verification
- Włączenie busy-read / OAuth connect / write na **produkcji**
- Commit secretów, logowanie tokenów

### 9. Co wkleić z powrotem (po smoke)

Tylko to — **bez JWT, bez tokenów, bez haseł**:

```
pass: N
fail: N
skipped: N
health gates: microsoft_busy_read_enabled=…, microsoft_oauth_connect_gate_enabled=…, microsoft_calendar_write_enabled=…
readiness: product_gate_enabled=…, oauth_connect_gate_enabled=…, preview_mode=…
```

Przykład (wartości ilustracyjne):

```
pass: 8
fail: 0
skipped: 2
health gates: microsoft_busy_read_enabled=true, microsoft_oauth_connect_gate_enabled=true, microsoft_calendar_write_enabled=false
readiness: product_gate_enabled=true, oauth_connect_gate_enabled=true, preview_mode=live_read_only
```

---

## EN — Operator checklist (short)

### Staging ≠ production

- **Not** `https://twin-sooty.vercel.app`
- **Not** `https://twin-production-bcd9.up.railway.app`
- **Must be** dedicated Vercel preview/staging frontend + staging Railway API

### Collect before live smoke

Staging frontend URL · API health URL if different · test user · JWT after login · Azure App Registration confirmed.

### Azure scopes

**Required:** `offline_access`, `User.Read`, `Calendars.Read`  
**Forbidden:** `Calendars.ReadWrite`, `Mail.Send`, `OnlineMeetings.ReadWrite`

### Gates

| Environment | busy_read | oauth_connect | write |
|-------------|-----------|---------------|-------|
| Staging | true | true | **false** |
| Production | false | false | false |

### STOP if

Missing staging URL · missing JWT for live step · any production URL used · write gate true · forbidden Azure scope · token in logs · raw event PII · invite/email/sync/write.

### Paste back

pass/fail/skipped counts + public-health gate values only — **no JWT, no secrets**.

---

## Launch stance

| Item | Status |
|------|--------|
| Microsoft busy-read live on prod | **NOT SHIPPED** |
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |

## Related docs

- [MICROSOFT_BUSY_READ_STAGING_SMOKE_2026-06-24.md](./MICROSOFT_BUSY_READ_STAGING_SMOKE_2026-06-24.md)
- [MICROSOFT_BUSY_READ_READINESS_2026-06-24.md](./MICROSOFT_BUSY_READ_READINESS_2026-06-24.md)
- [MICROSOFT_CALENDAR_SCOPE_AUDIT_2026-06-24.md](./MICROSOFT_CALENDAR_SCOPE_AUDIT_2026-06-24.md)
