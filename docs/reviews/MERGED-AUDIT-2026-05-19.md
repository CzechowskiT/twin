# TWIN — Scalony raport audytu technologicznego

**Data:** 2026-05-19  
**Wersja dokumentu:** 2.0 (complete)  
**Źródła:** audyt Cursor (architektura + AI maintainability), audyt bezpieczeństwa (exploity / sprint), `docs/qa/ERRATA-vs-codebase.md`  
**Gałąź referencyjna kodu:** `cursor/phase1-monorepo-scaffold` @ commit `527f764` (lub nowszy na tej gałęzi)  
**Repozytorium developerskie:** `https://github.com/CzechowskiT/twin`  
**Produkcja (frontend):** `https://twin-sooty.vercel.app`  
**API (typowo):** Railway — URL w `NEXT_PUBLIC_API_URL` / `TWIN_API_BASE_URL`

> **Jak używać:** jeden backlog dla CTO i agentów AI. **Sekcja 2 (CRITICAL)** = blocker przed nowymi feature. PoC używaj na **staging**; na produkcji tylko odczyt (health, Vercel UI), nie abuse scrape/webhooków.

---

## Spis treści

1. [Executive summary](#1-executive-summary)
2. [CRITICAL](#2-critical)
3. [WARNINGS](#3-warnings)
4. [AI Architecture Roadmap](#4-ai-architecture-roadmap)
5. [Macierz weryfikacji](#5-macierz-weryfikacji)
6. [Sprint Security (12h)](#6-sprint-security-12h)
7. [Dokumenty powiązane](#7-dokumenty-powiązane)

---

## 1. Executive summary

TWIN to **dojrzały MVP po stronie kandydata** (scraping, matching, aplikacje, kalendarz Google, billing Stripe, placement design), hostowany jako **Next.js na Vercel + FastAPI na Railway**. Produktowa wizja **M2M** (bez pośredników, agenci AI) **nie ma jeszcze osobnej warstwy pracodawcy** w kodzie — nowe funkcje M2M będą doklejane do modułów kandydata, jeśli nie zrobicie splitu domen.

**Ocena skrócona:**

| Obszar | Ocena | Komentarz |
|--------|-------|-----------|
| MVP kandydata | 7.5/10 | Szeroki zakres, sensowne testy backendu (~57 plików pytest) |
| Security (public launch) | 5.5/10 | Podstawowy rate limit jest; webhooki, scrape, JWT, deploy |
| AI maintainability | 4/10 | God files (`i18n`, dashboard, `applications.py`) |
| Operacje deploy | 3/10 | Ryzyko rozjazdu repo Vercel (T vs D) i gałęzi |

**Natychmiast (Faza 0):** deploy drift, `SECRET_KEY` w prod, webhooki ATS, potwierdzenie SHA deployu w Vercel.  
**Tydzień 1:** PoC regression + hardening auth/scrape + OpenAPI.  
**Tydzień 2+:** split domen, frontend pod agentów, szkielet `employer/`.

---

## 2. CRITICAL

Błędy i luki, które należy domknąć **zanim** dodacie kolejne funkcje produktowe. Każdy wpis: status, severity, impact, evidence, PoC, fix, owner, ETA, blocker.

---

### 1. Deploy drift (Vercel `CzechowskiD` vs `CzechowskiT`)

| Pole | Wartość |
|------|---------|
| **Status** | CONFIRMED — operational |
| **Severity** | CRITICAL |
| **Impact** | Kod z właściwego repo/gałęzi **nie trafia** na produkcję; poprawki UI/API wyglądają jak „nie działają” (także w incognito). |
| **Blocker** | **YES** — blokuje weryfikację wszystkich innych fixów |

**Evidence:**

- `README.md` — developerskie repo: **`CzechowskiT/twin`**, branch: **`cursor/phase1-monorepo-scaffold`**
- Lokalny `git remote`: `origin → https://github.com/CzechowskiT/twin.git`
- Vercel (ustawienia z rozmowy): **Connected repository `CzechowskiD/twin`** — przeglądarka: **404** na `github.com/CzechowskiD/twin`
- Vercel Environments → Production: branch **`cursor/phase1-monorepo-scaffold`**, domena **`twin-sooty.vercel.app`**
- Ostatni znany push billing fix: commit **`527f764`** na `origin/cursor/phase1-monorepo-scaffold`

**PoC:**

> **Uwaga:** `GET /api/v1/health` **nie zwraca** `commit_sha` (tylko `status`, `service`, opcjonalnie `db_ok`). Weryfikacja SHA = **Vercel Deployments** + git, nie sam health JSON.

```bash
# 1) Co faktycznie odpowiada frontend (proxy → Railway API)
curl -s "https://twin-sooty.vercel.app/api/v1/health" | jq .
# Oczekiwane: {"status":"ok","service":"twin-api"} — BEZ commit_sha

# 2) Oczekiwany commit na gałęzi docelowej (lokalnie)
git fetch origin cursor/phase1-monorepo-scaffold
git rev-parse origin/cursor/phase1-monorepo-scaffold
# Porównaj z: Vercel → Deployments → Production → Commit (pełny SHA)

# 3) Smoke: czy na produkcji jest nowy billing CSS (po deployu 527f764+)
# DevTools → Elements → szukaj klasy: twin-billing-surface
# Brak klasy przy deployu „starym” = drift potwierdzony
```

**Fix:**

- [ ] Vercel → **Settings → Git** → **Disconnect** (jeśli repo `D` jest błędne)
- [ ] **Connect** → `CzechowskiT/twin` (konto z dostępem do repo)
- [ ] **Settings → Environments → Production** → branch: `cursor/phase1-monorepo-scaffold`
- [ ] **Redeploy** Production z najnowszego commita na tej gałęzi
- [ ] Railway: ten sam branch + root `backend/` (zgodnie z README)
- [ ] Dopisać sekcję **„Single source of deploy truth”** w `docs/DEPLOY.md` (tabela: Vercel repo, branch, Railway service, oczekiwany SHA)
- [ ] *(Opcjonalnie, kod)* Dodać `GIT_COMMIT_SHA` do odpowiedzi health w prod — ułatwia przyszłe PoC

| | |
|--|--|
| **Owner** | DevOps / founder |
| **ETA** | **TODAY** |

---

### 2. Greenhouse webhook unsigned (ATS)

| Pole | Wartość |
|------|---------|
| **Status** | CONFIRMED — code |
| **Severity** | CRITICAL |
| **Impact** | Przy pustym `GREENHOUSE_WEBHOOK_SECRET` każdy może wysłać POST i oznaczyć aplikację jako **HIRED** → placement / potencjalnie fee / dane audytowe. |
| **Blocker** | **YES** — przed public launch i przed billing na placement |

**Evidence:**

```22:24:backend/app/api/integrations_ats.py
def _greenhouse_sig_ok(secret: str, body: bytes, header_sig: str | None) -> bool:
    if not secret.strip():
        return True
```

- Route: `POST /api/v1/integrations/ats/greenhouse` — **bez JWT**, tylko opcjonalny HMAC
- `POST /api/v1/integrations/ats/lever` i `/ashby` — placeholdery **bez weryfikacji** (`return {"status": "ignored"}`)

**PoC:**

```bash
API="https://<RAILWAY_API_HOST>"   # nie frontend — webhook trafia w API

curl -s -w "\nHTTP %{http_code}\n" -X POST \
  "$API/api/v1/integrations/ats/greenhouse" \
  -H "Content-Type: application/json" \
  -d '{"action":"hire","application":{"id":"99999"}}'

# NIEBEZPIECZNIE (secret pusty): HTTP 200, body {"status":"ok"}
# BEZPIECZNIE (secret ustawiony, brak nagłówka): HTTP 403 Invalid signature
```

**Fix:**

- [ ] Ustawić `GREENHOUSE_WEBHOOK_SECRET` w Railway (prod/staging)
- [ ] Zmienić kod: `if not secret.strip(): raise HTTPException(403)` w **production** (lub zawsze)
- [ ] Skonfigurować Greenhouse: nagłówek `X-Greenhouse-Signature` / `X-Hub-Signature-256`
- [ ] Wyłączyć publicznie `/ats/lever` i `/ats/ashby` (404 lub wymagany secret) do czasu implementacji
- [ ] Test: `pytest` + ręczny curl z poprawnym HMAC

| | |
|--|--|
| **Owner** | Backend |
| **ETA** | 1 dzień |
| **Blocker** | YES (prod) |

---

### 3. Default `SECRET_KEY` in production (+ Celery eager)

| Pole | Wartość |
|------|---------|
| **Status** | CONFIRMED — code + config risk |
| **Severity** | CRITICAL |
| **Impact** | Domyślny secret → **podrabialne JWT**; eager Celery na Railway bez Redis → scrape w procesie API, brak kolejki, ryzyko timeoutów. |
| **Blocker** | **YES** — przed jakimkolwiek publicznym ruchem |

**Evidence:**

```46:47:backend/app/config.py
    secret_key: str = "dev-only-change-me"
    access_token_expire_minutes: int = 60 * 24 * 7
```

```69:78:backend/app/config.py
    @model_validator(mode="after")
    def solo_railway_celery_eager(self) -> "Settings":
        ...
        if os.getenv("RAILWAY_ENVIRONMENT") and not (
            (os.getenv("REDIS_URL") or "").strip() or (os.getenv("CELERY_BROKER_URL") or "").strip()
        ):
            self.celery_task_always_eager = True
```

**PoC:**

```bash
# Sprawdź zmienne na Railway (UI — nie loguj wartości w ticketach)
# SECRET_KEY musi być ustawiony, długi, losowy — NIE "dev-only-change-me"
# REDIS_URL / CELERY_BROKER_URL muszą być ustawione jeśli używacie workera

# Po wdrożeniu fail-fast: start API z ENVIRONMENT=production i domyślnym secret
# Oczekiwane: proces kończy się błędem konfiguracji (po implementacji fix)
```

**Fix:**

- [ ] Railway prod: wygenerować `SECRET_KEY` (≥ 32 bajty losowe), **nigdy** nie commitować
- [ ] Kod: `model_validator` — jeśli `environment == "production"` i `secret_key == "dev-only-change-me"` → **raise** przy starcie
- [ ] Railway: plugin Redis + osobny serwis **worker** + **beat** (`deploy/railway-worker.toml`, `railway-beat.toml`)
- [ ] Ustawić `CELERY_TASK_ALWAYS_EAGER=false` jawnie w prod
- [ ] Checklista: `docs/P0_CHECKLIST.md`

| | |
|--|--|
| **Owner** | DevOps + Backend |
| **ETA** | TODAY (secrets) + 1–2 dni (worker) |
| **Blocker** | YES |

---

### 4. Scrape by any authenticated user

| Pole | Wartość |
|------|---------|
| **Status** | CONFIRMED — code |
| **Severity** | CRITICAL |
| **Impact** | Każdy kandydat z JWT może uruchomić **kosztowny** scrape wszystkich boardów (Playwright, Redis, DB) → DoS finansowy / degradacja API. |
| **Blocker** | YES — przed otwarciem rejestracji masowej |

**Evidence:**

```261:265:backend/app/api/jobs.py
@router.post("/scrape/all", response_model=ScrapeAllOut)
def trigger_scrape_all(
    sync: bool = False,
    _user: User = Depends(get_current_user),
) -> ScrapeAllOut:
```

- Analogicznie: `POST /api/v1/jobs/scrape/{board}` — tylko `get_current_user`
- Brak `is_admin`, `plan_tier`, ani osobnego tokenu ops w kodzie

**PoC:**

```bash
API="https://<RAILWAY_API_HOST>"
TOKEN="<JWT_zwykłego_kandydata>"   # TYLKO staging

curl -s -w "\nHTTP %{http_code}\n" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "$API/api/v1/jobs/scrape/pracuj.pl"

# Obecnie: 200/202 + uruchomienie zadania
# Po fixie: 403 Forbidden (lub 401 bez ops token)
```

**Fix:**

- [ ] Wprowadzić `require_ops_user` lub header `X-Ops-Token` == env `SCRAPE_OPS_TOKEN`
- [ ] Dashboard: ukryć przyciski scrape dla non-admin (`NEXT_PUBLIC_SHOW_SCRAPE` tylko z ops)
- [ ] Rate limit per IP/user na endpointach scrape (SlowAPI)
- [ ] Produkcja: scrape tylko z **Celery beat** + ręczny trigger admina

| | |
|--|--|
| **Owner** | Backend |
| **ETA** | 1–2 dni |
| **Blocker** | YES (public beta) |

---

### 5. `localStorage` JWT + XSS + brak server route guard

| Pole | Wartość |
|------|---------|
| **Status** | CONFIRMED — code |
| **Severity** | CRITICAL (dla danych wrażliwych CV / aplikacji) |
| **Impact** | XSS na dowolnej stronie z tokenem → **pełne przejęcie konta**; OAuth przekazuje JWT w **query string**; `/dashboard/*` bez middleware — HTML dostępny bez sesji. |
| **Blocker** | YES — przed enterprise / większą skalą; MEDIUM na zamkniętą beta z zaufanymi userami |

**Evidence:**

- `frontend/src/lib/auth.ts` — klucz `twin_access_token`, `localStorage` → `sessionStorage`
- `frontend/src/app/auth/callback/page.tsx` — `?token=` z URL
- `frontend/src/middleware.ts` — tylko bot-guard, **bez auth**
- ~87% plików `src/**/*.tsx` z `"use client"`

**PoC:**

```bash
# 1) Po zalogowaniu (własne konto testowe) — DevTools Console:
# localStorage.getItem('twin_access_token')
# Jeśli zwraca JWT → każdy XSS ma dostęp do API

# 2) Bez logowania — strona i tak się ładuje:
curl -s -o /dev/null -w "%{http_code}" "https://twin-sooty.vercel.app/dashboard"
# Oczekiwane: 200 HTML (ochrona tylko po stronie klienta/API)

# 3) API bez tokenu — powinno odrzucać:
curl -s -w "\nHTTP %{http_code}\n" "https://twin-sooty.vercel.app/api/v1/auth/me"
# Oczekiwane: 401
```

**Fix:**

- [ ] Krótkoterminowo: CSP + sanityzacja HTML, audit zależności npm
- [ ] Średnioterminowo: sesja **httpOnly** cookie przez BFF (`/api/v1` route handler ustawia cookie)
- [ ] OAuth: one-time code exchange zamiast JWT w query
- [ ] `middleware.ts`: redirect `/dashboard`, `/profile` bez sesji (cookie lub edge session)
- [ ] Dokumentacja zagrożenia w `docs/ARCHITECTURE.md` (sekcja Auth)

| | |
|--|--|
| **Owner** | Frontend + Backend |
| **ETA** | CSP: 1 dzień; cookies: 1–2 tygodnie |
| **Blocker** | PARTIAL (beta vs public) |

---

### 6. Employer / M2M architecture gap

| Pole | Wartość |
|------|---------|
| **Status** | CONFIRMED — product vs code |
| **Severity** | CRITICAL (strategic) |
| **Impact** | Logika M2M będzie doklejana do `applications.py` / `candidates.py` → **niemożliwe** bezpieczne skalowanie zespołu agentów AI i ludzi. |
| **Blocker** | YES — przed epikiem „employer portal” / M2M matching |

**Evidence:**

- `User` model — brak `role` / `account_type` (`backend/app/database/models.py`)
- `backend/app/api/curated_careers.py` — stub lista „Example Corp (placeholder)”
- `POST /api/v1/employers/employer-leads` — publiczny formularz leadów, nie konto firmy
- North Star w `.cursorrules`: kalendarz akceptacji — **brak** API accept/decline po stronie pracodawcy

**PoC:**

```bash
# Brak endpointu typu POST /api/v1/employer/jobs/{id}/propose-slot
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" \
  "https://<API>/api/v1/employer/dashboard"
# Oczekiwane dziś: 404
```

**Fix:**

- [ ] Utworzyć `backend/app/domains/employer/` (puste routery + testy smoke)
- [ ] Dodać `User.role` lub `EmployerAccount` + `deps.require_employer`
- [ ] Front: `/employer/layout.tsx` oddzielony od `PersonaProvider` (marketing)
- [ ] Zgodność z `docs/PLACEMENT_VERIFICATION.md` (state machine)

| | |
|--|--|
| **Owner** | Architect + Product |
| **ETA** | Design: 3 dni; MVP employer: 4–8 tygodni |
| **Blocker** | YES (dla M2M scope) |

---

### 7. God files — AI maintainability risk

| Pole | Wartość |
|------|---------|
| **Status** | CONFIRMED — metrics |
| **Severity** | CRITICAL (for AI-driven development) |
| **Impact** | Agent „naprawia billing” i psuje scrape/kalendarz; konflikty merge; halucynacje kluczy i18n. |
| **Blocker** | YES — przed równoległą pracą **>1 agenta** na frontendzie/backendzie |

**Evidence:**

| Plik | Linie (approx.) |
|------|-----------------|
| `frontend/src/lib/i18n.ts` | ~2 816 |
| `frontend/src/app/dashboard/page.tsx` | ~1 527 |
| `backend/app/api/applications.py` | 836 |
| `backend/app/api/candidates.py` | 826 |
| `backend/app/database/models.py` | 526 |

**PoC:**

```bash
wc -l frontend/src/lib/i18n.ts \
      frontend/src/app/dashboard/page.tsx \
      backend/app/api/applications.py \
      backend/app/api/candidates.py
# Cel po Fazie 2–3: żaden plik aplikacyjny > 500 linii
```

**Fix:**

- [ ] Faza 2–3 roadmap (split domen + dashboard components + i18n JSON)
- [ ] Reguła: max **400 linii** na plik routingu/UI w PR checklist
- [ ] Agent boundaries (Faza 4)

| | |
|--|--|
| **Owner** | Tech lead |
| **ETA** | 2–4 tygodnie |
| **Blocker** | YES (multi-agent) |

---

### 8. Placement IDOR — status i regression

| Pole | Wartość |
|------|---------|
| **Status** | **FIXED** on `phase1` (GET listing); **N/A** for POST `/placement/event` (never shipped) |
| **Severity** | Was HIGH — now **regression watch** |
| **Impact** | Wyciek historii placement / możliwość manipulacji cudzą aplikacją. |
| **Blocker** | NO (jeśli PoC regression przechodzi); YES jeśli testy czerwone |

**Evidence (aktualny kod):**

- `GET /api/v1/applications/{id}/placement-events` — ownership: `applications.py` ~577–591
- `POST .../placement-declare`, `.../placement-verify/start` — ownership w `placement_verification.py`
- `record_placement_event()` — wymaga `owner_user_id` lub `from_magic_link=True` (commit `b9f5f7f`)
- Test: `backend/tests/test_placement_events_access.py`
- **Nie istnieje:** `POST /api/v1/placement/event`, `PlacementEventCreate` schema
- **Nieaktualne docs:** `docs/qa/security-analysis-detailed.md` (`placement.py:168`)

**PoC:**

```bash
API="https://<RAILWAY_API_HOST>"
TOKEN_B="<JWT_user_B>"
APP_ID_A="<application_id_należący_do_user_A>"

# Odczyt historii — musi być 404
curl -s -w "\nHTTP %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN_B" \
  "$API/api/v1/applications/$APP_ID_A/placement-events"

# Deklaracja na cudzej aplikacji — musi być 400/404
curl -s -w "\nHTTP %{http_code}\n" -X POST \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"note":"idor-probe"}' \
  "$API/api/v1/applications/$APP_ID_A/placement-declare"
```

```bash
# Automatyczne testy (lokalnie / CI)
cd backend && pytest tests/test_placement_events_access.py tests/test_placement_verification.py -q
```

**Fix:**

- [ ] Uruchamiać PoC regression po każdym release
- [ ] Oznaczyć `security-analysis-detailed.md` jako SUPERSEDED (placement section)
- [ ] Nie dodawać publicznego `POST /placement/event` bez ownership

| | |
|--|--|
| **Owner** | Backend |
| **ETA** | 30 min per release (testy) |
| **Blocker** | Only if regression fails |

---

## 3. WARNINGS

Dług techniczny — **nie blokuje** hotfixów security z sekcji 2, ale spowalnia sprinty i pracę agentów AI.

---

### W-1. Rate limiting — partial (SlowAPI 5/min)

| Pole | Wartość |
|------|---------|
| **Severity** | MEDIUM |
| **Impact (AI)** | Niski — ale przy skalowaniu API agent może „zapomnieć” o `reset-password` |
| **Roadmap** | Faza 0 (Sprint Day 3) + Faza 1 |
| **Blocker** | NO |

**Stan:** `@limiter.limit("5/minute")` na register, login, login/json, forgot-password (`auth.py`). Test: `test_auth_login_rate_limit.py`.  
**Luki:** `POST /reset-password` bez limitera; `auth_login_rate_limit_per_minute: 30` w config **nieużywane**; limit per instancja (nie Redis).

**Fix:** Faza 0 — dodać limiter na reset-password; rozważyć Redis-backed limit w prod.

---

### W-2. Nieaktualna dokumentacja QA / security

| Pole | Wartość |
|------|---------|
| **Severity** | MEDIUM |
| **Impact (AI)** | **Wysoki** — agent implementuje nieistniejące route (`placement.py:168`) |
| **Roadmap** | Faza 0 (dziś) |
| **Blocker** | NO |

**Fix:** Używać `docs/qa/ERRATA-vs-codebase.md` + ten plik; oznaczyć superseded w `security-analysis-detailed.md` i `audit-report-2026-05-19.md`.

---

### W-3. Potrójny stack matching

| Pole | Wartość |
|------|---------|
| **Severity** | MEDIUM |
| **Impact (AI)** | Agent nie wie, czy zmieniać `matcher.py`, `matching_service.py`, czy `job_matching_v2.py` |
| **Roadmap** | Faza 2 |
| **Blocker** | NO |

**Fix:** Jeden moduł `job_matching.py` z flagami `MATCH_SCORING_V2`, `MATCHING_V2_TFIDF`.

---

### W-4. Duplikacja Celery scrape tasks

| Pole | Wartość |
|------|---------|
| **Severity** | MEDIUM |
| **Impact (AI)** | Zmiana w registry ≠ zmiana w taskach — regresje scrape |
| **Roadmap** | Faza 2 |
| **Blocker** | NO |

---

### W-5. Monolityczny `models.py` (21 tabel)

| Pole | Wartość |
|------|---------|
| **Severity** | MEDIUM |
| **Impact (AI)** | Każda migracja = gigantyczny diff; konflikty merge |
| **Roadmap** | Faza 2 |
| **Blocker** | NO |

---

### W-6. Brak OpenAPI → TypeScript na `phase1`

| Pole | Wartość |
|------|---------|
| **Severity** | MEDIUM |
| **Impact (AI)** | Ręczne typy w `billing/page.tsx` (`PlanRow`, `Me`) — rozjazd z backendem |
| **Roadmap** | Faza 1 |
| **Blocker** | NO |

**Note:** wzorzec jest na gałęzi `cursor/oauth-privacy-dashboard-jobs-i18n` (`api-types.ts`).

---

### W-7. Frontend: 87% client components, brak RSC

| Pole | Wartość |
|------|---------|
| **Severity** | MEDIUM |
| **Impact (AI)** | Większe bundlery; trudniejsze „dodaj stronę” bez `"use client"` |
| **Roadmap** | Faza 3 |
| **Blocker** | NO |

---

### W-8. Vercel proxy `maxDuration = 300`

| Pole | Wartość |
|------|---------|
| **Severity** | LOW–MEDIUM |
| **Impact (AI)** | Niski |
| **Roadmap** | Faza 6 |
| **Blocker** | NO |

**Fix:** Direct `NEXT_PUBLIC_API_URL` dla auth; proxy tylko gdy CORS wymusza.

---

### W-9. Brak security headers / CSP

| Pole | Wartość |
|------|---------|
| **Severity** | MEDIUM |
| **Impact (AI)** | Niski |
| **Roadmap** | Faza 3 + 6 |
| **Blocker** | NO |

---

### W-10. `next/image` i ciężkie assety Unsplash

| Pole | Wartość |
|------|---------|
| **Severity** | LOW |
| **Impact (AI)** | Niski |
| **Roadmap** | Faza 6 |
| **Blocker** | NO |

---

### W-11. JWT TTL 7 dni

| Pole | Wartość |
|------|---------|
| **Severity** | MEDIUM |
| **Impact (AI)** | Niski |
| **Roadmap** | Faza 1 (sesja) |
| **Blocker** | NO |

---

### W-12. Partner export token compare

| Pole | Wartość |
|------|---------|
| **Severity** | LOW |
| **Impact (AI)** | Niski |
| **Roadmap** | Faza 1 |
| **Blocker** | NO |

**Fix:** `hmac.compare_digest` w `partner.py`.

---

### W-13. Kalendarz: cancel bez sync Google

| Pole | Wartość |
|------|---------|
| **Severity** | MEDIUM |
| **Impact (AI)** | Średni — agent może obiecać sync w UI bez API |
| **Roadmap** | Faza 5 / osobny epik |
| **Blocker** | NO |

---

### W-14. CI workflow tylko jako example w `docs/`

| Pole | Wartość |
|------|---------|
| **Severity** | MEDIUM |
| **Impact (AI)** | Brak automatycznego `pytest` na PR = więcej regresji |
| **Roadmap** | Faza 0–1 |
| **Blocker** | NO |

---

### W-15. Brak `ARCHITECTURE.md` i rozszerzonego `DEPLOY.md`

| Pole | Wartość |
|------|---------|
| **Severity** | MEDIUM |
| **Impact (AI)** | **Wysoki** — agenci zgadują strukturę |
| **Roadmap** | Faza 0–1 |
| **Blocker** | NO |

---

## 4. AI Architecture Roadmap

Sześć faz — każda z celem, zadaniami (checkbox), kryteriami sukcesu, ownerem, zależnościami.

---

### Phase 0: Deploy hygiene (TODAY)

| | |
|--|--|
| **Goal** | Jeden pipeline: repo T, branch `cursor/phase1-monorepo-scaffold`, zweryfikowany SHA na Vercel i Railway. |
| **Owner** | DevOps |
| **Dependencies** | Dostęp do Vercel + Railway + GitHub `CzechowskiT/twin` |
| **ETA** | 1–2 dni |

**Tasks:**

- [ ] Naprawić Vercel Git connection (T not D)
- [ ] Production branch = `cursor/phase1-monorepo-scaffold`
- [ ] Railway: ten sam branch, root `backend/`
- [ ] `SECRET_KEY`, Stripe, Greenhouse secrets w prod
- [ ] Uruchomić PoC z CRITICAL §1, §8
- [ ] Utworzyć / uzupełnić `docs/DEPLOY.md` (tabela deploy truth)
- [ ] Oznaczyć superseded docs (sekcja 7)

**Success criteria:**

- [ ] Ostatni Production deploy na Vercel ma commit SHA = `git rev-parse origin/cursor/phase1-monorepo-scaffold`
- [ ] Billing UI zawiera klasę `twin-billing-surface` na produkcji
- [ ] `pytest tests/test_placement_events_access.py` green

---

### Phase 1: OpenAPI contract (Week 1)

| | |
|--|--|
| **Goal** | Frontend i agenci AI używają typów z OpenAPI, nie ręcznych structów. |
| **Owner** | Backend + Frontend |
| **Dependencies** | Phase 0 complete |
| **ETA** | 3–5 dni roboczych |

**Tasks:**

- [ ] Eksport `/openapi.json` z FastAPI
- [ ] `frontend/scripts/codegen-api.sh` → `src/lib/api-schema.ts`, `api-types.ts`
- [ ] Podmienić `Me`, `PlansPublicResponse` w billing na wygenerowane typy
- [ ] `.cursorrules`: zakaz duplikacji typów dla objętych endpointów
- [ ] Smoke test: 10 endpointów zgodnych ze schematem
- [ ] `@limiter` na `reset-password`
- [ ] Security: Greenhouse secret required (kod)

**Success criteria:**

- [ ] `npm run build` bez błędów typów na billing/dashboard
- [ ] PR checklist: „czy regenerowałeś api-schema?”
- [ ] PoC login rate limit + placement regression w CI (lokalnie)

---

### Phase 2: Domain split (Week 2–3)

| | |
|--|--|
| **Goal** | Backend modułowy — max ~400 linii na router; jeden matching; scrape admin-only. |
| **Owner** | Backend |
| **Dependencies** | Phase 1 |
| **ETA** | 8–12 dni |

**Tasks:**

- [ ] Struktura `backend/app/domains/{auth,candidate,application,job,calendar,billing,placement,employer,public}/`
- [ ] Wyciągnąć `applications.py`, `candidates.py` do domen
- [ ] `job_matching.py` — konsolidacja v1/v2/TF-IDF
- [ ] Scrape: `require_ops` + registry-only Celery entrypoints
- [ ] Split `models.py` per domena (opcjonalnie pliki + re-export)

**Success criteria:**

- [ ] Żaden `backend/app/api/*.py` > 500 linii
- [ ] `pytest` backend green (istniejące + nowe smoke)
- [ ] PoC scrape jako zwykły user → 403

---

### Phase 3: Frontend under agents (Week 3–4)

| | |
|--|--|
| **Goal** | Dashboard i i18n rozbite — bezpieczna równoległa praca agentów. |
| **Owner** | Frontend |
| **Dependencies** | Phase 1 (typy) |
| **ETA** | 8–10 dni |

**Tasks:**

- [ ] `dashboard/page.tsx` < 200 linii + `_components/`
- [ ] `i18n/en/*.json`, `i18n/pl/*.json`; dynamic import innych locale
- [ ] Hook `useRequireAuth()` — jeden punkt redirect
- [ ] Marketing/legal → Server Components
- [ ] CSP / security headers w `next.config.ts`

**Success criteria:**

- [ ] `dashboard/page.tsx` < 400 linii
- [ ] `i18n.ts` < 200 linii (loader only)
- [ ] Bundle analyzer: mniejszy initial JS na `/dashboard`

---

### Phase 4: Agent boundaries (Week 4+)

| | |
|--|--|
| **Goal** | Każdy agent ma scope i zakazy — mniej regresji cross-domain. |
| **Owner** | Tech lead |
| **Dependencies** | Phase 2–3 started |
| **ETA** | 2 dni (dokumentacja + rules) |

**Tasks:**

- [ ] Skills: `agent-scrape`, `agent-candidate`, `agent-pipeline`, `agent-billing`, `agent-employer`
- [ ] Każdy skill: pliki, testy (`pytest …`, `npm run build`), definition of done
- [ ] PR template z checkbox „which agent domain?”

**Agent matrix:**

| Agent | Owns | Must NOT touch |
|-------|------|----------------|
| `agent-scrape` | `scrapers/`, `scrape_tasks`, registry | billing, auth |
| `agent-candidate` | profile, CV, matching | scrape, Stripe |
| `agent-pipeline` | applications, placement | scrapers |
| `agent-billing` | Stripe, billing UI | matching, scrape |
| `agent-employer` | `domains/employer/` | auto-apply Playwright |

**Success criteria:**

- [ ] 2 agenty równolegle na różnych PR bez konfliktów w tym samym pliku
- [ ] `.cursor/rules` lub skills w repo

---

### Phase 5: M2M product (long-term)

| | |
|--|--|
| **Goal** | Druga strona rynku — employer accept/decline, kalendarz akceptacji (North Star). |
| **Owner** | Product + full stack |
| **Dependencies** | Phase 2 (`employer/` skeleton), `docs/PLACEMENT_VERIFICATION.md` |
| **ETA** | 4–8 tygodni (epik) |

**Tasks:**

- [ ] `User.role` lub `EmployerAccount`
- [ ] API: propozycje slotów, accept/decline/reschedule
- [ ] Front `/employer/*`
- [ ] Placement state machine w jednym module
- [ ] Outbound `employer_webhook.py` produkcyjnie

**Success criteria:**

- [ ] End-to-end demo: kandydat → propozycja → firma accept → wpis kalendarza
- [ ] Brak nowej logiki employer w `candidates.py`

---

### Phase 6: Vercel performance & observability (ongoing)

| | |
|--|--|
| **Goal** | Szybszy frontend, tańszy proxy, widoczność błędów. |
| **Owner** | DevOps + Frontend |
| **Dependencies** | Phase 0 stable |
| **ETA** | Ciągły |

**Tasks:**

- [ ] Security headers, CSP
- [ ] `next/image` dla hero/marketing
- [ ] Cache policy statyk
- [ ] Opcjonalnie `GIT_COMMIT_SHA` w health
- [ ] Korelacja `X-Request-ID` (już w `api.ts`) z Railway logs

**Success criteria:**

- [ ] Lighthouse performance ≥ ustalony próg na `/`
- [ ] Brak alertów 5xx na proxy bez upstream cause

---

## 5. Macierz weryfikacji

Stan kodu: **`cursor/phase1-monorepo-scaffold` @ `527f764`** (lub nowszy commit na tej gałęzi).

| Issue | Your audit (security) | Cursor audit | Status @ phase1 | PoC in this doc |
|-------|----------------------|--------------|-----------------|-----------------|
| IDOR placement GET | `GET /placement/events/{id}` vulnerable | Fixed — moved to `/applications/.../placement-events` | **Fixed** + test | Yes §8 |
| IDOR placement POST `/placement/event` | POST arbitrary event | N/A — endpoint never existed | **N/A** (service-layer guarded) | Yes §8 |
| Rate limiting auth | „None” | Partial SlowAPI 5/min | **Partial** — login/register/forgot yes; reset-password no | Yes §W-1, Day 3 |
| `auth_login_rate_limit_per_minute` | — | Unused config | **Dead config** | — |
| CSV export memory | Unbounded | Bounded 5000 rows | **Fixed** in code | — |
| Greenhouse webhook unsigned | — | CRITICAL | **Open** if secret empty | Yes §2 |
| Scrape any user | — | CRITICAL | **Open** | Yes §4 |
| Default SECRET_KEY | — | CRITICAL | **Open** if env not set | Yes §3 |
| localStorage JWT | Yes | CRITICAL | **Open** | Yes §5 |
| Deploy T vs D | — | CRITICAL | **Operational** | Yes §1 |
| God files | — | CRITICAL (AI) | **Open** | Yes §7 |
| Employer M2M gap | — | CRITICAL (strategy) | **Open** | Yes §6 |
| `/health/features` OAuth leak | Exposed flags | — | **Removed** (404) | ERRATA |
| Placement magic link path | GET confirm URL | POST `/placement/verify/confirm` | **Current** | ERRATA |
| OpenAPI codegen | — | Roadmap | **Missing on phase1** | Phase 1 |
| Calendar cancel Google sync | Gap | WARNING | **Likely open** | W-13 |
| Partner token timing | — | LOW | **Open** | W-12 |
| Billing narrow cards | UI bug | Fixed in `527f764` | **Fixed** if deploy correct | §1 smoke |
| Multi-replica rate limit | — | — | **Weak** | W-1 |

---

## 6. Sprint Security (12h)

Plan **~12 godzin roboczych** (można rozłożyć na 5 dni po 2–3h). Założenie: Phase 0 deploy najpierw.

---

### Day 1 — Deploy drift + secrets (3h)

**Owner:** DevOps + Backend  
**Goal:** Production buduje właściwy kod; secrets nie są domyślne.

| Task | Command / action | Expected outcome |
|------|------------------|------------------|
| [ ] Vercel repo → `CzechowskiT/twin` | UI | Green connect, no 404 |
| [ ] Production branch | `cursor/phase1-monorepo-scaffold` | Matches README |
| [ ] Redeploy | Vercel Deployments | Status Ready |
| [ ] Compare SHA | Vercel commit vs `git rev-parse origin/cursor/...` | **Equal** |
| [ ] Railway `SECRET_KEY` | Railway Variables | Not `dev-only-change-me` |
| [ ] Smoke billing CSS | DevTools: `twin-billing-surface` | Class present |

```bash
git fetch origin cursor/phase1-monorepo-scaffold
git log -1 --oneline origin/cursor/phase1-monorepo-scaffold
curl -s "https://twin-sooty.vercel.app/api/v1/health" | jq .
```

---

### Day 2 — Webhook security (2h)

**Owner:** Backend  
**Goal:** Unsigned Greenhouse rejected in prod.

| Task | Command / action | Expected outcome |
|------|------------------|------------------|
| [ ] Set `GREENHOUSE_WEBHOOK_SECRET` | Railway | Variable set |
| [ ] Code: reject empty secret | PR | 403 without signature |
| [ ] PoC unsigned POST | curl §2 | 403 |
| [ ] PoC signed POST | Greenhouse test / manual HMAC | 200 |

```bash
cd backend && pytest tests/ -q -k "greenhouse or ats" 2>/dev/null || pytest tests/test_greenhouse_scraper.py -q
```

---

### Day 3 — Rate limiting gaps (2h)

**Owner:** Backend  
**Goal:** Brute force surface reduced.

| Task | Command / action | Expected outcome |
|------|------------------|------------------|
| [ ] Add `@limiter.limit` on `reset-password` | `auth.py` | 6th call → 429 |
| [ ] Verify login 429 test | pytest | Green |
| [ ] Document multi-replica caveat | `DEPLOY.md` | Ops aware |

```bash
cd backend && pytest tests/test_auth_login_rate_limit.py tests/test_auth_integration.py -q
```

```bash
# Manual (staging)
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API/api/v1/auth/login/json" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"x"}'
done
```

---

### Day 4 — Scrape access control (2h)

**Owner:** Backend  
**Goal:** Only ops can trigger scrape.

| Task | Command / action | Expected outcome |
|------|------------------|------------------|
| [ ] Implement `require_ops` or `SCRAPE_OPS_TOKEN` | `jobs.py` | User JWT → 403 |
| [ ] Hide scrape UI for non-ops | `features.ts` / dashboard | No button |
| [ ] PoC as candidate | curl §4 | 403 |

```bash
cd backend && pytest tests/ -q -k "jobs or scrape" 2>/dev/null | tail -20
```

---

### Day 5 — PoC regression suite + docs (3h)

**Owner:** Backend + Tech lead  
**Goal:** Repeatable checks; docs nie wprowadzają agentów w błąd.

| Task | Command / action | Expected outcome |
|------|------------------|------------------|
| [ ] Placement IDOR tests | pytest | Green |
| [ ] Script `scripts/security-poc.sh` (optional) | bundles curls | One command |
| [ ] Update ERRATA | `docs/qa/ERRATA-vs-codebase.md` | Link to this doc |
| [ ] Mark superseded | security-analysis, old audit | Banner at top |
| [ ] Draft `docs/DEPLOY.md` deploy table | commit | Single source |

```bash
cd backend && pytest \
  tests/test_placement_events_access.py \
  tests/test_placement_verification.py \
  tests/test_auth_login_rate_limit.py \
  -q
```

```bash
cd frontend && npm run build
```

**Sprint exit criteria:**

- [ ] All CRITICAL §1–§5 addressed or explicitly accepted for beta
- [ ] Placement regression tests green
- [ ] Deploy SHA verified on Vercel
- [ ] Superseded docs labeled

---

## 7. Dokumenty powiązane

| Dokument | Status | Uwagi |
|----------|--------|--------|
| **`docs/reviews/MERGED-AUDIT-2026-05-19.md`** | **ACTIVE — primary backlog** | Ten plik |
| `docs/qa/ERRATA-vs-codebase.md` | **ACTIVE** | Ścieżki API vs stare audyty |
| `docs/qa/security-analysis-detailed.md` | **SUPERSEDED** | Placement §1 (`placement.py:168`), `/health/features` — nieaktualne |
| `docs/reviews/audit-report-2026-05-19.md` | **SUPERSEDED** | Scalony tutaj; line numbers nie używać |
| `docs/DEPLOY.md` | **ACTIVE — TO EXTEND** | Dodać sekcję Deploy Truth (repo, branch, SHA) |
| `docs/ARCHITECTURE.md` | **TO CREATE** | Diagram: candidate flow, auth, domains, agent map |
| `docs/P0_CHECKLIST.md` | **ACTIVE** | Beta online checklist |
| `docs/PLACEMENT_VERIFICATION.md` | **ACTIVE** | Design M2M / placement |
| `docs/AGENT_SHIPPING_LOG.md` | **ACTIVE** | Historia zmian agentów |
| `.cursorrules` | **ACTIVE** | North Star produktu |

**Banner do wklejenia na górze superseded plików:**

```markdown
> ⚠️ **SUPERSEDED:** Ten dokument jest częściowo nieaktualny.
> Użyj: [MERGED-AUDIT-2026-05-19.md](../reviews/MERGED-AUDIT-2026-05-19.md) oraz [ERRATA-vs-codebase.md](../qa/ERRATA-vs-codebase.md).
```

---

## Pobieranie

**Ścieżka w repo:**

```text
docs/reviews/MERGED-AUDIT-2026-05-19.md
```

**Kopia do Downloads:**

```bash
cp /Users/tomek/Projects/twin/docs/reviews/MERGED-AUDIT-2026-05-19.md ~/Downloads/
```

**PDF (opcjonalnie):**

```bash
cd /Users/tomek/Projects/twin
pandoc docs/reviews/MERGED-AUDIT-2026-05-19.md \
  -o ~/Downloads/MERGED-AUDIT-2026-05-19.pdf \
  --metadata title="TWIN Merged Audit 2026-05-19"
```

---

*Wersja 2.0 — pełny dokument: CRITICAL (8), WARNINGS (15), Roadmap (6 faz), macierz, sprint 5 dni, dokumenty. Nie zastępuje pentestu ani audytu prawnego GDPR.*
