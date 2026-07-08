# Cursor Agent TWIN_ACCESS_TOKEN Loading — Diagnostic & Preflight Fix — 2026-06-29

**Branch:** `fix/cursor-agent-token-loading` from `cursor/phase1-monorepo-scaffold` (post-pull)
**Purpose:** Diagnose and safely fix why `TWIN_ACCESS_TOKEN` is not visible to Cursor-agent/npm/Playwright shells even when a founder has it in `frontend/.env.local` — **harness/tooling fix only**, not a new Gate E Phase 3B prod retry attempt.
**Prior Gate E attempts:** 6 chronological attempts, all **PARTIAL/AUTH_TOKEN_REQUIRED** or **FAIL** — see [gate-e-phase3b-attempt4-with-token-result-2026-06-29.md](./gate-e-phase3b-attempt4-with-token-result-2026-06-29.md) §2 for the full attempt history table.
**This document does NOT:** run any browser test, execute Phase 3B prod/local browser, run Gate D browser, claim Gate E PASS, close P0, set Launch GO, or set Gate F YES.

**Related:** [GATE_E_RETRY_AFTER_HARNESS_FIX_CHECKPOINT_2026-06-29.md](./GATE_E_RETRY_AFTER_HARNESS_FIX_CHECKPOINT_2026-06-29.md) · [gate-e-phase3b-attempt4-with-token-result-2026-06-29.md](./gate-e-phase3b-attempt4-with-token-result-2026-06-29.md) · [LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md](./LAUNCH_READINESS_EVIDENCE_INDEX_2026-06-28.md)

---

## 1. Problem Statement

All four prior with-token/post-harness Gate E retry attempts stopped at `AUTH_TOKEN_REQUIRED` because `TWIN_ACCESS_TOKEN` was **absent from the agent runner's process environment** (`test -n "$TWIN_ACCESS_TOKEN"` → false), even though a founder may have the token saved in `frontend/.env.local` for local `next dev` use. Next.js auto-loads `.env.local` for its own dev/build process, but plain `node` / `tsx` / Playwright test processes launched by a Cursor agent or `npm run` do **not** auto-source that file — so the token silently disappears for e2e harnesses even when it exists on disk.

This document only closes that **tooling gap**. It does **not** attempt, claim, or imply a new Phase 3B prod browser run.

---

## 2. Diagnosis (Part A — safe only, no `cat` of env files)

All checks below print **booleans or existence flags only** — never file contents or token values.

| Check | Command (illustrative) | Result |
|-------|-------------------------|--------|
| `pwd` | `pwd` | `/Users/tomek/Projects/twin` |
| `$SHELL` | `echo $SHELL` | `/bin/zsh` |
| Shell token boolean | `[ -n "$TWIN_ACCESS_TOKEN" ] && echo true \|\| echo false` | `false` |
| Node token boolean | `node -e "console.log(Boolean(process.env.TWIN_ACCESS_TOKEN))"` | `false` |
| Root `.env.local` exists | `[ -f .env.local ]` | `false` |
| `frontend/.env.local` exists | `[ -f frontend/.env.local ]` | `true` |
| Root `.gitignore` covers `.env.local` | `git check-ignore -v .env.local` | matched — `.gitignore:3:.env.local` |
| `frontend/.gitignore` covers `.env.local` | `git check-ignore -v frontend/.env.local` | matched — `frontend/.gitignore:34:.env*` |
| `frontend/.env.local` tracked by git | `git ls-files frontend/.env.local` | empty — **not tracked** |
| Loader (this PR) — token visible after load | `loadLocalTestEnv()` then `Boolean(process.env.TWIN_ACCESS_TOKEN)` | `false` |

**Root cause confirmed:** `frontend/.env.local` exists and is correctly gitignored/untracked, but a plain Node/Playwright process run by the Cursor agent does not read it — hence `AUTH_TOKEN_REQUIRED` on every prior harness attempt, independent of whether a founder actually saved a token in that file. Separately, **this workspace's current `frontend/.env.local` does not itself define a non-empty `TWIN_ACCESS_TOKEN`** — the loader in this PR correctly reports `tokenPresent: false` after loading it. Both facts are booleans only; the file's contents are never printed, logged, or committed.

---

## 3. Implementation

### 3.1 `frontend/e2e/helpers/load-local-test-env.ts`

New helper, `loadLocalTestEnv(options?)`:

- Loads `KEY=VALUE` pairs from **root `.env.local`** then **`frontend/.env.local`**, in that deterministic order.
- Values already present in the target env (defaults to `process.env`) **always win** — an explicitly exported `TWIN_ACCESS_TOKEN` (CI, prod runners, founder shell export) is never overridden by a file.
- Tiny hand-rolled parser (no new dependency) — supports comments, blank lines, `export ` prefix, and single/double-quoted values.
- Missing files are a no-op, not an error — safe to call unconditionally in any environment (prod, CI, empty agent shell).
- Returns metadata only: `loadedFiles: string[]` (absolute paths, no contents), `tokenPresent: boolean`, `sourceCandidates: { rootEnvLocal: boolean; frontendEnvLocal: boolean }`. **Never returns or logs the token value itself.**

### 3.2 Wiring — `frontend/e2e/phase3b-controlled-multitab.spec.ts`

`loadLocalTestEnv()` is called once, immediately before `TWIN_ACCESS_TOKEN` is read into `ACCESS_TOKEN`, so any Cursor-agent/npm run of this spec now sees the same token a founder's `next dev` process would see — without changing prod/CI behavior (env vars already exported there are untouched).

### 3.3 `frontend/scripts/cursor-agent-token-preflight.test.ts`

New static guard (`npm run test:cursor-agent-token-preflight`) — verifies the loader's precedence rules, deterministic load order, no-op-on-missing-file behavior, and that it never logs secret values, using fixture files in a temp directory (never touching real `.env.local` contents). Also re-runs the Part A booleans as automated assertions and confirms the spec wiring order.

---

## 4. Safety / Hard Bans Honoured

| Ban | Honoured |
|-----|----------|
| No browser tests run | Confirmed — no Playwright execution in this PR |
| No Phase 3B prod/local browser | Not run |
| No Gate D browser | Not run |
| No stress/CPU storm | Not run |
| No print/log/commit of token values | Loader and tests assert `console.*` never touches secret content; only booleans/paths appear anywhere in code, tests, or this doc |
| No commit of `.env.local` | Verified untracked (`git ls-files`) at both root and `frontend/`; `.gitignore` coverage asserted by static guard |
| No secrets in docs/package.json | This doc and `package.json` contain no token values |
| No backend/API/auth/DB/env/`smoke.yml` changes | Confirmed — diff limited to `frontend/e2e/`, `frontend/scripts/`, `frontend/package.json`, and `docs/` |
| No Gate E PASS claim | Not claimed — see §6 |
| No P0 close | P0 remains **OPEN** |
| No Launch GO | Launch remains **NO-GO** |
| No Gate F YES | Gate F remains **PENDING** |

---

## 5. Usage

For a founder or agent running Phase 3B locally or against prod:

1. Put `TWIN_ACCESS_TOKEN=<value>` in `frontend/.env.local` (or root `.env.local`) — never commit this file.
2. Run the harness as usual, e.g. `cd frontend && PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:phase3b-controlled-multitab-prod` — the spec now loads the token automatically before its preflight check.
3. To sanity-check token visibility without running any browser: `cd frontend && npx --yes tsx -e "import('./e2e/helpers/load-local-test-env.ts').then(m => console.log(JSON.stringify({tokenPresent: m.loadLocalTestEnv().tokenPresent})))"` — prints a boolean only.

---

## 6. Gate Status (unchanged by this PR)

| Gate | Status |
|------|--------|
| **Gate D** | **YES / PASS** — prod browser 36/36 (unchanged, no new run) |
| **Gate E** | **YES / FAIL** (prior 0/20) — post-harness/with-token retries remain **PARTIAL/AUTH_TOKEN_REQUIRED** (6 attempts, no new browser evidence from this PR) |
| **Phase 3B** | **FAIL** — no new browser evidence; prior 0/20 unchanged |
| **Gate F** | **PENDING** |
| **Launch stance** | **NO-GO** |
| **P0 performance** | **OPEN** |

This PR only removes a **harness precondition failure mode** (token not visible to the agent process). It does **not** retry Phase 3B, does **not** prove a token exists in this workspace's `frontend/.env.local` beyond the `tokenPresent: false` boolean recorded in §2, and does **not** change any gate stance above.

---

## 7. Verification (this PR)

```bash
cd /Users/tomek/Projects/twin
test -f docs/CURSOR_AGENT_TOKEN_LOADING_2026-06-29.md
cd frontend && \
  npx tsc --noEmit && \
  npm run test:cursor-agent-token-preflight && \
  npm run test:phase3b-harness-diagnostics && \
  npm run test:gate-e-retry-with-token-result && \
  npm run test:readiness-consistency-lock && \
  npm run test:launch-readiness-evidence-guard && \
  npm run build
```

**Not run:** Phase 3B prod/local browser, Gate D browser, any Playwright test.

---

## Explicit Non-Claims

- **TWIN_ACCESS_TOKEN present in this workspace's `frontend/.env.local`:** **NOT CONFIRMED** — loader reports `tokenPresent: false` for this workspace snapshot (boolean only; contents never inspected further)
- **Phase 3B prod retry:** **NOT EXECUTED** by this PR
- **Phase 3B:** **FAIL** — prior 0/20 unchanged
- **P0 performance:** **OPEN**
- **Public launch:** **NO-GO**
- **Gate F:** **PENDING**
- **Default CI browser:** **DISABLED**

**Public launch: NO-GO · P0: OPEN · Gate D: YES/PASS · Gate E: YES/FAIL (prior 0/20; retries PARTIAL/AUTH_TOKEN_REQUIRED) · Phase 3B: FAIL (no new browser evidence) · Gate F: PENDING**

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-29 | Initial doc — diagnosed missing `.env.local` auto-load in Cursor-agent/Playwright processes; shipped `load-local-test-env.ts` loader, spec wiring, and `test:cursor-agent-token-preflight` static guard; no gate stance change |
