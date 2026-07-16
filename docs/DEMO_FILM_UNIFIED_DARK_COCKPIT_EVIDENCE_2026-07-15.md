# DEMO — unified dark cockpit film evidence (2026-07-15 / validated 2026-07-16)

## Intent

Founder: *„cały film chce w tej ciemnej grafice… wszystko w tym samym stylu”* — the **entire** 0–45s product film must use one dark navy glass / neon cockpit visual system. Light ProductShell / white chrome = FAIL.

Also fixed `/demo` hero contrast: title was dark navy on dark navy (`--sales-fg: rgb(15 23 42)` on dark shell).

## Source of truth

| Field | Value |
|-------|-------|
| Branch | `feat/demo-film-unified-dark-cockpit` |
| Scope | Remotion film scenes + sales-demo hero tokens + guards + EN/PL assets |
| Backend / Railway / DB | NONE |
| Gate F | PENDING |
| Launch | NO-GO |

## What changed

1. **Shared dark primitives** — `frontend/remotion/src/components/DarkCockpit.ts` (`glassPanel`, `sceneEnterOpacity`, neon CTA tokens).
2. **ProductShell** — dark glass browser chrome; main no longer `#f1f5f9`.
3. **Theme** — `bgPanel` / `bgSoft` / `text` retargeted to dark navy glass language.
4. **All Remotion scenes** — Inbox, Organize, Candidate, Recruiter, Company (densified), Calendar, Finale (product culmination: calendar of acceptance, not marketing emoji slide).
5. **Visual validator** — blank detection no longer treats dense dark panels as empty; still fails light shells and true dark voids.
6. **Sales demo hero** — `--sales-fg: #f8fafc`, `--sales-muted: #94a3b8`, dark elevated cards; amber sample badge + mint eyebrow unchanged.
7. **Guards** — `interactive-demo-visual-change` tests 12–13 (full-film dark glass + hero contrast).
8. **Assets** — re-rendered `public/demo/twin-product-film-{en,pl}.{mp4,webm}`, posters, VTT.

## Local validation

| Check | Result |
|-------|--------|
| `npm run test:interactive-demo-visual-change` | PASS (13) |
| `npm run test:interactive-demo-guard` | PASS (13) |
| `npm run demo:video:validate` | PASS |
| `npm run demo:video:visual-validate` | PASS |
| `npm run build` | PASS |
| Frame audit ~1.5s EN | Generated under `frontend/reports/demo-frame-audit/unified-dark-cockpit-2026-07-16/` (local evidence; not mass-committed) |

## Hard bans respected

- No founder technical asks
- No bitmap mockup as film background
- No backend / Railway / DB work
- No Gate F YES / Launch GO
- No `\|\| true` / skipped failing tests

## Post-merge production (2026-07-16)

| Field | Value |
|-------|-------|
| PR | [#493](https://github.com/CzechowskiT/twin/pull/493) MERGED |
| Merge SHA | `482e3a44221b2a64c42b39f3d3f6bb03fd99a86f` |
| Vercel prod | READY `dpl_3QdYRX8iDDZ5s48V7FxKHAdwKNcJ` |
| `frontend_commit` | `482e3a44221b2a64c42b39f3d3f6bb03fd99a86f` |
| `api_commit` | `13076064f0424dd1bded371628e51c7d0bcd1ae8` (unchanged; no Railway) |
| Prod film EN | HTTP 200, duration ~45.06s, size 17228988 |
| Hero CSS | `--sales-fg:#f8fafc` on prod `/_next/static/...css` |
| Prod frame meanL (3/8/17/24/33/38/42s) | ~19–23, white% ≤0.1 (no light panels) |
| `verify:production-v3:077` | PASS (Launch NO-GO / Gate F PENDING) |
| `probe:prod-public` ×2 | 110/110 + 110/110 (aggregate 220/220) |

## Decision fields (batch)

| Field | Value |
|-------|-------|
| Full-film dark style DONE | YES (local + prod) |
| Hero contrast FIX | YES (prod CSS confirmed) |
| Gate F | PENDING |
| Launch | NO-GO |
