# Phase 3B Multitab Harness Diagnostic Plan — 2026-06-29

**Branch:** `fix/phase3b-multitab-harness` from `cursor/phase1-monorepo-scaffold`  
**Gate E:** **FAIL** (0/20 prod reattempt) · **Gate F:** **PENDING**  
**Launch stance:** **NO-GO** · **P0:** **OPEN** · **Phase 3B:** **FAIL** (harness hardened; product proof not re-run)

**Related:** [Gate E result](./gate-e-phase3b-result-2026-06-28.md) · [Phase 3B verification](./PHASE3B_CONTROLLED_MULTITAB_VERIFICATION_2026-06-17.md) · [evidence index](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## 1. Problem statement

Gate E Phase 3B prod reattempt (2026-06-29) reported **0/20 FAIL** with all routes showing `blank-or-no-content` (HTTP 200, `visibleTextLength=0`, empty `pathname`, CDP null). Post-route commit gate compared stale hardcoded `EXPECTED_PROD_COMMIT=fda7567` against `git_commit` (API SHA `6d6d1e54`) while `frontend_commit` was aligned — causing misleading **COMMIT_MISMATCH** after 20 route failures instead of failing preflight.

Gate D single-tab sequential (**36/36 PASS**) does not transfer to Phase 3B multitab. Harness instrumentation, auth classification, and commit preflight must be fixed before any founder-authorized retry.

**This slice hardens harness diagnostics only. It does NOT claim Phase 3B PASS.**

---

## 2. Root causes identified

| Issue | Symptom | Fix |
|-------|---------|-----|
| Stale `EXPECTED_PROD_COMMIT` | Compared API `git_commit` to hardcoded FE SHA | Remove constant; derive `frontend_commit` from `/api/public-health`; track `api_commit` separately |
| Wrong commit field | `git_commit` ≠ `frontend_commit` on Vercel/Railway split deploy | Preflight uses `frontend_commit` vs repo HEAD / `PLAYWRIGHT_EXPECTED_FRONTEND_COMMIT` |
| Commit gate after routes | 20 blank routes then commit FAIL | **Preflight test** fails first; batch tests skip on `COMMIT_MISMATCH` |
| Missing auth classification | Workspace routes without `TWIN_ACCESS_TOKEN` scored as blank | `token-required` tier → `AUTH_TOKEN_REQUIRED` (PARTIAL), not `BLANK_OR_NO_CONTENT` |
| Thin diagnostics | No title, root, page errors, CDP status, classification enum | Rich `RouteReport` + `phase3b-harness-diagnostics.ts` helper |

---

## 3. Harness changes (Slice 35)

### Commit preflight (prod only)

1. `GET /api/public-health` → `frontend_commit`, `api_commit`, `status`, `db_ok`
2. Compare `frontend_commit` to repo HEAD (or env override)
3. On mismatch → `classification: COMMIT_MISMATCH`, skip all batch tests
4. `api_commit` recorded for operator logs only — not used for FE alignment gate

### Auth route tiers

| Tier | Routes | Without `TWIN_ACCESS_TOKEN` |
|------|--------|----------------------------|
| `public` | `/`, `/demo`, `/for-companies` | Must render content |
| `token-required` | candidate, recruiter, company workspace routes | `AUTH_TOKEN_REQUIRED` (PARTIAL) |
| `auth-gated` | login/register paths | Auth card or redirect acceptable |

### Diagnostic classification enum

`PASS`, `PARTIAL`, `WARN`, `COMMIT_MISMATCH`, `AUTH_TOKEN_REQUIRED`, `HARNESS_INSTRUMENTATION_FAILURE`, `BLANK_OR_NO_CONTENT`, `STUCK_SKELETON`, `HTTP_404`, `NOT_FOUND_PAGE`, `REDIRECT_STORM`, `CONSOLE_BURST`, `PUBLIC_HEALTH_LOOP`, `AUTH_GATE_LOOP`, `MARQUEE_REMOUNT_LOOP`, `HEAP_FAIL`, `DOM_FAIL`, `SAFE_MARQUEE_OVERFLOW`, `FULL_MARQUEE_DOM`

### Per-route diagnostics JSON

`.diagnostics/phase3b-controlled-multitab-{batch}.json` now includes: `httpStatus`, `finalUrl`, `documentTitle`, `visibleTextLength`, `rootPresent`, `consoleErrors`, `pageErrors`, `classification`, `authTier`, `cdpStatus`, `frontendCommitExpected/Actual`, `apiCommitActual`.

### Static guards

- `npm run test:phase3b-harness-diagnostics` — 10 assertions (no browser)
- Extended: `test:phase3b-controlled-multitab`, `test:gate-e-phase3b-result`, `test:launch-readiness-evidence-guard`, `test:readiness-consistency-lock`, `test:p0-browser-memory-multitab-performance`

---

## 4. Explicit non-claims

- **Phase 3B:** remains **FAIL** — Gate E 0/20 not reversed
- **Gate E:** **YES / FAIL** — execution recorded; no second reattempt authorized
- **Gate F:** **PENDING** — no proceed on harness fix alone
- **P0 performance:** **OPEN**
- **Public launch:** **NO-GO**
- **Default CI:** Playwright **DISABLED** in `smoke.yml`
- **No secrets in repo:** `TWIN_ACCESS_TOKEN` env only at run time

---

## 5. Next steps (founder-gated)

1. Deploy harness fix to prod frontend (merge PR).
2. Verify `public-health` `frontend_commit` aligns with scaffold HEAD.
3. Re-run Gate E Phase 3B **only** with founder authorization — set `TWIN_ACCESS_TOKEN` for workspace batches.
4. If public routes still `BLANK_OR_NO_CONTENT` with aligned commit → investigate multitab instrumentation vs product shell (separate from commit gate).
5. Update Gate E result doc only after authorized browser execution — not in this slice.

**No Gate F. No P0 close. No launch GO.**
