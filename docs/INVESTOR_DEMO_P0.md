# P0 — demo przed inwestorem

Ten dokument domyka **minimum operacyjne i techniczne** na dzień spotkania. Szersze wdrożenie beta: [P0_CHECKLIST.md](./P0_CHECKLIST.md), [BETA_ONLINE_PL.md](./BETA_ONLINE_PL.md), [DEPLOY.md](./DEPLOY.md).

---

## 1. Środowisko (dzień przed lub rano w dniu demo)

| Element | Co sprawdzić |
|--------|----------------|
| **Ten sam branch** na Railway (API / worker / beat) i Vercel | Unikniesz „u mnie działało”. |
| **`FRONTEND_URL` / `CORS_ORIGINS`** | Dokładnie URL Vercela (bez literówki, bez brakującego `https://`). |
| **Frontend → API** | `NEXT_PUBLIC_API_URL` albo `TWIN_API_BASE_URL` (proxy) — zgodnie z [P0_CHECKLIST.md](./P0_CHECKLIST.md) sekcja C. |
| **Baza** | Migracje po deployu (`alembic upgrade head` na starcie API — patrz deploy). |
| **Oferty w DB** | Po zalogowaniu feed nie może być pusty: uruchom scrap (panel / `POST …/jobs/scrape/…` / worker+beat). |
| **Konto demo** | Użytkownik z **wszystkimi zgodami** (w tym dopasowanie AI) + **CV**; jeśli na stagingu włączone `AUTO_APPLY_REQUIRE_PREMIUM` — plan Premium lub wyłącz flagę na demo. |
| **Auto-apply (opcjonalnie na żywo)** | `AUTO_APPLY_HEADLESS=true` na serwerze; wcześniej **jedna** udana próba na tej samej ofercie Pracuj co na demo. |

---

## 2. Smoke z terminala (obowiązkowo przed wejściem na salę)

Z katalogu repo:

```bash
chmod +x scripts/smoke-p0.sh
export BASE_URL="https://<TWOJE-API>.up.railway.app"
export DEMO_BEARER_TOKEN="<jwt>"   # opcjonalnie: z sesji zalogowanego konta demo
./scripts/smoke-p0.sh --db --mvp --jobs
```

Samodzielnie: `./scripts/smoke-p0.sh` tylko **health**; `--db` — Postgres; `--mvp` — publiczne `mvp-stats`; `--jobs` — wymaga `DEMO_BEARER_TOKEN`, sprawdza **niepusty** feed walidowanych ofert.

---

## 3. Złota ścieżka (15–20 min mówione)

1. Problem: chaos aplikacji / brak jednego pipeline’u.  
2. **Rejestracja / login** (konto demo już gotowe — szybciej).  
3. **Zgody** — krótko: RODO, regulamin, dane o ofertach, AI (wymagane m.in. pod auto-apply).  
4. **Profil + CV** — bez tego ranking i auto-apply wyglądają źle.  
5. **Feed + filtry** — kilka ofert, **jedna konkretna** (najlepiej Pracuj pod auto-apply).  
6. **Dopasowanie** — score + uzasadnienie (reguły / opcjonalnie warstwy z env).  
7. **Aplikacja** — **Plan A:** link „aplikuj ręcznie” (zawsze działa). **Plan B:** auto-apply tylko jeśli rano przeszedł na stagingu.  
8. **Status w pipeline** — jedno miejsce prawdy.  
9. **Billing / plany** — zgodność z [STRIPE.md](./STRIPE.md); live kwoty z panelu vs copy marketingowy (persona / landing).

---

## 4. Narracja prawda-na-żywo (ok. 30 s)

- Auto-apply: **na żądanie**, **adapter pod portal** (pełna ścieżka wysyłki dziś sensownie na **Pracuj**); inne portale często ręcznie / roadmap.  
- Rocketjobs: **ingestion + ranking** w MVP; nie obiecuj pełnego auto-apply na wszystkich źródłach bez doprecyzowania.

---

## 5. Plan B (obowiązkowy)

- **Nagranie ekranu** (2–3 min) tej samej ścieżki — gdy Wi‑Fi / Pracuj / timeout zawiodą.  
- Drugi hotspot / telefon jako modem.

---

## 6. Po demo

- Notatka: co padło pytaniem bez odpowiedzi → backlog.
