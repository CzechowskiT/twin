# TWIN — checklist P0 founder (jedna strona)

**Cel:** 15–20 minut klików w Railway + Vercel przed rozmową z inwestorem. **Bez terminala** (chyba że dev prosi o seed DB — patrz uwaga `DATABASE_PUBLIC_URL`).

**Powiązane:** [Gdzie wziąć sekrety](./FOUNDER_SECRETS_WHERE.md) · [Otwarte decyzje](./FOUNDER_OPEN_QUESTIONS.md) · [Status na żywo](./FOUNDER_STATUS_LIVE.md)

| Link | Co sprawdza |
|------|-------------|
| [twin-sooty.vercel.app/status](https://twin-sooty.vercel.app/status) | Front + flagi (Stripe, kalendarze, worker) |
| [API …/public/mvp-stats](https://twin-production-bcd9.up.railway.app/api/v1/public/mvp-stats) | Metryki inwestora (MRR, demo, S3) |
| [API …/health?ops=1](https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1) | Pełny audyt backendu (`git_commit`, Celery, mail) |

---

## A. Railway (serwis API **twin**)

1. Zaloguj się na [railway.com](https://railway.com) → projekt TWIN → serwis **twin** (API, nie worker).
2. **Variables** → **Raw Editor** — wklej blok **S3 / R2** (nazwy z [RAILWAY_PROD_ENV_CHECKLIST.md](./RAILWAY_PROD_ENV_CHECKLIST.md)); wartości z [FOUNDER_SECRETS_WHERE.md](./FOUNDER_SECRETS_WHERE.md#s3--r2-data-room).
   ```
   S3_BUCKET_NAME=
   S3_ACCESS_KEY_ID=
   S3_SECRET_ACCESS_KEY=
   S3_ENDPOINT_URL=
   S3_REGION=
   ```
3. **Save** → **Deploy** / **Redeploy** API (poczekaj na zielony deploy).
4. *(Opcjonalnie, tylko gdy dev prosi o seed konta demo w Postgres)*: serwis **Postgres** → **Connect** → skopiuj **`DATABASE_PUBLIC_URL`** do bezpiecznej notatki → przekaż devowi (nie wklejaj do GitHuba). API używa **`DATABASE_URL`** z pluginu — **nie zamieniaj** ich w panelu API.

**Po redeploy:** otwórz [mvp-stats](https://twin-production-bcd9.up.railway.app/api/v1/public/mvp-stats) — oczekuj `data_room_s3_enabled: true` (gdy klucze poprawne).

---

## B. Vercel (projekt **twin-sooty**)

1. [vercel.com](https://vercel.com) → **twin-sooty** → **Settings** → **Git**.
2. **Production Branch** = `cursor/phase1-monorepo-scaffold` → **Save**.
3. **Deployments** — jeśli w kolejce stoi stary build z innej gałęzi: **⋯** → **Cancel** (opcjonalnie, żeby nie mylić podglądu).
4. Ostatni zielony deploy na scaffoldzie → **Redeploy** (albo **Promote to Production** jeśli Production ≠ ostatni push).

Szczegóły: [VERCEL_PRODUCTION_BRANCH.md](./VERCEL_PRODUCTION_BRANCH.md).

---

## C. Weryfikacja (3 linki, ~2 min)

1. [https://twin-sooty.vercel.app/status](https://twin-sooty.vercel.app/status) — Stripe, Microsoft, mail, worker na zielono; `git_commit` zgadza się z ostatnim pushem na scaffold.
2. [https://twin-production-bcd9.up.railway.app/api/v1/public/mvp-stats](https://twin-production-bcd9.up.railway.app/api/v1/public/mvp-stats) — sensowne liczby (`validated_jobs`, `demo_snapshot`).
3. [https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1](https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1) — `status: ok`, `scrape_worker_ready`, kalendarze.

Demo logowania (osobno): [DEMO_LOGIN_FOR_FOUNDER.md](./DEMO_LOGIN_FOR_FOUNDER.md).

---

## Czego **nie** robić

| Nie | Dlaczego |
|-----|----------|
| SSH / shell na Railway | Niepotrzebne do P0; env + redeploy wystarczą |
| Edycja `DATABASE_URL` na API | Psuje połączenie — plugin Postgres ustawia sam |
| Commit `.env.railway` lub wklejanie sekretów do GitHuba | Wyciek; tylko panel Railway / lokalny plik gitignored |
| Reset hasła `czechowski@protonmail.ch` | Twoje konto prod — tylko dev przy seedzie legacy `demo@twin.career` |

Stripe / Microsoft / mail — jeśli `/status` już zielone, **nie powtarzaj** — patrz [STRIPE_FOUNDER_CHECKLIST.md](./STRIPE_FOUNDER_CHECKLIST.md) tylko przy regresji.

---

*Ostatnia aktualizacja: 2026-05-24 · gałąź doc: `cursor/founder-p0-docs`.*
