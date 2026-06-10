# Candidate calendar success alert polish — 2026-06-10

**Branch:** `fix/calendar-success-alert-contrast-2026-06-10`  
**Symptom:** After OAuth redirect to `/dashboard/calendar?calendar_connected=1`, the success banner was nearly invisible on dark theme — low contrast, generic “Połączono” / “Connected” copy only.

**Scope:** Frontend only — no calendar auth, OAuth, provider health, backend, env, DB, or CSP changes.

---

## Fix

| Area | Change |
| ---- | ------ |
| `calendar-connected-success-alert.tsx` | New high-contrast emerald success banner with check icon chip |
| `calendar/page.tsx` | Uses dedicated alert; auto-hides after 7s; strips `calendar_connected` query param |
| `i18n.ts` | PL/EN: `calendarConnectedSuccessTitle` / `calendarConnectedSuccessBody` |
| Premium overlays (es–ja) | Localized success alert copy |

### Copy (PL / EN)

| Key | PL | EN |
| --- | -- | -- |
| Title | Kalendarz połączony | Calendar connected |
| Body | Twoje wydarzenia są teraz widoczne w TWIN. | Your events are now visible in TWIN. |

### Visual (before → after)

- **Before:** Soft `Card` with `dark:bg-emerald-950/40`, single line “Połączono” — washed out on dark background.
- **After:** Emerald border + translucent overlay (`bg-emerald-500/12`, `dark:bg-emerald-500/18`), bright title, muted body, left success icon chip — readable on dark theme.

**Launch stance:** unchanged — public **NO-GO**, auto-apply **PAUSED**, no env/DB/CSP/auth weakening.

---

## Tests

```bash
cd frontend
npm run test:candidate-calendar-success-alert
npm run test:candidate-calendar-post-load-auth
npm run test:candidate-calendar-routing
npm run test:trust-language-guard
npm run lint && npx tsc --noEmit && npm run build
```

---

## Smoke (founder)

1. Connect Google or Microsoft calendar from `/dashboard/calendar`.
2. On redirect with `?calendar_connected=1`, confirm banner: **Kalendarz połączony** + body copy (PL) or EN equivalent.
3. Banner readable on dark theme; auto-dismisses ~7s; URL param removed.
4. Calendar events and session unchanged — no logout loop.
