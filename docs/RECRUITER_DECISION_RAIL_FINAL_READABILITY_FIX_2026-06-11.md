# Recruiter decision rail — forced contrast fix — 2026-06-11

**Branch:** `fix/recruiter-decision-rail-forced-contrast-2026-06-11`  
**Follows:** PR #76 — rail text still unreadable on production screenshot

---

## Root cause

TWIN production runs **`MARKETING_SURFACE = "studio"`** (`src/lib/marketing-surface.ts`). Dark tokens apply via:

```html
<html data-marketing-surface="studio">
```

and `html[data-marketing-surface="studio"] { --foreground: #f8fafc; … }` in `globals.css`.

PR #76 used Tailwind **`dark:text-white`** / **`dark:text-slate-100`** fallbacks. Tailwind `dark:` variants require **`.dark` on `<html>`** or **`prefers-color-scheme: dark`** — neither is set. Studio mode only flips **CSS variables**, so the **light-mode** classes won:

| Element | Applied (broken) | Intended |
| ------- | ---------------- | -------- |
| Słabe dopasowanie | `text-slate-800` | light text |
| Oczekuje decyzji | `text-slate-900` | light text |
| Zobacz kartę oceny | `text-slate-900` | light text |
| Odrzuć | `text-rose-950` | light text |

Only **Zaakceptuj** (`twin-btn-solid`) stayed readable because it uses `--twin-on-accent`, not `dark:`.

---

## Fix (visual tokens only)

Use **`text-[var(--foreground)]`** and **`text-[var(--twin-muted-strong)]`** — these follow studio/heritage without `dark:`.

| Element | Text | Accent (border/bg only) |
| ------- | ---- | ----------------------- |
| Match label | `--twin-muted-strong` | — |
| Match value | `--foreground` | — |
| Match tone | `--foreground` | amber/cyan/emerald card border + bg |
| Status pill | `--foreground` | cyan/emerald/rose border + bg |
| Review CTA | `--foreground` | cyan border + bg; chevron `text-cyan-300` |
| Decline | `--foreground` | rose border + bg |
| Rail shell | — | lighter `surface-raised/25`, `p-3`, `gap-2` |

**Files:** `recruiter-inbox-visual.ts`, `recruiter-decision-rail-readability.test.ts`, `recruiter-inbox-visual.test.ts`

**Unchanged:** components API, accept/decline behavior, PII, review card, i18n, backend.

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

New guards: forbid `text-amber-900`, `text-cyan-700`, `text-slate-900`, etc. on rail tokens; forbid `dark:text-*` as sole readable-text strategy.

---

## Launch stance

Unchanged — public **NO-GO**, auto-apply **PAUSED**.

**Hard bans respected:** no backend/DB/auth/CSP; accept hidden on decided rows; PII note retained; no forbidden trust claims.
