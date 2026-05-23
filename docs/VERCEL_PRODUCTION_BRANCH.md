# Vercel — gałąź produkcyjna

**Projekt:** twin-sooty (frontend w `frontend/`)  
**Gałąź produkcyjna:** `cursor/phase1-monorepo-scaffold` (brak `main` na remote — ta gałąź jest źródłem prawdy dla Phase 1)

## Ustawienia (jednorazowo)

1. [Vercel Dashboard](https://vercel.com) → projekt **twin-sooty** → **Settings** → **Git**.
2. **Production Branch** = `cursor/phase1-monorepo-scaffold`.
3. **Root Directory** = `frontend`.
4. **Environment Variables** (Production + Preview):
   - `TWIN_API_BASE_URL` lub `NEXT_PUBLIC_API_URL` = URL API Railway (bez końcowego `/`), np. `https://twin-production-bcd9.up.railway.app`
5. Zapisz i wykonaj **Redeploy** ostatniego zielonego buildu na tej gałęzi.

## Po każdym pushu

1. Sprawdź **Deployments** — status **Ready** (nie tylko Preview).
2. Jeśli Production nie podąża za scaffoldem: **Promote to Production** na ostatnim zielonym deployu lub **Redeploy**.
3. Porównaj wersję na żywo z commitem w GitHub (np. stopka `/status` lub hash w panelu).

## Typowe problemy

| Objaw | Działanie |
|--------|-----------|
| Stary front po pushu | Production Branch ≠ scaffold → popraw i redeploy |
| 502 / brak API | `NEXT_PUBLIC_API_URL` / `TWIN_API_BASE_URL` puste lub złe → popraw env i redeploy |
| Build czerwony | Lokalnie `cd frontend && npm run build`; napraw TS/importy, push ponownie |

## Powiązane

- `docs/P0_CHECKLIST.md` — sekcja Vercel  
- `docs/FOUNDER_TASK_REPORT_2026-05-16_to_today.md` — checklist founder  
- Railway: ta sama gałąź Git co Vercel
