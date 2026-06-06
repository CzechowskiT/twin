# H4 Demo Seed Polish — 2026-06-06

**Branch:** `chore/h4-demo-seed-polish-2026-06-06`  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Owner:** TWIN Autonomous Safe-Lane Operator  
**Launch stance:** Public **NO-GO** · pilot **READY** (founder defers external invites) · auto-apply **PAUSED** · delegated **NOT LIVE**

**Hard bans honoured:** No env/secrets in docs · no prod DB mutation in this slice · no CSP/auth weakening · no real PII

---

## 1 — Current seed state (before H4)

| Aspect | State |
| ------ | ----- |
| Nova Hiring PL queue | Single row — **Alex Kowalski (demo)** only |
| Match variety | One excellent score; no good/possible/weak contrast |
| Review cards | A–H sections worked but demos lacked sparse-profile and gap stories |
| Status variety | `ensure_recruiter_inbox_demo` reset all rows to **applied** — no stable accepted/declined showcase |
| Ops refresh | Idempotent reset only; no canonical multi-candidate queue |

**Weaknesses for founder demos:** Recruiter inbox looked empty or monotone; hard to show accept/decline/status filters without manual clicks; no salary-missing or seniority-gap teaching moments.

---

## 2 — Target state (after H4)

| # | Candidate | Match label | Status | Teaching moment |
| - | --------- | ----------- | ------ | --------------- |
| 1 | Alex Kowalski (demo) | excellent (96) | **interview** | Accepted row — badge *Zaakceptowany na rozmowę* |
| 2 | Marta Nowak (demo) | good (74) | applied | Strong profile; **salary missing** → verify checklist |
| 3 | Piotr Zieliński (demo) | possible (52) | applied | Seniority / location gaps → red flags |
| 4 | Ewa Wiśniewska (demo) | weak (32) | applied | Incomplete profile → low confidence + red flags |
| 5 | Jan Kaczor (demo) | good (68) | **rejected** | Prior decline with recruiter note |

All rows: deterministic `match_reasons` (≤3) + `review_card` sections **A–H** via `build_recruiter_match_summary` — no LLM.

**Synthetic accounts:** `marta-nova-demo@twin.career`, `piotr-nova-demo@twin.career`, `ewa-nova-demo@twin.career`, `jan-nova-demo@twin.career` — inbox-only, not for login.

---

## 3 — Implementation plan (shipped)

| Step | Action | Artifact |
| ---- | ------ | -------- |
| 1 | Add `RECRUITER_DEMO_QUEUE_SPECS` + `upsert_recruiter_demo_queue()` | `backend/app/services/investor_demo_seed.py` |
| 2 | Refactor `ensure_recruiter_inbox_demo()` to restore canonical queue | Same |
| 3 | CLI unchanged — `scripts/seed-investor-demo.py` calls shared helper | `scripts/seed-investor-demo.py` |
| 4 | Ops refresh uses same helper | `scripts/ensure-recruiter-inbox-demo.py` |
| 5 | Backend tests — queue variety, idempotency, review cards, PII guard | `backend/tests/test_recruiter_demo_queue_seed.py`, `test_recruiter_inbox.py` |
| 6 | Pilot/launch docs evidence | This file + 7 related docs |

---

## 4 — Local seed (safe lane)

```bash
# From repo root — requires local Postgres + env password (never commit)
export INVESTOR_DEMO_PASSWORD='…'   # 12+ chars, from vault
python3 scripts/seed-investor-demo.py
# Or inbox-only refresh:
python3 scripts/ensure-recruiter-inbox-demo.py
```

**Prod:** Code ships via merge; **prod queue unchanged until founder runs seed** on Railway (requires approval — see §6).

---

## 5 — Smoke checklist

| # | Check | Local | Prod (post-founder-seed) |
| - | ----- | ----- | ------------------------ |
| S1 | `pytest` recruiter demo tests | ✅ 18 passed | N/A |
| S2 | `GET /recruiter/inbox?company_slug=nova-hiring-pl` loads | After local seed | After founder seed |
| S3 | Queue shows **5 rows** (filter: All statuses) | 1 interview + 3 applied + 1 rejected | Same |
| S4 | Alex — excellent + interview badge | ✅ | Founder verify |
| S5 | Ewa — weak + red flags in review card | ✅ | Founder verify |
| S6 | Marta — good; salary in *what to verify* | ✅ | Founder verify |
| S7 | `GET /api/public-health` 200 | CI / deploy smoke | Deploy smoke |
| S8 | CSP unchanged — no new script sources | Frontend build | Prod headers |

---

## 6 — Production demo changed?

| Question | Answer |
| -------- | ------ |
| Prod DB mutated in this PR? | **No** — code + docs only |
| Prod queue will change on merge alone? | **No** — requires `seed-investor-demo.py` or `ensure-recruiter-inbox-demo.py` on Railway |
| Founder approval for prod seed? | **Yes** — run seed only with explicit founder OK (password from vault, not in git) |

---

## 10 — Production seed run (founder-approved)

| Item | Value |
| ---- | ----- |
| UTC | `2026-06-06T17:09:24Z` |
| Command | `bash scripts/ops-refresh-recruiter-inbox.sh "Nova Hiring PL"` |
| Scope | Nova Hiring PL only · synthetic demo candidates · `ensure_recruiter_inbox_demo` via ops API |
| Pre-seed health | `GET /api/public-health` **200** · `db_ok: true` · `recruiter_inbox_configured: true` |
| Post-seed health | `GET /api/public-health` **200** · unchanged |
| Ops summary | `queue_size: 5` · `inbox_applied: 3` · `inbox_before_total: 2` · `inbox_after_total: 6` · `created: 8` · `updated: 1` |
| Canonical queue verified | **Partial** — ops metrics match H4 pattern (5 specs, 3 applied); `inbox_after_total: 6` suggests one legacy Nova Hiring PL row — **founder visual smoke required** for all five names + statuses |
| Railway restart | **No** |
| Secrets in output/docs | **None** |

**Hard bans confirmed:** no migration · no env changes · no scrape/apply/sweep · no accept/decline after seed · no real users · public **NO-GO** · auto-apply **PAUSED** · delegated **NOT LIVE**

---

## 11 — Production queue cleanup (legacy row removal)

| Item | Value |
| ---- | ----- |
| UTC | `2026-06-06T17:27:20Z` |
| Code PRs | [#40](https://github.com/CzechowskiT/twin/pull/40) (prune helper) · [#41](https://github.com/CzechowskiT/twin/pull/41) (broaden scope + name metrics) |
| Merge HEAD | `0044864c014405ce6b7e78a5ee524ea315b818c0` |
| Command | `bash scripts/ops-refresh-recruiter-inbox.sh "Nova Hiring PL"` |
| Queue before | **6** rows — canonical 5 + legacy **Tomasz Czechowski** |
| Queue after | **5** rows — canonical names only |
| Ops metrics | `queue_size: 5` · `inbox_applied: 3` · `inbox_interview: 1` · `inbox_rejected: 1` · `pruned: 1` |
| Legacy removed | **Yes** — `removed_names: ["Tomasz Czechowski"]` |
| Canonical 5 | **Yes** — Alex / Marta / Piotr / Ewa / Jan |
| Pre/post health | `GET /api/public-health` **200** · `GET /recruiter/inbox` **200** · CSP unchanged |
| Founder visual smoke | **Recommended** — confirm statuses in UI (ops names verified) |
| Railway restart | **No** |
| Secrets in output/docs | **None** |

**Hard bans confirmed:** Nova Hiring PL synthetic demo only · no real users · no migration · no env · no accept/decline after cleanup · public **NO-GO**

---

## 7 — Related docs updated

- `docs/LIMITED_RECRUITER_PILOT_PACK_2026-06-06.md`
- `docs/LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md`
- `docs/RECRUITER_DEMO_PATH_2026-06-06.md`
- `docs/RECRUITER_INBOX_PRODUCTION_SMOKE_2026-06-06.md`
- `docs/RECRUITER_TRUST_ROADMAP_2026-06-06.md`
- `docs/PII_CONSENT_RECEIPT_AUDIT_2026-06-06.md`
- `docs/PII_DATA_VISIBILITY_POLICY_2026-06-06.md`

---

## 8 — Safe-lane evidence (post-merge)

| Item | Value |
| ---- | ----- |
| PR | https://github.com/CzechowskiT/twin/pull/39 |
| Auto-merged | **Yes** (`2026-06-06`) |
| Merge HEAD | `db5373b2ad741abe16942b502a730bfbfe1a8868` |
| CI | backend-smoke ✅ · frontend-build ✅ · Vercel ✅ |
| Prod smoke `GET /` | **200** |
| Prod smoke `GET /recruiter/inbox` | **200** |
| Prod smoke `GET /api/public-health` | **200** · `recruiter_inbox_configured: true` |
| CSP | Unchanged (no new script sources) |
| Railway API commit at smoke | `2cc18db` (pre-H4 deploy — backend deploy separate) |

---

## 9 — Next (H5)

Founder GO for **3–5 named recruiters** after prod seed verification — use `docs/LIMITED_RECRUITER_PILOT_INVITES_2026-06-06.md`.
