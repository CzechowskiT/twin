# Recruiter inbox premium card redesign — 2026-06-11

**Branch:** `redesign/recruiter-inbox-premium-cards-2026-06-11`  
**Follows:** `docs/RECRUITER_INBOX_READABILITY_LAYOUT_POLISH_2026-06-10.md` (PR #73 rejected on visual quality)

---

## Founder issue

PR #73 improved contrast and layout but still read like patched admin UI — heavy match score blob, chip noise, weak decision workflow. Needed **premium decision console** feel (Linear / Superhuman / fintech review).

---

## Visual changes

| Area | Change |
| ---- | ------ |
| Card surface | Lighter dark card, subtle border, `recruiter-inbox-candidate-card` |
| Layout | Content (left) + **decision rail** (right) — elegant panel, not heavy sidebar |
| Match score | **RecruiterMatchScoreCard** — label (`Dopasowanie`) + large `%` + tone (`Dobre`); subtle emerald/cyan/amber |
| Signals | **RecruiterSignalList** — ✓ positive / ! verification rows; max 2 + `+N więcej w karcie oceny` |
| Review CTA | **Zobacz kartę oceny** — light secondary, cyan/teal border, chevron, focus ring |
| Actions | Confident primary accept + visible decline; decided rows calm (badge only, no accept) |
| i18n | `matchScoreCardLabel`, `reviewCardCtaShort`, `chipOverflowInReviewCard` (PL+EN) |

**Components:** `recruiter-match-score-card.tsx`, `recruiter-signal-list.tsx`, `recruiter-decision-rail.tsx`

**Files:** `recruiter-inbox-client.tsx`, `recruiter-inbox-visual.ts`, `recruiter-inbox-chip-copy.ts`, `i18n.ts`, `recruiter-inbox-premium-card-ui.test.ts`

**Hard bans respected:** no backend/DB/auth/CSP changes; accept/decline behavior unchanged; PII hidden; review card + warnings retained; no fake data.

**Launch stance:** unchanged — public **NO-GO**, auto-apply **PAUSED**.

---

## Tests

```bash
cd frontend
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

## Smoke (founder)

1. `/recruiter/inbox` → Nova Hiring PL queue  
2. Card scan: name + meta left; decision rail right with match score card (label / % / tone)  
3. Signal rows (not chip blobs); overflow `+N więcej w karcie oceny`  
4. **Zobacz kartę oceny** prominent secondary CTA in rail  
5. Pending: accept + decline; decided: status badge only  
6. Expanded review card + PII note unchanged  
7. PL UI: no long English chip leakage
