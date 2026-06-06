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
| **Queue load** | Valid pilot code + company → HTTP 200 queue (rows or empty state) | ⏳ **PENDING** | Prod shows unavailable copy — pilot inbox token **not configured on frontend** (and/or API) |
| **Match transparency** | Rows expose `match_score`, `match_score_label`, `match_reasons[]` when queue loads | ⏳ **PENDING** | Blocked on queue smoke |
| **Human decision** | Accept / decline updates row status | ⏳ **PENDING** | Blocked on queue smoke |
| **S2 CSP enforce** | Post-enforce smoke PASS `2026-06-05T16:20:13Z` | ✅ **PASS** | Unchanged by inbox work |
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

**Current gap (2026-06-06):** C1 (and likely C2) — queue smoke **blocked** until operator configures pilot token on both sides. Access UX (C6) already **PASS**.

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

## Founder manual smoke — queue (PENDING until C1–C2 green)

**Precondition:** C1–C4 checklist **green**. Obtain pilot access code via `scripts/seed-investor-demo.py --print-credentials` **locally** — do not commit output.

1. Open `/recruiter/inbox`.
2. Paste valid pilot access code + company slug (`nova-hiring-pl` for demo).
3. Click **Load queue**.
4. **PASS if:** banner *“AI-assisted ranking. Recruiter decision required.”* (or PL equivalent); queue panel loads.
5. **Empty queue PASS:** copy *“No applications waiting…”* / *“Brak aplikacji…”* — still HTTP 200 path.
6. If rows exist: confirm **match %** badge, up to **3 reasons**, candidate name visible (`pii_context: application_review`).
7. **Accept** one row → status moves toward `interview` (or row leaves applied filter).
8. **Decline** another (optional note) → status `rejected` or equivalent.
9. Optional: `/recruiter/jobs` — same access pattern; POST creates listing (do not spam prod).

| Field | Value |
| ----- | ----- |
| Checkpoint UTC | *(pending)* |
| Queue load | ⏳ **PENDING** |
| Match score + reasons | ⏳ **PENDING** |
| Accept / decline | ⏳ **PENDING** |
| Notes | Blocked: pilot token not on prod frontend |

---

## Pass / fail summary

| Smoke | PASS when | Today |
| ----- | --------- | ----- |
| **R1 Access UX** | Friendly i18n errors; no raw JSON; no config key leakage | ✅ **PASS** |
| **R2 Config** | `recruiter_inbox_configured: true` on health; frontend gate allows proxy | ⏳ **FAIL** (token missing on prod) |
| **R3 Queue** | 200 queue or empty state with valid code | ⏳ **PENDING** (after R2) |
| **R4 Decision** | Accept + decline mutate visible state | ⏳ **PENDING** (after R3) |

**Pilot demo GO:** Access UX yes · full inbox demo **no** until R2–R4 pass.  
**Public launch:** **NO-GO** regardless of inbox smoke.

---

## Automated guards (local — optional before doc commit)

| Command | Purpose |
| ------- | ------- |
| `cd backend && pytest tests/test_recruiter_inbox.py -q` | API error codes; no token name in 503/401 bodies |
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
