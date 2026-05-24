# Gdzie founder wkleja sekrety TWIN (prod)

**Krótko:** wszystkie klucze produkcyjne trzymasz w pliku **`.env.railway`** w katalogu głównym repozytorium (plik jest w `.gitignore` — **nigdy nie commituj**). Po wklejeniu napisz agentowi: **„sekrety w .env.railway”** — agent uruchomi `./scripts/railway-apply-production-env.sh` i sprawdzi prod.

**Prod API:** https://twin-production-bcd9.up.railway.app  
**Szybki P0 (kliki):** [FOUNDER_P0_CHECKLIST.md](./FOUNDER_P0_CHECKLIST.md) · **Decyzje:** [FOUNDER_OPEN_QUESTIONS.md](./FOUNDER_OPEN_QUESTIONS.md)

**Szybki audyt:** https://twin-sooty.vercel.app/status

---

## Wklej sekrety tutaj

1. Skopiuj szablon: `cp .env.railway.example .env.railway`
2. Otwórz **`.env.railway`** w edytorze (w katalogu głównym projektu, obok `README`).
3. Wklej wartości przy odpowiednich liniach (patrz sekcje poniżej).
4. Zapisz plik.
5. Napisz agentowi: **„sekrety w .env.railway, gotowe”**.

Agent **nie czeka** na sekrety — wdraża kod i dokumentację od razu; Ty uzupełniasz plik kiedy masz chwilę.

---

## Stripe — płatności Premium / Pro

**Co to daje:** Kandydat może kupić plan w aplikacji; inwestor widzi prawdziwy checkout i MRR z Stripe.

**Skąd wziąć:**
- https://dashboard.stripe.com/test/apikeys — klucz **Secret key** (`sk_test_…` na start; później `sk_live_…`)
- https://dashboard.stripe.com/test/webhooks — endpoint webhook → **Signing secret** (`whsec_…`)
- https://dashboard.stripe.com/test/products — ceny miesięczne Premium i Pro (`price_…`), albo uruchom lokalnie: `python3 scripts/stripe-bootstrap-test.py`

**Gdzie wkleić** (linie w `.env.railway`):
- `STRIPE_SECRET_KEY=`
- `STRIPE_WEBHOOK_SECRET=`
- `STRIPE_PRICE_ID_PREMIUM=`
- `STRIPE_PRICE_ID_PRO=` (opcjonalnie)

**Jak agent to wdroży:** `./scripts/railway-apply-production-env.sh` (albo `./scripts/railway-apply-stripe-env.sh`)

**Jak sprawdzić:**  
`curl -s "https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1" | grep stripe_checkout_ready` → `true`  
Albo strona https://twin-sooty.vercel.app/status — wiersz **Stripe**.

---

## Resend — maile (reset hasła, transakcyjne)

**Co to daje:** Użytkownik dostaje maile z TWIN (np. reset hasła) bez Twojej ręcznej pomocy.

**Skąd wziąć:**
- https://resend.com/api-keys — **Create API Key**
- https://resend.com/domains — zweryfikuj domenę nadawcy (albo na start Resend onboarding address)

**Gdzie wkleić:**
- `RESEND_API_KEY=`
- `MAIL_FROM=TWIN <twoj@adres.zweryfikowanej.domeny>`

**Jak agent to wdroży:** `./scripts/railway-apply-production-env.sh`

**Jak sprawdzić:**  
`curl -s "…/api/v1/health?ops=1"` → `"mail_configured": true`  
Strona `/status` — wiersz **Mail**.

---

## Microsoft — logowanie + kalendarz Outlook

**Co to daje:** Kandydaci z kontem firmowym Microsoft mogą się zalogować i podpiąć kalendarz Outlook (zajęte terminy + propozycje spotkań).

**Skąd wziąć:**
- https://portal.azure.com → **Microsoft Entra ID** → **App registrations** → Twoja aplikacja TWIN (lub `./scripts/setup-microsoft-azure.sh` po `az login`)
- **Application (client) ID** → `MICROSOFT_CLIENT_ID`
- **Certificates & secrets** → **New client secret** → `MICROSOFT_CLIENT_SECRET`
- Redirect URI (już w szablonie `.env.railway.example` — muszą się zgadzać w Azure)

**Gdzie wkleić:**
- `MICROSOFT_CLIENT_ID=`
- `MICROSOFT_CLIENT_SECRET=`
- `MICROSOFT_REDIRECT_URI=` (sign-in)
- `MICROSOFT_CALENDAR_REDIRECT_URI=` (kalendarz)
- `MICROSOFT_TENANT=common` (zwykle zostaw)

**Jak agent to wdroży:** `./scripts/railway-apply-production-env.sh`

**Jak sprawdzić:**  
`curl -s "…/health?ops=1"` → `microsoft_oauth_configured: true`, `microsoft_calendar_configured: true`  
Strona `/status` — **Microsoft Calendar**.

---

## S3 / Cloudflare R2 — data room inwestora (pliki PDF, deck)

**Co to daje:** Inwestor pobiera materiały due diligence z aplikacji (prawdziwy upload plików), nie tylko tryb demo.

**Skąd wziąć (polecamy Cloudflare R2 — prostsze niż AWS):**
- https://dash.cloudflare.com → **R2** → **Create bucket**
- R2 → **Manage R2 API tokens** → token z uprawnieniem do bucketu
- **Endpoint** R2 (np. `https://<accountid>.r2.cloudflarestorage.com`)

Alternatywa AWS: https://console.aws.amazon.com/s3/ + IAM access key.

**Gdzie wkleić:**
- `S3_BUCKET_NAME=`
- `S3_ACCESS_KEY_ID=`
- `S3_SECRET_ACCESS_KEY=`
- `S3_ENDPOINT_URL=` (R2 — wymagane; AWS można zostawić puste)
- `S3_REGION=auto`

**Jak agent to wdroży:** `./scripts/railway-apply-production-env.sh` (automatycznie wyłącza tryb demo uploadu gdy trzy klucze są ustawione)

**Jak sprawdzić:**  
`curl -s "…/api/v1/public/mvp-stats"` → `"data_room_s3_enabled": true`, `"data_room_local_demo": false`  
Albo `…/health?ops=1` → `data_room_s3_enabled: true`.

---

## LinkedIn — logowanie (Sign in with LinkedIn)

**Co to daje:** Szybsza rejestracja kandydata przez LinkedIn (już **live** na prod — wklej tylko jeśli rotujesz klucze).

**Skąd wziąć:**
- https://www.linkedin.com/developers/apps → Twoja aplikacja TWIN
- **Auth** → **Application credentials** → Client ID + Client Secret
- **Authorized redirect URLs:** `https://twin-production-bcd9.up.railway.app/api/v1/auth/linkedin/callback`

**Gdzie wkleić:**
- `LINKEDIN_CLIENT_ID=`
- `LINKEDIN_CLIENT_SECRET=`
- `LINKEDIN_REDIRECT_URI=` (jak wyżej)

**Jak agent to wdroży:** `./scripts/railway-apply-production-env.sh`

**Jak sprawdzić:**  
`curl -s "…/health?ops=1"` → `linkedin_oauth_configured: true`  
Strona `/status` — **LinkedIn**.

---

## DATABASE_PUBLIC_URL — tylko skrypty seed na Twoim laptopie

**Co to daje:** Agent może odświeżyć demo inbox rekrutera i profil founder na prod z Twojego komputera (nie trafia na Railway).

**Skąd wziąć:**
- Railway → projekt **twin** → serwis **Postgres** → **Connect** → **Public URL** (nie mylić z `DATABASE_URL` na serwisie API)

**Gdzie wkleić:**
- `DATABASE_PUBLIC_URL=` w **`.env.railway`** (tylko lokalnie, gitignored)

**Jak agent to wdroży:**  
`python3 scripts/ensure-recruiter-inbox-demo.py`  
`python3 scripts/ensure-founder-demo-profile.py`

**Jak sprawdzić:** Inbox https://twin-sooty.vercel.app/recruiter/inbox?company_slug=nova-hiring-pl pokazuje świeże wiersze `applied`.

---

## OPS_ADMIN_TOKEN — opcjonalnie (panel ops / skrypty)

**Co to daje:** Ty lub agent możecie wywołać endpointy ops (ostatni auto-apply, metryki) bez logowania do bazy.

**Skąd wziąć:**
- Wygeneruj silny losowy ciąg (np. `openssl rand -hex 32`) albo `./scripts/generate-deploy-secrets.sh`

**Gdzie wkleić:**
- `OPS_ADMIN_TOKEN=` w `.env.railway` **oraz** Railway → serwis API → Variables (jeśli chcesz ten sam token na prod)

**Jak agent to wdroży:** `./scripts/railway-apply-production-env.sh`

**Jak sprawdzić:**  
`curl -s "…/health?ops=1"` → `ops_admin_configured: true`

---

## RAILWAY_TOKEN — żeby agent mógł wdrożyć bez Twojego logowania

**Co to daje:** Skrypt `railway-apply-production-env.sh` działa z Cursora bez interaktywnego `railway login`.

**Skąd wziąć:**
- https://railway.com/account/tokens → **Create token**

**Gdzie wkleić:**
- `RAILWAY_TOKEN=` w `.env.railway` (lokalnie; opcjonalnie GitHub Actions secret o tej samej nazwie)

**Jak agent to wdroży:** `./scripts/railway-apply-production-env.sh`

**Jak sprawdzić:** Skrypt kończy się komunikatem „Done. Verify” bez błędu auth.

---

## Checklist po wklejeniu

| Sekret | Flaga na prod |
|--------|----------------|
| Stripe | `stripe_checkout_ready: true` |
| Resend | `mail_configured: true` |
| Microsoft | `microsoft_calendar_configured: true` |
| S3/R2 | `data_room_s3_enabled: true` |
| LinkedIn | `linkedin_oauth_configured: true` |
| Scrape corpus | `validated_jobs` > 0 na `/status` i `health?ops=1` |

**Jedna komenda weryfikacji (agent):** `./scripts/verify-prod-health.sh`

---

*Dokument dla founder — bez żargonu infra. Ostatnia aktualizacja: 2026-05-23.*
