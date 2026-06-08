# Interactive demo walkthrough — 2026-06-07

**Branch:** `chore/homepage-login-and-interactive-demo-2026-06-07`  
**Route:** `/demo`  
**Verdict:** Pilot / investor **GO** · Public launch stance **unchanged (NO-GO)**

---

## Summary

Replaced scroll-based nine-section demo with an **eight-step interactive simulation**:

1. Profile from CV  
2. Job scan (market adapters)  
3. Ranked matches (top sample)  
4. Transparency (explainable scores/statuses)  
5. Recruiter inbox + review card (synthetic)  
6. Accept / decline (demo toast only)  
7. Calendar hold (**simulation** — not live booking)  
8. Outcome CTAs (register / wishlist / candidate lane)

**Controls:** Back / Next, progress dots `1/8`, optional autoplay (disabled when `prefers-reduced-motion: reduce`).  
**Data:** `frontend/src/lib/demo-walkthrough-data.ts` only — fictional companies, labeled **SIMULATION · SAMPLE DATA ONLY**.

---

## Homepage nav (Part A)

Logged-out marketing chrome (`MarketingHeader`):

| Desktop center nav | Mobile menu |
| ------------------ | ----------- |
| Kandydat → `/for-candidates` | Same four persona lanes |
| Rekruter → `/for-recruiters` | + Zaloguj się (persona-aware) |
| Firmy → `/for-companies` | + Rejestracja |
| Demo → `/demo` | |
| Zaloguj się → `/login/{persona}` | |

Logged-in app chrome (`AppHeader`): persona badge + **Panel** + **Wyloguj** (no lone “Firma” CTA hiding routes).

---

## Copy safety

- No live auto-apply, delegated submit, guaranteed interview, or “LIVE calendar booking” claims on `/demo`.
- Calendar step copy: **simulation only**; Google sync disclosed as product reality elsewhere.
- Guards: `frontend/scripts/interactive-demo.test.ts`, `verified-readiness-guard.test.ts` patterns.

---

## Tests

```bash
cd frontend
npm run test:homepage-nav
npm run test:interactive-demo
npm run lint && npx tsc --noEmit && npm run build
```

---

## Smoke

```bash
curl -sI https://twin-society.vercel.app/ | head -1
curl -sI https://twin-society.vercel.app/demo | head -1
```

Both expect `HTTP/2 200` after Vercel deploy.

---

## Hard bans (honoured)

No env/DB/CSP/auth weakening · no auto-apply enable · no delegated/public GO · no secrets · no real candidate data · no fake traction metrics.
