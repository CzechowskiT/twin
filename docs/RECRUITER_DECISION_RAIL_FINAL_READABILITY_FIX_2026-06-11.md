# Recruiter decision rail — final readability fix — 2026-06-11

**Branch:** `fix/recruiter-decision-rail-final-readability-2026-06-11`  
**Follows:** PR #75 rejection — rail text still looked disabled on production dark theme

---

## Problem

Founder screenshot review: active rail copy still read as low-contrast / disabled:

- **Dopasowanie** / **32%** / **Słabe dopasowanie** — muted label and tone-colored text
- **Oczekuje decyzji** — cyan wash with tinted label
- **Zobacz kartę oceny** — cyan text on cyan bg
- **Odrzuć** — rose-100 looked like a ghost button

---

## Fix (visual tokens only)

| Element | Change |
| ------- | ------ |
| Match label (`Dopasowanie`) | `dark:text-slate-300` |
| Match value (`32%`) | `dark:text-white` |
| Match tone (`Słabe dopasowanie`) | `dark:text-white` — amber/cyan/emerald **border + bg only** |
| Status pill | `dark:text-slate-100`; cyan border/bg accent |
| Review CTA | `dark:text-white`; cyan border/bg; chevron `dark:text-cyan-300` |
| Decline | `dark:text-white`; rose border/bg — active, not disabled |
| Rail shell | Lighter fill (`surface-2/20`), slimmer border/padding |

**Files:** `recruiter-inbox-visual.ts`, `recruiter-match-score-card.tsx` (unchanged API), `recruiter-decision-rail.tsx` (unchanged API), `recruiter-decision-rail-readability.test.ts`

**Unchanged:** layout, accept/decline behavior, PII, review card, i18n strings, backend.

---

## Tests

```bash
cd frontend
npm run test:recruiter-decision-rail-readability
npm run test:recruiter-inbox-premium-card-ui
npm run test:recruiter-inbox-readability-layout
npm run test:recruiter-inbox-visual
npm run test:recruiter-inbox-decision
npm run test:recruiter-review-card
npm run test:pii-data-visibility
npm run test:trust-language-guard
npm run lint && npx tsc --noEmit && npm run build
```

---

## Launch stance

Unchanged — public **NO-GO**, auto-apply **PAUSED**.

**Hard bans respected:** no backend/DB/auth/CSP; accept hidden on decided rows; PII note retained; no forbidden trust claims.
