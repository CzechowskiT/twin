# TWIN — gdzie wziąć sekrety i gdzie wkleić (founder)

**Zasada:** żadnych prawdziwych kluczy w GitHubie. Wartości trafiają do **Railway → Variables** albo do lokalnego **`.env.railway`** (gitignored), potem skrypt deva (`railway-apply-production-env.sh`) — **bez** wypisywania sekretów w czacie.

**Szybki P0 (kliki):** [FOUNDER_P0_CHECKLIST.md](./FOUNDER_P0_CHECKLIST.md) · **Decyzje biznesowe:** [FOUNDER_OPEN_QUESTIONS.md](./FOUNDER_OPEN_QUESTIONS.md)

---

## Gdzie wklejać (dwa miejsca)

| Miejsce | Kiedy |
|---------|--------|
| **Railway** → serwis **twin** (API) → **Variables** → Raw Editor | Produkcja (źródło prawdy dla API) |
| **`.env.railway`** w katalogu repo (skopiuj z `.env.railway.example`) | Lokalna kopia do skryptów deva; **nigdy** `git add` |

**Worker Celery:** osobny serwis Railway — tylko dev (`railway-apply-worker-env.sh`). Founder na P0: **nie dotykaj**, jeśli `/status` pokazuje worker OK.

**Vercel (twin-sooty):** głównie `NEXT_PUBLIC_API_URL` / `TWIN_API_BASE_URL` — bez sekretów Stripe; checkout idzie przez API.

**Postgres seed (wyjątek):** `DATABASE_PUBLIC_URL` tylko z Railway → Postgres → **Connect** → do terminala deva przy `seed-investor-demo.py` — **nie** jako zmienna serwisu API.

---

## Sekrety — skąd wziąć → jaką zmienną

### S3 / R2 (data room)

| Skąd | Zmienne Railway |
|------|-----------------|
| [Cloudflare R2](https://dash.cloudflare.com/) → bucket → **Manage R2 API tokens** (lub AWS S3 w EU) | `S3_BUCKET_NAME`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT_URL` (R2: URL z panelu), `S3_REGION` (`auto` dla R2) |

Po ustawieniu: redeploy API → [mvp-stats](https://twin-production-bcd9.up.railway.app/api/v1/public/mvp-stats) → `data_room_s3_enabled: true`.  
Pełna lista nazw: [RAILWAY_PROD_ENV_CHECKLIST.md](./RAILWAY_PROD_ENV_CHECKLIST.md).

### Stripe (checkout Premium / Pro)

| Skąd | Zmienne |
|------|---------|
| [Stripe Dashboard](https://dashboard.stripe.com/) → **Developers** → **API keys** (test lub live) | `STRIPE_SECRET_KEY` |
| Stripe → **Webhooks** → endpoint na `https://twin-production-bcd9.up.railway.app/api/v1/billing/webhook` (dev tworzy skryptem) | `STRIPE_WEBHOOK_SECRET` |
| Stripe → **Products** → ceny miesięczne TWIN Premium / Pro | `STRIPE_PRICE_ID_PREMIUM`, `STRIPE_PRICE_ID_PRO` |

Krok po kroku: [STRIPE_FOUNDER_CHECKLIST.md](./STRIPE_FOUNDER_CHECKLIST.md) · [STRIPE_RAILWAY_SETUP.md](./STRIPE_RAILWAY_SETUP.md).

### Mail (waitlist, reset hasła, placement)

| Skąd | Zmienne |
|------|---------|
| [Resend](https://resend.com/api-keys) → klucz `re_…` + zweryfikowany nadawca | `RESEND_API_KEY`, `MAIL_FROM` |

Alternatywa SMTP: [RAILWAY_PROD_ENV_PL.md](./RAILWAY_PROD_ENV_PL.md) §2.

### Google (logowanie + kalendarz)

| Skąd | Zmienne |
|------|---------|
| [Google Cloud Console](https://console.cloud.google.com/) → Credentials → OAuth client (Web) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Redirect URI (whitelist): `…/api/v1/calendar/google/callback` na hoście Railway | `GOOGLE_CALENDAR_REDIRECT_URI` (opcjonalnie — API może wyliczyć z `API_URL`) |

### Microsoft 365 (logowanie + kalendarz Outlook)

| Skąd | Zmienne |
|------|---------|
| [Azure Portal](https://portal.azure.com/) → **App registrations** → nowa aplikacja | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |
| Redirect: `…/api/v1/calendar/microsoft/callback` | `MICROSOFT_CALENDAR_REDIRECT_URI`, `MICROSOFT_TENANT` (`common` lub tenant ID) |

### LinkedIn (logowanie)

| Skąd | Zmienne |
|------|---------|
| [LinkedIn Developer](https://www.linkedin.com/developers/) → aplikacja → Auth | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, redirect na `…/api/v1/auth/linkedin/callback` |

### Apple Sign in

| Skąd | Zmienne |
|------|---------|
| Apple Developer → Identifiers / Keys | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` |

PL: [APPLE_LOGIN_FOUNDER_PL.md](./APPLE_LOGIN_FOUNDER_PL.md).

### Ops / demo (dev generuje, founder przechowuje w 1Password)

| Skąd | Zmienne |
|------|---------|
| `scripts/generate-deploy-secrets.sh` (dev) | `OPS_ADMIN_TOKEN`, `BETA_ADMIN_TOKEN`, `RECRUITER_INBOX_TOKEN`, `PARTNER_EXPORT_TOKEN` |

### Railway / Vercel CLI (tylko lokalnie, opcjonalnie)

| Skąd | Plik |
|------|------|
| Railway → Account → **Tokens** | `RAILWAY_TOKEN` w `.env.railway` |
| Vercel → Account → **Tokens** | `VERCEL_TOKEN` w `.env.railway` |

### Rdzeń API (zwykle już ustawione przez Railway)

`DATABASE_URL`, `REDIS_URL`, `CELERY_BROKER_URL`, `SECRET_KEY`, `API_URL`, `FRONTEND_URL`, `CORS_ORIGINS` — **nie nadpisuj** bez deva.

---

## Kolejność dla nowego founder-a

1. Uzupełnij **S3/R2** (jedyny typowy brakujący P0 przy zielonym `/status`) → [checklist P0](./FOUNDER_P0_CHECKLIST.md).
2. Jeśli Stripe lub Microsoft na `/status` są czerwone — sekcje powyżej + redeploy.
3. Nie commituj `.env.railway`; dev może uruchomić `./scripts/railway-apply-production-env.sh` gdy plik lokalny jest kompletny.

---

*Ostatnia aktualizacja: 2026-05-24.*
