# Auth role choice first — 2026-06-07

**Branch:** `fix/auth-role-choice-first-2026-06-07`  
**Verdict:** Pilot UX **GO** · Public launch stance **unchanged (NO-GO)**

---

## Summary

Auth entry now shows **role choice before persona-specific forms**:

| Route | Before | After |
| ----- | ------ | ----- |
| Header **Zaloguj się** | `/login/{persona}` (often `/login/company` on company lane) | `/login` — hub with Kandydat / Rekruter / Firma / Inwestor cards |
| Header **Rejestracja** | `/register` (unchanged) | `/register` — hub “Wybierz, jak chcesz zacząć” |
| `/login` | Role hub (`LoginZoneHub`) | Unchanged — confirmed as canonical entry |
| `/register` | Role hub (`RegisterZoneHub`) | Unchanged — register hub title copy aligned |
| `/login/candidate` … `/login/investor` | Persona forms | Unchanged — direct deep links still work |
| `/register/*`, `/companies/signup` | Persona register | Unchanged |
| Logout redirect | `/login/{persona}` | `/login` (role hub) |

Reuses existing `AuthZoneHub` + “Wszystkie opcje logowania / rejestracji” links on persona forms.

---

## Code touchpoints

- `frontend/src/lib/persona-access.ts` — `headerMarketingLoginHref`, `logoutRedirectPath` → `/login`
- `frontend/src/lib/i18n.ts` — `register.hubTitle` PL/EN
- `frontend/scripts/homepage-nav.test.ts` — header href assertions
- `frontend/scripts/auth-role-choice.test.ts` — hub vs form guards

---

## Tests

```bash
cd frontend
npm run test:homepage-nav
npm run test:auth-role-choice
npm run test:persona-access   # if wired in CI
npm run lint && npx tsc --noEmit && npm run build
```

---

## Production smoke (post-merge)

```bash
for p in / /login /register /login/company /login/candidate /login/recruiter; do
  curl -sI "https://twin-sooty.vercel.app$p" | head -1
done
```

Expect HTTP 200 on all; `/login` and `/register` render client-side role hubs (not company-only forms).

---

## Launch stance

Does **not** weaken CSP, auth, env, DB, auto-apply, or delegated apply gates. **Public launch NO-GO** unchanged per `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md`.
