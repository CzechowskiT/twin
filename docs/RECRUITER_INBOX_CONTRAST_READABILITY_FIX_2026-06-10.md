# Recruiter inbox contrast & readability fix — 2026-06-10

**Branch:** `fix/recruiter-inbox-contrast-readability-2026-06-10`  
**Follows:** `docs/RECRUITER_DECISION_CONSOLE_VISUAL_POLISH_2026-06-10.md` (PR #71)

---

## Founder issue (production screenshot)

After PR #71, `/recruiter/inbox` still had low-contrast elements on dark theme:

- Match score badges (amber/teal on dark) hard to read
- **Oczekuje decyzji** status pill too weak
- **Otwórz kartę oceny** CTA looked muted
- Evidence/warning chips: dark green/amber text on dark backgrounds
- **Odrzuć** too subtle vs primary accept
- English demo reason strings visible in Polish UI

---

## Fix

| Area | Change |
| ---- | ------ |
| `recruiter-inbox-visual.ts` | Brighter dark-theme tokens for match score, status, chips, review CTA, decline; focus-visible rings |
| `recruiter-inbox-chip-copy.ts` | PL mapping for known Nova Hiring EN reason strings (fallback) |
| `recruiter-inbox-api-route.ts` | Forward `X-Locale` to Railway on inbox load/respond |
| `recruiter-inbox-client.tsx` | Apply new classes; localize chips + review card lines |

### Localization

Primary fix: **proxy forwards `X-Locale`** so backend generates PL copy.  
Fallback: frontend maps known English strings (demo seed) when stale English appears.

Unknown freeform strings pass through unchanged.

**Launch stance:** unchanged — public **NO-GO**, auto-apply **PAUSED**, PII rules unchanged.

**Follow-up:** `docs/RECRUITER_INBOX_READABILITY_LAYOUT_POLISH_2026-06-10.md` — two-zone card layout, chip caps, dominant match score, sentence-case section labels.

---

## Tests

```bash
cd frontend
npm run test:recruiter-inbox-visual
npm run test:recruiter-inbox-decision
npm run test:recruiter-review-card
npm run test:pii-data-visibility
npm run test:trust-language-guard
npm run lint && npx tsc --noEmit && npm run build
```

---

## Smoke (founder)

1. `/recruiter/inbox` → Nova Hiring PL, UI in Polish
2. Match badges readable at a glance (32%, 52%, etc.)
3. **Oczekuje decyzji** clearly visible
4. Evidence/warning chips readable without zoom
5. **Otwórz kartę oceny** obviously clickable
6. **Odrzuć** visible (rose border, not invisible ghost)
7. Demo reasons in Polish, not English leakage
8. Decided rows: no accept button; PII still hidden
