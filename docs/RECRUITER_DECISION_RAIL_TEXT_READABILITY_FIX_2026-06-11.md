# Recruiter decision rail text readability — 2026-06-11

**Branch:** `fix/recruiter-decision-rail-text-readability-2026-06-11`  
**Follows:** PR #74 (premium card redesign — structure OK, text too muted on dark)

---

## Problem

On dark theme, decision rail copy was hard to read:

- **Oczekuje decyzji** — cyan-tinted label on cyan wash
- **Zobacz kartę oceny** — low-contrast cyan text
- **Odrzuć** — rose-100 looked disabled

---

## Fix (visual tokens only)

| Element | Before | After |
| ------- | ------ | ----- |
| Status badges | Colored text (`dark:text-cyan-50`) | `dark:text-white` / `dark:text-slate-100`; tone via border + bg |
| Review CTA | `dark:text-cyan-50` | `dark:text-slate-100`; cyan on border/bg + chevron icon |
| Decline | `dark:text-rose-100`, weak bg | `dark:text-white`, stronger rose border/bg |
| Match score label | `--twin-muted` | `dark:text-slate-200` |
| Match score tone | emerald/cyan/amber text | `dark:text-slate-100`; tone on card border |
| Focus | generic accent ring | cyan ring (review CTA), rose ring (decline) |

**Files:** `recruiter-inbox-visual.ts`, `recruiter-decision-rail.tsx`  
**Unchanged:** layout, accept/decline behavior, PII, review card, i18n strings, backend.

---

## Tests

```bash
cd frontend
npm run test:recruiter-decision-rail-readability
```

---

## Launch stance

Unchanged — public **NO-GO**, auto-apply **PAUSED**.

**Hard bans respected:** no backend/DB/auth/CSP; accept hidden on decided rows; PII note retained; no forbidden trust claims.
