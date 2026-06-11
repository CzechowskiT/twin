# Founder premium product QA checklist — 2026-06-08

**Audience:** Founder / operator (pre–Slot-1 review, pre–candidate outreach)  
**Production:** https://twin-sooty.vercel.app · API https://twin-production-bcd9.up.railway.app  
**Prod `git_commit` (2026-06-11):** `e48bff1` (`db_ok=true`) — scaffold `adfcac0`; redeploy before strict SHA parity checks  
**Launch stance (preserved):** Public **NO-GO** · auto-apply **PAUSED** · delegated **NOT LIVE** · recruiter calendar **NOT LIVE** · external invites **0** · H5c/H5d **HOLD**

**Program:** Premium Product Experience Polish Slices 0–7 (PRs [#52](https://github.com/CzechowskiT/twin/pull/52)–[#58](https://github.com/CzechowskiT/twin/pull/58))

---

## How to use this checklist

1. Run in **PL** and **EN** on production (or latest Vercel preview after merge). Spot-check **ES** and **DE** on `/` (footer + momentum rail), `/demo`, `/login`, `/register` for localized chrome (see `docs/GLOBAL_CHROME_ZERO_ENGLISH_LEAKAGE_FIX_2026-06-11.md`); spot-check **ES** on `/dashboard`, `/recruiter/inbox` for non-English premium copy (see `docs/I18N_FULL_TRANSLATION_COVERAGE_2026-06-08.md`).
2. Score each section **0–2** using the rubric below.
3. **Pass bar:** ≥ **14/18** total with **no 0** on Hard bans (§0).
4. File blockers in Polish if any Hard ban fails — do not send external invites until resolved.

### Scoring rubric

| Score | Meaning |
| ----- | ------- |
| **0** | Fail — wrong copy, broken flow, or hard-ban violation |
| **1** | Partial — works but confusing, missing polish, or untested edge |
| **2** | Pass — clear, trustworthy, matches launch stance |

---

## §0 — Hard bans (must all score 2)

| # | Check | Pass criteria |
| - | ----- | ------------- |
| 0.1 | No live auto-apply claims | Dashboard/transparency/inbox never say auto-apply or delegated apply is **live** |
| 0.2 | No AI-hiring claims | Copy says **recruiter decides**; TWIN does not hire |
| 0.3 | No public GO | Status/marketing do not imply public launch |
| 0.4 | Recruiter calendar | `/recruiter/calendar` shows **NOT LIVE** — no sync claims |
| 0.5 | Accept/decline contract | Interview/rejected rows have **no accept button** |
| 0.6 | No secrets in UI | No env var names, tokens, or raw JSON errors on inbox |

**Score §0:** ___ / 12 (6 × 2)

---

## §1 — Candidate: Today / next best action (Slice 1 · PR #53)

| # | Route / surface | Check |
| - | --------------- | ----- |
| 1.1 | `/dashboard` hero | Eyebrow “Today” / “Dziś”; 2–3 mission cards from real state |
| 1.2 | Primary CTA | Single deterministic action (profile → matches → calendar → pipeline) |
| 1.3 | Readiness chip | Email/profile/matches readiness visible without invented metrics |
| 1.4 | Header **Kalendarz** (logged-in candidate) | Stays authenticated → `/dashboard/calendar` ≥5s — no logout/login loop; stale provider shows **WYMAGA PONOWNEGO POŁĄCZENIA**, not false **POŁĄCZONO**; transient Google → **Błąd tymczasowy** + Retry, not reconnect loop (`docs/CANDIDATE_GOOGLE_CALENDAR_RECONNECT_LOOP_FIX_2026-06-11.md`); hung status resolves ≤9s with **Ładowanie statusu…** → retry/connect (`docs/CANDIDATE_CALENDAR_LOADING_STATE_TIMEOUT_FIX_2026-06-11.md`); **P0:** provider phases must not wait on `auth/me` (`docs/CANDIDATE_CALENDAR_P0_ROOT_CAUSE_FIX_2026-06-11.md`) |
| 1.5 | Calendar OAuth return (`?calendar_connected=1`) | Success banner readable on dark: **Kalendarz połączony** + body copy; auto-dismiss ~7s; status reload clears stale reconnect (`docs/CANDIDATE_CALENDAR_SUCCESS_ALERT_POLISH_2026-06-10.md`) |

**Score §1:** ___ / 8

---

## §2 — Candidate: Match quality groups (Slice 2 · PR #54)

| # | `#dashboard-matches` | Check |
| - | -------------------- | ----- |
| 2.1 | Group headers | Strong fit / Worth reviewing / Low confidence (PL equivalents) |
| 2.2 | Chips | Confidence chips per group; not flat “top 20” only |
| 2.3 | Actions | Apply/prepare gating unchanged; feedback hide rules work |

**Score §2:** ___ / 6

---

## §3 — Candidate: Application transparency (Slice 3 · PR #55)

| # | Applications panel `<details>` | Check |
| - | ------------------------------ | ----- |
| 3.1 | Two columns | Shared with recruiter \| Not shared by default |
| 3.2 | Human decision | TWIN does not make hiring decisions (PL/EN) |
| 3.3 | Automation strip | Auto-apply paused · delegated NOT LIVE |

**Score §3:** ___ / 6

---

## §4 — Recruiter: Decision console (Slice 4 · PR #56)

| # | `/recruiter/inbox` | Check |
| - | ------------------ | ----- |
| 4.1 | Header | Dynamic “{n} candidates awaiting your decision” + stat mini-cards + trust line (`docs/RECRUITER_DECISION_CONSOLE_VISUAL_POLISH_2026-06-10.md`) |
| 4.2 | Segments | Strong fit / Good fit / Needs verification / Decided — large tabs with counts |
| 4.3 | Card hierarchy | Prominent match score badge; **Dlaczego warto sprawdzić** / **Do weryfikacji** sections |
| 4.4 | Review card | **Otwórz kartę oceny** CTA (chevron button); accept/decline + batch unchanged |
| 4.5 | Decided rows | Interview/rejected show badge only — no accept |
| 4.6 | Access strip | Collapsed after queue load — decision console is visual focus |
| 4.7 | Contrast (dark theme) | Decision rail active text white/near-white; tone via border/bg only (`docs/RECRUITER_DECISION_RAIL_FINAL_READABILITY_FIX_2026-06-11.md`, `docs/RECRUITER_INBOX_CONTRAST_READABILITY_FIX_2026-06-10.md`) |
| 4.8 | Layout & scanability | Decision rail, match score card (label/%/tone), signal rows ≤2 + overflow, review CTA (`docs/RECRUITER_INBOX_PREMIUM_CARD_REDESIGN_2026-06-11.md`) |
| 4.8 | PL chip copy | Known demo reasons localized — no obvious English leakage in PL UI |

**Score §4:** ___ / 10 (cap 6 for rubric: average × 6/10)

**Normalized §4:** ___ / 6

---

## §5 — Trust language (Slice 5 · PR #57)

| # | Grep / read | Check |
| - | ----------- | ----- |
| 5.1 | Home + FAQ | “Autopilot” replaced with phased/paused automation |
| 5.2 | Dashboard north star | No guaranteed interview / perfect match / AI decides |
| 5.3 | CI | `npm run test:trust-language-guard` green |

**Score §5:** ___ / 6

---

## §6 — Guided empty states (Slice 6 · PR #58)

| # | Context | Check |
| - | ------- | ----- |
| 6.1 | No matches | 3 steps + profile CTA |
| 6.2 | No applications | 3 steps + `#dashboard-matches` CTA |
| 6.3 | Calendar disconnected | 3 steps + connect CTA on strip |
| 6.4 | Recruiter inbox | Pre-load + filter-empty guidance |

**Score §6:** ___ / 6

---

## §7 — Smoke routes (operator)

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://twin-sooty.vercel.app/recruiter/inbox
curl -sS -o /dev/null -w "%{http_code}\n" https://twin-sooty.vercel.app/api/public-health
```

| Route | Expect |
| ----- | ------ |
| `/recruiter/inbox` | 200 |
| `/api/public-health` | 200, `db_ok: true` |
| `/recruiter/calendar` | 200, NOT LIVE copy |
| `/dashboard` | 200 (auth redirect OK) |

**Score §7:** ___ / 6

---

## Total score

| Section | Weight | Score |
| ------- | ------ | ----- |
| §0 Hard bans | Blocker | ___ / 12 |
| §1 Today NBA | 6 | ___ |
| §2 Match groups | 6 | ___ |
| §3 Transparency | 6 | ___ |
| §4 Decision console | 6 | ___ |
| §5 Trust language | 6 | ___ |
| §6 Empty states | 6 | ___ |
| §7 Smoke | 6 | ___ |
| **Total (§1–7)** | **42 max → normalize to 18** | ___ / 42 → ___ / 18 |

**Pass:** Total ≥ 14/18 and §0 all 2s.

---

## Founder handoff — post QA

### Candidate improvements shipped
- Today hero with deterministic next action
- Match confidence groups (Strong / Worth reviewing / Low)
- Premium transparency panel (shared vs not shared)
- Guided empty states for matches, applications, calendar

### Recruiter improvements shipped
- Decision console inbox (segments, evidence chips, review card polish)
- Guided empty states for inbox load and filter zero-results
- Jobs list guided empty state

### Investor / demo narrative
- Trust vocabulary unified (phased automation, paused, recruiter decides)
- No new metrics claims; demo paths cleaner for controlled pilot

### Gaps (known, acceptable for pilot)
- Recruiter calendar sync **NOT LIVE**
- Delegated apply **NOT LIVE**
- Auto-apply **PAUSED** on production
- External recruiter invites **0** (H5d HOLD)

### Slot-1 recruiter visual review — ready?
**After §4 smoke PASS on production inbox with Nova Hiring PL queue:** Yes for **visual review** — not for external invite until founder **GO SMALL 1/2**.

**§4 recruiter inbox visual — founder PASS:** `2026-06-11` — founder confirmed **„ok jest ok”** after PR #77 (premium card redesign + decision rail readability). Evidence: `docs/RECRUITER_INBOX_PREMIUM_CARD_REDESIGN_2026-06-11.md`, `docs/RECRUITER_DECISION_RAIL_TEXT_READABILITY_FIX_2026-06-11.md`.

### Slot-1 final decision (founder — empty)
| Field | Value |
| ----- | ----- |
| **Slot-1 reviewer selected** | |
| **H5d composite score** | |
| **Visual review conducted UTC** | |
| **H5c decision** | `hold` *(default)* |
| **GO SMALL 1 sign-off UTC** | |

Prep pack: `docs/H5C_GO_SMALL_1_PREP_PACK_2026-06-11.md`

### 5–10 candidate outreach — ready?
**After §1+§2 PASS with real profile on production dashboard:** Yes for **named warm outreach** (5–10) — not mass GTM. Verify profile → matches → transparency in one session first.

### What NOT to build next
- Delegated apply engine or KYC submit flows
- Auto-apply re-enable without explicit product gate
- Recruiter calendar OAuth/sync
- Public launch GO matrix flip
- Fake traction / gamification XP campaigns
- New ML endpoints (UI-only polish complete)

### Next human action
1. Run this checklist on **twin-sooty** in PL + EN (30–45 min).
2. If ≥14/18: schedule **Slot-1 recruiter** visual review (H5d shortlist).
3. If ≥14/18: prepare **5–10 candidate** warm outreach list (no blast).
4. If any §0 fails: **STOP** — fix before any external touch.

---

## PR reference

| Slice | PR | Commit theme |
| ----- | -- | ------------ |
| 0 | [#52](https://github.com/CzechowskiT/twin/pull/52) | Premium polish plan |
| 1 | [#53](https://github.com/CzechowskiT/twin/pull/53) | Today next-best-action |
| 2 | [#54](https://github.com/CzechowskiT/twin/pull/54) | Match quality groups |
| 3 | [#55](https://github.com/CzechowskiT/twin/pull/55) | Application transparency |
| 4 | [#56](https://github.com/CzechowskiT/twin/pull/56) | Recruiter decision console |
| 5 | [#57](https://github.com/CzechowskiT/twin/pull/57) | Trust language |
| 6 | [#58](https://github.com/CzechowskiT/twin/pull/58) | Guided empty states |
| 7 | *(this doc)* | Founder QA checklist |

*Generated by Premium Product Experience Operator — 2026-06-08.*
