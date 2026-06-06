# Recruiter inbox — production config readiness & smoke (2026-06-06)

**Branch:** `cursor/phase1-monorepo-scaffold`  
**Audience:** Founder / operator (pre-demo, pre-pilot onboarding)  
**Frontend:** https://twin-sooty.vercel.app  
**API:** https://twin-production-bcd9.up.railway.app  
**Launch stance:** Public **NO-GO** · controlled pilot **GO** · auto-apply **PAUSED** · delegated **NOT LIVE**

---

## Purpose

Confirm production is **configured** for recruiter inbox demos and that **founder smoke** passes before inviting named pilot recruiters. This doc is **read-only** — no deploy, no platform changes, no secrets.

**North star check:** Does the recruiter return to a **short queue of pre-qualified rows** (match score + reasons) with **accept / decline**, not raw JSON or env leakage?

---

## Production status snapshot (2026-06-06)

| Layer | Check | Status | Evidence |
| ----- | ----- | ------ | -------- |
| **Access UX** | Friendly unavailable / invalid-token copy (EN + PL); no raw JSON; no configuration key names in UI or API `detail` | ✅ **PASS** | Founder smoke after deploy; `recruiter_inbox_unavailable` → i18n `errorUnavailable` |
| **Queue load** | Valid pilot code + company → HTTP 200 queue (rows or empty state) | ✅ **PASS** | Founder smoke `2026-06-06T16:07:18Z` — Nova Hiring PL (`nova-hiring-pl`); queue panel loads |
| **Match transparency** | Rows expose `match_score`, `match_score_label`, `match_reasons[]`, **`review_card`** when queue loads | ✅ **PASS** | Founder smoke — match % badge + reasons + review card toggle on rows |
| **Match Receipt / Review Card (R5)** | Expandable card sections A–H visible on prod; accept/decline UX unchanged; no CSP errors | ✅ **PASS** | Founder smoke `2026-06-06T16:38:40Z` — Nova Hiring PL; verbatim evidence § R5 below |
| **Human decision** | Accept / decline updates row status; decided rows show badge (no stale accept button) | ✅ **PASS** | Founder smoke — Alex Kowalski: *Zaakceptowany na rozmowę* + *Decyzja zapisana*; accept button **gone**; pending row still shows Zaakceptuj/Odrzuć |
| **S2 CSP enforce** | Post-enforce smoke PASS `2026-06-05T16:20:13Z` | ✅ **PASS** | Inbox route — no CSP violations in DevTools |
| **Public launch** | Uncontrolled announcement | **NO-GO** | Gate matrices unchanged |

---

## Config readiness checklist (operator — no secrets in this doc)

Complete **before** founder queue smoke. Use platform consoles and `docs/FOUNDER_SECRETS_WHERE.md` for where values live — **do not paste tokens here**.

| # | Prerequisite | Platform | Verify (read-only) | Required for |
| - | ------------ | -------- | ------------------ | ------------ |
| C1 | Pilot inbox token on **frontend** server routes | Vercel (project linked to prod alias) | Load queue with valid pilot code → **not** friendly “inbox not available” message | Queue smoke |
| C2 | Same pilot inbox token on **API** | Railway (FastAPI service) | `GET /api/v1/health` or `/api/public-health` → `recruiter_inbox_configured: true` | Queue smoke |
| C3 | Frontend upstream API base reachable | Vercel | `/api/public-health` → `status: ok`, `db_ok: true` | All smokes |
| C4 | Demo company present (`nova-hiring-pl` or pilot slug) | Postgres (prod) | Queue loads after C1–C2; **empty queue is OK** | Demo / investor path |
| C5 | Optional founder preview prefill | Vercel public build-time vars | Access form pre-filled on `/recruiter/inbox` only — **not** required for named pilots | Founder convenience |
| C6 | Latest inbox UX deploy on Vercel | Vercel deployments | `/recruiter/inbox` serves access form + i18n errors (not legacy raw JSON) | Access UX |

**Config status (2026-06-06):** C1–C4 **green** — founder queue smoke **PASS** `2026-06-06T16:07:18Z`. Access UX (C6) **PASS**.

---

## Safe error mapping (must hold on prod)

API returns stable `detail` codes only — never configuration key names.

| Condition | API `detail` | EN UI (`recruiterInbox.*`) | PL UI |
| --------- | ------------ | -------------------------- | ----- |
| Token not configured | `recruiter_inbox_unavailable` | Inbox not available in this environment — contact TWIN | Skrzynka nie jest jeszcze dostępna — skontaktuj się z TWIN |
| Wrong access code | `recruiter_inbox_invalid_token` | Access code did not match | Kod dostępu się nie zgadza |
| Missing company | `recruiter_inbox_company_required` | *(form validation)* | *(form validation)* |
| Valid auth, no rows | *(200, `items: []`)* | No applications waiting… | Brak aplikacji oczekujących… |
| Browser / network | *(no JSON)* | Network error — retry | Błąd sieci — spróbuj ponownie |

**Access UX smoke (PASS):** With token unset, UI shows PL/EN friendly unavailable copy — **not** raw JSON, **not** env var names.

---

## Founder manual smoke — access UX (PASS template)

Run **without** pasting access codes into this doc.

1. Open `https://twin-sooty.vercel.app/recruiter/inbox` (Chrome or Safari).
2. Switch locale to **PL** — confirm access form labels are Polish.
3. Enter any placeholder access code + company **Nova Hiring PL** (`nova-hiring-pl`).
4. Click **Załaduj kolejkę** / **Load queue**.
5. **PASS if:** friendly unavailable message (PL) — no raw JSON, no `RECRUITER_*` strings in UI or visible network response body.
6. Repeat steps 2–5 in **EN**.
7. Open DevTools → Console — **no CSP violations** on this route (S2 enforce unchanged).

| Field | Value |
| ----- | ----- |
| Checkpoint UTC | `2026-06-06` (founder) |
| Access UX PL | **PASS** |
| Access UX EN | **PASS** |
| Raw JSON visible | **NO** |
| Config key names in UI/API body | **NO** |

---

## Founder manual smoke — queue (PASS)

**Precondition:** C1–C4 checklist **green**. Obtain pilot access code via `scripts/seed-investor-demo.py --print-credentials` **locally** — do not commit output.

1. Open `/recruiter/inbox`.
2. Paste valid pilot access code + company slug (`nova-hiring-pl` for demo).
3. Click **Load queue**.
4. **PASS if:** banner *“AI-assisted ranking. Recruiter decision required.”* (or PL equivalent); queue panel loads.
5. **Empty queue PASS:** copy *“No applications waiting…”* / *“Brak aplikacji…”* — still HTTP 200 path.
6. If rows exist: confirm **match %** badge, up to **3 reasons**, candidate name visible (`pii_context: application_review`), **data visibility note** under queue header, optional API `data_visibility_summary`.
7. **Accept** one row → badge **Accepted for interview** / **Zaakceptowany na rozmowę** + **Decision saved**; accept/decline buttons **hidden** (not stale accept).
8. **Decline** another (optional note) → badge **Declined** / **Odrzucony**; buttons hidden. **Applied** filter hides decided rows; **All statuses** shows badges.
9. Optional: `/recruiter/jobs` — same access pattern; POST creates listing (do not spam prod).

| Field | Value |
| ----- | ----- |
| Checkpoint UTC | `2026-06-06T16:07:18Z` |
| Company | Nova Hiring PL (`nova-hiring-pl`) |
| Queue load | ✅ **PASS** |
| Match score + reasons | ✅ **PASS** |
| Human decision note | ✅ **PASS** — banner visible |
| Accept / decline (R4) | ✅ **PASS** — Alex Kowalski: *Zaakceptowany na rozmowę* + *Decyzja zapisana*; **no** accept button on decided row |
| Pending row CTAs | ✅ **PASS** — Zaakceptuj/Odrzuć still on awaiting rows |
| Raw JSON / env leakage | ✅ **NO** |
| CSP violations | ✅ **NO** |
| Recruiter demo queue | ✅ **PASS** |

---

## Founder manual smoke — Match Receipt / Review Card (R5 PASS)

**Precondition:** R1–R4 **PASS**. Route: `https://twin-sooty.vercel.app/recruiter/inbox` · company **Nova Hiring PL**.

| Field | Value |
| ----- | ----- |
| Checkpoint UTC | `2026-06-06T16:38:40Z` |
| Route | `https://twin-sooty.vercel.app/recruiter/inbox` |
| Company | Nova Hiring PL |
| Queue load | **PASS** |
| Review card visible | **yes** |
| Why this candidate visible | **yes** |
| Requirements matched visible | **yes** |
| Uncertain/missing visible | **yes** |
| What to verify visible | **yes** |
| Data confidence visible | **yes** |
| Red flags/missing evidence visible | **yes** |
| Human decision disclaimer visible | **yes** |
| Accept/decline unchanged | **yes** |
| No CSP errors | **yes** |
| **Decision** | **PASS** |

**Founder stance:** Recruiter Match Receipt **PASS** on production. H1–H4 shipped 2026-06-06 (`docs/H4_DEMO_SEED_POLISH_2026-06-06.md`). **Prod queue still shows pre-H4 data until founder runs seed on Railway.** Controlled pilot/demo **READY FOR FOUNDER DECISION**; founder **defers external recruiter invitations** until **H5 GO** + prod seed verify.

---

## Pass / fail summary

| Smoke | PASS when | Today |
| ----- | --------- | ----- |
| **R1 Access UX** | Friendly i18n errors; no raw JSON; no config key leakage | ✅ **PASS** |
| **R2 Config** | `recruiter_inbox_configured: true` on health; frontend gate allows proxy | ✅ **PASS** (`2026-06-06T16:07:18Z`) |
| **R3 Queue** | 200 queue or empty state with valid code | ✅ **PASS** — Nova Hiring PL queue loads |
| **R4 Decision** | Accept + decline mutate visible state; no stale accept on `interview` rows | ✅ **PASS** — Alex Kowalski decided row; pending row CTAs intact |
| **R5 Match Receipt** | Review card sections A–H visible; accept/decline unchanged; no CSP | ✅ **PASS** (`2026-06-06T16:38:40Z`) — Nova Hiring PL |

**Pilot demo GO:** **YES** — R1–R5 **PASS**; H4 code shipped; **re-smoke R3 after founder prod seed** for 5-row queue. Founder **defers external invitations** until H5.
**Public launch:** **NO-GO** regardless of inbox smoke.

---

## Automated guards (local — optional before doc commit)

| Command | Purpose |
| ------- | ------- |
| `cd backend && pytest tests/test_recruiter_inbox.py -q` | API error codes; rejected in batch; no token name in 503/401 bodies |
| `cd frontend && npm run test:recruiter-inbox-decision` | Decision badge + button visibility by status |
| `cd backend && pytest tests/test_consent_recruiter_rate_limits.py -q` | Inbox write rate limits |
| `cd backend && pytest tests/test_csp_report*.py -q` | CSP sink regression |

No prod curl with tokens in agent session.

---

## Do not do in this smoke

- Flip public launch GO or announce on LinkedIn / X / PressOn  
- Enable auto-apply, delegated submit, or scrape ops  
- Run DB migrations, Railway restart, or Vercel env apply from agent  
- Paste access codes, tokens, or `.env` contents into docs or chat evidence  
- Claim two-sided marketplace liquidity or unshipped recruiter SKU (watchlists, HM packets)  
- Change CSP mode (enforce already live — monitor only)

---

## Related

- `docs/LIMITED_RECRUITER_PILOT_PACK_2026-06-06.md` — full pilot pack (talk track, objections, onboarding)
- `docs/LIMITED_RECRUITER_PILOT_INVITES_2026-06-06.md` — outbound templates
- `docs/RECRUITER_DEMO_PATH_2026-06-06.md` — 2–3 min investor demo script
- `docs/RECRUITER_INBOX.md` — product + API overview (operator env names — not for public copy)
- `docs/TWIN_RECRUITER_ALIGNMENT_PRODUCT_AUDIT_2026-06-04.md` — verdict **C)** recruiter-supporting
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` — public **NO-GO**
- `docs/PRODUCTION_REALITY_MATRIX_2026-05-27.md` — capability row
- `frontend/src/lib/recruiter-inbox-errors.ts` — stable error codes  
- `frontend/src/lib/recruiter-inbox-api-route.ts` — shared `/api/recruiter/*` gate

---

## Hard bans honoured

- ✅ Docs only  
- ✅ No deploy / Railway / Vercel mutation  
- ✅ No DB migration or seed on prod from agent  
- ✅ No secrets or access codes in this doc  
- ✅ No public launch GO · auto-apply stays **PAUSED** · delegated **NOT LIVE**  
- ✅ No CSP changes

---

# Post-merge automated smoke — PR #38 (2026-06-06)

**Merge commit:** `2cc18db5b7eae2bd35723f544dec0151f398d5a1` · **UTC:** `2026-06-06T16:52:20Z` (squash merge)  
**Branch after merge:** `cursor/phase1-monorepo-scaffold` @ `2cc18db`  
**PR:** https://github.com/CzechowskiT/twin/pull/38 — PII and consent receipt alignment for recruiter pilot  
**Launch stance:** Public **NO-GO** · pilot **READY FOR FOUNDER DECISION** · auto-apply **PAUSED** · delegated **NOT LIVE**

## Vercel production deploy

| Check | UTC | Result |
| ----- | --- | ------ |
| GitHub commit status (Vercel) | `2026-06-06T16:53:45Z` | **success** (deploy from `2cc18db`) |
| Prior production SHA (GitHub deployments) | `2026-06-06T16:41:02Z` | `3021920` |

## Safe HTTP smoke (non-mutating, no tokens)

| Route | UTC | HTTP | CSP header | Notes |
| ----- | --- | ---- | ---------- | ----- |
| `https://twin-sooty.vercel.app/recruiter/inbox` | `2026-06-06T16:52:28Z` | **200** | present (`content-security-policy`, `report-uri /api/v1/csp-report`) | `x-matched-path: /recruiter/inbox` |
| `https://twin-sooty.vercel.app/` | `2026-06-06T16:52:29Z` | **200** | present | homepage OK |
| `https://twin-sooty.vercel.app/api/public-health` | `2026-06-06T16:52:41Z` | **200** | present | JSON health OK |
| `https://twin-production-bcd9.up.railway.app/api/v1/health` | `2026-06-06T16:52:35Z` | **200** | n/a | `{"status":"ok","service":"twin-api",...}` (pre-Railway redeploy of merge) |

**Founder visual smoke (optional):** Confirm consent receipt on candidate dashboard and recruiter inbox visibility note copy after Vercel prod deploy — not covered by curl-only checks.

## Local tests (pre-merge gate)

| Suite | Result |
| ----- | ------ |
| `pytest` recruiter inbox + match explanations + CSP report (21 tests) | **PASS** |
| `npm run test:pii-data-visibility` (5 tests) | **PASS** |
| `npm run test:recruiter-inbox-decision` (3 tests) | **PASS** |
| `npm run lint` + `tsc --noEmit` | **PASS** |

**Hard bans confirmed:** no env/secrets, DB migrations, CSP policy changes, auth weakening, auto-apply/delegated enablement, public GO, or production mutations with tokens in this lane.

---

# H4 production demo seed — ops refresh (2026-06-06)

**UTC:** `2026-06-06T17:09:24Z`  
**Command:** `bash scripts/ops-refresh-recruiter-inbox.sh "Nova Hiring PL"` (scoped ops endpoint — no full investor seed, no password reset)  
**Founder approval:** confirmed before run

| Check | Result | Notes |
| ----- | ------ | ----- |
| Pre/post `GET /api/public-health` | **200** | `db_ok: true` · `recruiter_inbox_configured: true` |
| Ops `queue_size` | **5** | Canonical H4 spec count |
| Ops `inbox_applied` | **3** | Matches Marta / Piotr / Ewa applied rows |
| Ops `inbox_after_total` | **6** | Possible legacy row — founder confirm filter **All statuses** shows exactly five canonical names |
| Name/status API verify | **Deferred** | Local ops token OK; recruiter inbox token in repo copy stale vs prod — use founder pilot code in UI |
| Accept/decline after seed | **Not run** | Per operator scope |

**Founder visual smoke required:** load `/recruiter/inbox?company_slug=nova-hiring-pl` and confirm Alex (excellent, interview), Marta (good, applied), Piotr (possible, applied), Ewa (weak, applied), Jan (good, rejected). See `docs/H4_DEMO_SEED_POLISH_2026-06-06.md` §10.
