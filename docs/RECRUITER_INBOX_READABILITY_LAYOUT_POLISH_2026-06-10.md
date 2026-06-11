# Recruiter inbox readability & layout polish — 2026-06-10

**Branch:** `polish/recruiter-inbox-readability-layout-2026-06-10`  
**Follows:** `docs/RECRUITER_INBOX_CONTRAST_READABILITY_FIX_2026-06-10.md` (PR #72)

---

## Founder scan goal (5 sec per card)

1. Who the candidate is  
2. Match strength  
3. Why worth reviewing  
4. What to verify  
5. What decision to take  

---

## Visual changes

| Area | Change |
| ---- | ------ |
| Card layout | **Two-zone**: content (left) + action (right); stacks on mobile |
| Typography | Larger name (`text-xl`/`2xl`), `text-base` card body, more padding |
| Section labels | Sentence case (`text-sm font-semibold`), not tiny uppercase |
| Evidence chips | Max **2** visible + `+N more` / `+N więcej`; short PL/EN labels |
| Verification chips | Max **2** visible + overflow chip; confidence folded in |
| Match score | **Dominant** badge in action zone (`text-xl`/`2xl`, full width) |
| Status badge | Under match score in action zone |
| Review CTA | Full-width in action zone with chevron + hover/focus |
| Decisions | Stacked full-width accept (primary) + decline (destructive) |
| Page width | `Shell wide` + `Card max-w-none` — uses desktop width |

**Files:** `recruiter-inbox-client.tsx`, `recruiter-inbox-visual.ts`, `recruiter-inbox-chip-copy.ts`, `i18n.ts`, `recruiter-inbox-readability-layout.test.ts`

**Hard bans respected:** no backend/DB/auth changes; accept/decline behavior unchanged; PII hidden; review card + warnings retained.

**Launch stance:** unchanged — public **NO-GO**, auto-apply **PAUSED**.

**Superseded by:** `docs/RECRUITER_INBOX_PREMIUM_CARD_REDESIGN_2026-06-11.md` — decision rail, match score card, signal rows (PR #73 visual rejected).

---

## Tests

```bash
cd frontend
npm run test:recruiter-inbox-readability-layout
npm run test:recruiter-inbox-visual
npm run test:recruiter-inbox-decision
npm run test:recruiter-review-card
npm run test:pii-data-visibility
npm run test:trust-language-guard
npm run lint && npx tsc --noEmit && npm run build
```

---

## Smoke (founder)

1. `/recruiter/inbox` → Nova Hiring PL queue  
2. Cards scan in ~5s: name left, score + status + CTA + actions right  
3. Evidence/verification show ≤2 chips + overflow when needed  
4. Section labels readable (sentence case)  
5. **Otwórz kartę oceny** full-width in action column  
6. Decided rows: badge only, no accept  
7. No PII leakage; no English chip leakage in PL UI  
