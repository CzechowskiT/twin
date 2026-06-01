# S2 CSP unsafe-inline / unsafe-eval assessment — 2026-06-01

**Decision:** Keep `'unsafe-inline'` and `'unsafe-eval'` in the **narrowed report-only** policy for burn-in.
**Do not implement nonces** in this slice — separate security-plan item; scope too large for burn-in prep.

## Current usage

| Token | Directives | Why present | Prod needed? |
| ----- | ---------- | ----------- | ------------ |
| `'unsafe-inline'` | `script-src`, `style-src` | Next.js inline scripts/styles, React hydration, Tailwind critical CSS | **Likely yes** until nonce middleware |
| `'unsafe-eval'` | `script-src` | Next.js / webpack dev paths; some runtime chunks in dev | **Uncertain in prod** — burn-in will confirm |

## Dev vs prod

| Environment | `unsafe-eval` typical? | Notes |
| ----------- | ---------------------- | ----- |
| `next dev` | Yes | HMR and dev tooling use eval |
| `next build` + Vercel prod | Often **no** user-visible eval | Production bundles are compiled; violations would surface in report-only stream |
| Playwright / CI | Prod build | Use `npm run build && npm start` or preview deploy for representative signal |

## Why nonces are deferred

1. Requires middleware or layout changes to emit per-request `nonce` on `<Script>` / styled-jsx / inline blocks.
2. Must not break OAuth, calendar, Stripe redirects, or cookie consent gating.
3. Enforce flip is blocked on **72h clean report-only** first — narrowing hosts is slice 1; nonce is slice 2 per `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md`.
4. Hard ban: no weaken headers; removing `'unsafe-inline'` without nonces **would break prod** if enforced.

## Burn-in signal to watch

During 72h Railway log triage, flag:

- `violated-directive: script-src` + `blocked-uri: inline` → need nonce slice before enforce
- `violated-directive: script-src` + eval-related blocked-uri → confirm if prod-only or extension noise

## Recommendation for founder

1. Ship **narrowed report-only** (this branch) → deploy to preview.
2. Run 72h log + DevTools checklists.
3. If zero unexpected violations **and** no inline/eval warnings on prod build → enforce flip can be considered **with** `'unsafe-inline'` / `'unsafe-eval'` still present (weaker CSP but gated).
4. Schedule nonce PR **before** removing unsafe tokens — not in this audit.

## Related

- `docs/S2_CSP_EXTERNAL_ORIGIN_INVENTORY_2026-06-01.md`
- `docs/P1_CSP_ENFORCEMENT_PLAN_2026-05-27.md` § script-src / nonce work
