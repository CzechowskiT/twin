# Phase 1 — produkcja (ingestia, auto-apply, kalendarz, jakość danych)

Krótki przewodnik **„produkt, nie slajd”**: co włączyć na Railway / VPS i czego nie obiecywać bez kodu.

## 1. Ingestia (Pracuj + Rocketjobs)

1. **PostgreSQL + Redis** w tym samym projekcie co API.
2. **Worker** (`deploy/railway-worker.toml`): `celery -A app.tasks.celery_app worker` — te same zmienne co API (`DATABASE_URL`, `CELERY_BROKER_URL`, scrap limits).
3. **Beat** (`deploy/railway-beat.toml`): `celery -A app.tasks.celery_app beat`.
4. Na API i workerze ustaw **`SCRAPE_BEAT_ENABLED=true`** oraz **`SCRAPE_BEAT_HOUR_UTC`** (godzina dziennego `scrape-all`).
5. Ogranicz portale do Phase 1, np. **`SCRAPE_ENABLED_BOARD_IDS=pracuj,rocketjobs`** (id adapterów jak w `PRIORITY_BOARD_ORDER` w `app/scrapers/registry.py`, nie stringi `job_board` z wierszy Job).

Solo API bez Redis: `CELERY_TASK_ALWAYS_EAGER=true` — scrapy w procesie API; OK na demo, słabe na stały ruch.

## 2. Auto-apply — uczciwy zakres

- Dziś **`POST /api/v1/applications/auto-apply`** odpala Playwright **w żądaniu HTTP** (do kilku minut) — inwestor / beta musi wiedzieć, że długie żądanie to normalne albo użyć nagrania zamiast „na żywo”.
- **Pełna automatyzacja wysyłki** jest sensownie uzbrojona na **Pracuj.pl**; inne portale często `UNSUPPORTED` albo wymagają człowieka (Indeed / CAPTCHA).
- Kolejka Celery pod auto-apply (202 + worker) to osobny increment — dopóki go nie ma, trzymaj komunikat w onboardingu i na demo.

## 3. Kalendarz i przypomnienia

- Zadanie `send_interview_reminder_email` istnieje, ale **wysyłka maili nie jest zaimplementowana** (placeholder + log); **beat pod przypomnienia nie jest włączony domyślnie**.
- Obietnica Phase 1: albo **SMTP + batch wybierający rozmowy** (kod + harmonogram), albo **jawne „przypomnienia w roadmapie”** w copy — bez obu naraz.

## 4. Jakość danych (corpus nie „cicho pada”)

- **Logi workerów**: szukaj `Board scrape failed` / stack trace w Railway → worker.
- **Metryki publiczne**: `GET /api/v1/public/mvp-stats` — m.in. `validated_jobs`, nowe pola **pulsu tygodniowego** (`applications_applied_last_7_days`, `candidates_cv_uploaded_last_30_days`) do porównań tydzień do tygodnia.
- Po zmianie scraperów: smoke `scripts/smoke-p0.sh --mvp` (i z tokenem `--jobs` — patrz `docs/INVESTOR_DEMO_P0.md`).

## 5. CI

GitHub Actions: `.github/workflows/ci.yml` — `pytest` w `backend/`, `npm run build` w `frontend/`. PR bez zielonego CI nie powinien iść na produkcję „ot tak”.

Powiązane: [DEPLOY.md](./DEPLOY.md), [STRIPE.md](./STRIPE.md), [P0_CHECKLIST.md](./P0_CHECKLIST.md).
