# Recruiter decision console visual polish — 2026-06-10

**Branch:** `polish/recruiter-decision-console-visual-2026-06-10`  
**Scope:** Frontend-only visual hierarchy on `/recruiter/inbox`. Accept/decline behavior, auth, PII boundaries unchanged.

---

## Founder issue (production screenshot)

Recruiter inbox worked functionally but read like an internal admin panel:

- Narrow main panel; access code/company selector dominated after load
- Flat candidate cards; tiny match score and evidence chips
- Weak segment tabs and review card CTA
- Generic button styling; decision console header lacked emphasis

---

## Visual changes

| Area | Before | After |
| ---- | ------ | ----- |
| Layout | Access form always full width above queue | Collapsible **Access & company** strip after queue loads |
| Header | Small text block | Premium card: count headline, trust line, stat mini-cards |
| Segments | Tiny rounded pills | Larger workflow tabs with count badges |
| Match score | Small accent pill | Color-coded decision-grade badge (emerald/teal/amber) |
| Evidence | Tiny prefixed chips in one row | Section labels + wrapped chips |
| Review card CTA | Text link “Show review card” | **Otwórz kartę oceny** button with chevron |
| Actions | `text-xs` generic buttons | Primary accept + destructive decline at `text-sm` |

**Files:** `recruiter-inbox-client.tsx`, `recruiter-inbox-visual.ts`, `i18n.ts`, `recruiter-inbox-visual.test.ts`

**Launch stance:** unchanged — public **NO-GO**, auto-apply **PAUSED**, recruiter calendar **NOT LIVE**, external invites **0**.

**Follow-up:** `docs/RECRUITER_INBOX_CONTRAST_READABILITY_FIX_2026-06-10.md` — contrast/readability + PL chip localization.  
**Follow-up:** `docs/RECRUITER_INBOX_READABILITY_LAYOUT_POLISH_2026-06-10.md` — two-zone layout, chip noise reduction, scanability.

---

## Tests

```bash
cd frontend
npm run test:recruiter-inbox-decision
npm run test:recruiter-review-card
npm run test:pii-data-visibility
npm run test:trust-language-guard
npm run lint && npx tsc --noEmit && npm run build
```

---

## Smoke (founder)

1. Open `/recruiter/inbox` → load **Nova Hiring PL** queue.
2. Confirm **“3 kandydatów czeka na decyzję”** (or current count) is visually central.
3. Access strip collapsed; decision console header + segment counts readable.
4. Candidate cards: prominent match score, evidence sections, **Otwórz kartę oceny**.
5. Accepted/rejected rows: badge only, no accept button.
6. No hidden PII; no forbidden claims (AI decides / guaranteed fit).
