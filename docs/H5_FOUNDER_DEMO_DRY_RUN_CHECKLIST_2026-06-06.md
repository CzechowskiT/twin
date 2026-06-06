# H5 Founder Demo Dry Run Checklist — 2026-06-06

**Owner:** Founder  
**Pack:** `docs/H5_FOUNDER_DEMO_DRY_RUN_PACK_2026-06-06.md`  
**Route:** `https://twin-sooty.vercel.app/recruiter/inbox?company_slug=nova-hiring-pl`  
**Launch stance:** Public **NO-GO** · auto-apply **PAUSED** · delegated **NOT LIVE** · external invites **deferred** until H5 GO

**Rules:** No access codes in this doc. No prod mutations during dry run.

---

## Dry run metadata

| Field | Value |
| ----- | ----- |
| Dry run UTC | |
| Observer | Solo / internal trusted / recruiter (pilot) |
| Locale tested | PL / EN / both |
| Browser | Chrome Incognito / Safari Private |
| Founder | |

---

## Pre-demo checklist

| # | Check | Pass ☐ | Fail ☐ | Notes |
| - | ----- | ------ | ------ | ----- |
| PD1 | Chrome Incognito or Safari Private window | | | |
| PD2 | `docs/H5_FOUNDER_DEMO_DRY_RUN_PACK_2026-06-06.md` §6 or §7 open for talk track | | | |
| PD3 | Access code obtained via secure channel (not in URL, not on screen share) | | | |
| PD4 | No token visible in browser address bar before share | | | |
| PD5 | Navigate to `/recruiter/inbox?company_slug=nova-hiring-pl` | | | |
| PD6 | Load queue — banner visible | | | |
| PD7 | Exactly **5 rows** (All statuses) | | | |
| PD8 | Alex Kowalski (demo) — **interview** | | | |
| PD9 | Marta Nowak (demo) — **applied** | | | |
| PD10 | Piotr Zieliński (demo) — **applied** | | | |
| PD11 | Ewa Wiśniewska (demo) — **applied** | | | |
| PD12 | Jan Kaczor (demo) — **rejected** | | | |
| PD13 | No extra / legacy row | | | |
| PD14 | Review card expands (test Marta) | | | |
| PD15 | PII visibility note visible | | | |
| PD16 | DevTools Console — no CSP violations | | | |
| PD17 | Public launch **NO-GO** acknowledged verbally | | | |
| PD18 | Auto-apply **PAUSED** acknowledged verbally | | | |
| PD19 | Delegated **NOT LIVE** acknowledged verbally | | | |

**Pre-demo PASS:** PD5–PD16 all Pass. Any Fail → **STOP** (see issue log).

---

## Live demo checklist (screen path A–M)

| Step | Action | Pass ☐ | Fail ☐ | Time (min) |
| ---- | ------ | ------ | ------ | ---------- |
| A | Context framing (no overclaim on homepage) | | | 0–2 |
| B | Open inbox URL | | | |
| C | Load queue | | | |
| D | Show 5 canonical rows | | | 5–12 |
| E | Alex — interview / excellent | | | |
| F | Marta — good / salary missing | | | |
| G | Piotr — possible / seniority gaps | | | |
| H | Ewa — weak / incomplete | | | |
| I | Jan — rejected / history | | | |
| J | Review card — Marta + Ewa (A–H) | | | 12–17 |
| K | PII visibility note | | | 17–20 |
| L | Accept/decline explained — **no prod mutation** | | | |
| M | Feedback questions (pack §10) | | | 25–30 |

**Required phrases said (tick all):**

| Phrase (PL or EN equivalent) | Said ☐ |
| ---------------------------- | ------ |
| TWIN does not replace recruiters | |
| AI organizes signals / surfaces missing data | |
| Decision belongs to recruiter | |
| Not public launch | |
| Auto-apply paused | |
| Delegated apply not live | |
| Controlled pilot with feedback | |
| application_review context in inbox | |
| Talent pool anonymized separate context | |

**Live demo PASS:** All steps A–M Pass; all required phrases Said; no do-not-say violations (pack §12).

---

## Post-demo notes

### Narrative (open text)

**What worked:**

-

**What stumbled:**

-

**Do-not-say slips:**

-

### Feedback capture (if live audience)

| ID | Question (pack §10) | Score 1–5 | Notes |
| -- | ------------------- | --------- | ----- |
| F1 | First impression | | |
| F2 | Alex vs Ewa scores | | |
| F3 | Three reasons trust | | |
| F4 | Review card clarity | | |
| F5 | Would accept a row | | |
| F6 | Marta salary signal | | |
| F7 | Piotr gaps clear | | |
| F8 | Name in inbox OK | | |
| F9 | Visibility note OK | | |
| F10 | Control of slots | | |
| F11 | Decided rows audit-safe | | |
| F12 | Weekly use for one role | | |
| F16 | Pilot willingness | | |
| F17 | Referral intent | | |

**Open (F13, F14, F18, F19):**

-

---

## Scoring table (dry-run rubric)

| # | Dimension | Score 1–5 | Evidence |
| - | --------- | --------- | -------- |
| D1 | Narrative clarity | | |
| D2 | Recruiter-supporting perception | | |
| D3 | Trust / explainability | | |
| D4 | PII / consent clarity | | |
| D5 | Demo flow smoothness | | |
| D6 | Objection readiness | | |

**Composite average:** _____ / 5.0

| Result | Threshold |
| ------ | --------- |
| **GO** | Average **≥4.0** · no HOLD triggers |
| **ITERATE** | Average **3.0–3.9** |
| **HOLD** | Average **<3.0** or any STOP trigger |

**HOLD triggers (any = HOLD):** queue ≠5 · review card broken · PII note missing · CSP errors · do-not-say used · replacement framing

---

## Decision log

| UTC | Decision | Rationale | Owner |
| --- | -------- | --------- | ----- |
| `2026-06-06` | `h5_pack_created` | H5 Founder Demo Dry Run Pack + checklist shipped — docs only | Agent |
| | `dry_run_pending` | Founder dry run not yet executed | Founder |
| | `h5_go` / `go_small` / `iterate` / `hold` | *(fill after dry run)* | Founder |

**H5 decision options (after dry run):**

| Code | Label |
| ---- | ----- |
| `h5_go` | **GO (A)** — ready for 3–5 named recruiters |
| `go_small` | **GO SMALL (B)** — 1–2 trusted reviewers first |
| `iterate` | **ITERATE (C)** — re-run within 7 days |
| `hold` | **HOLD (D)** — no invites |

---

## Issue log

| UTC | Issue | Severity | Action | Resolved ☐ |
| --- | ----- | -------- | ------ | ---------- |
| | | `stop` / `iterate` / `minor` | | |

**Severity guide:**

- **stop** — blocks invite (queue, CSP, card, PII note)
- **iterate** — narrative/objection gap; re-run dry run
- **minor** — cosmetic; log for backlog

---

## Pass / fail criteria (summary)

### PASS — dry run complete, eligible for H5 GO or GO SMALL

| Criterion | Required |
| --------- | -------- |
| Pre-demo PD5–PD16 | All Pass |
| Live path A–M | All Pass |
| Required phrases | All Said |
| Do-not-say list | Zero violations |
| Rubric composite | **≥4.0** |
| HOLD triggers | **None** |
| Prod queue mutation during demo | **None** (explain-only on L) |

### FAIL — do not proceed to external invite

| Criterion | Result |
| --------- | ------ |
| Any PD5–PD16 Fail | **FAIL** |
| Any A–M step Fail | **FAIL** |
| Composite <3.0 | **FAIL** → HOLD |
| Any HOLD trigger | **FAIL** → HOLD |
| Accept/decline clicked on prod during dry run | **FAIL** (queue drift — re-seed before external demo) |

---

## Related

- `docs/H5_FOUNDER_DEMO_DRY_RUN_PACK_2026-06-06.md` — full pack
- `docs/H4_DEMO_SEED_POLISH_2026-06-06.md` — queue spec
- `docs/RECRUITER_INBOX_PRODUCTION_SMOKE_2026-06-06.md` — R1–R5
- `docs/LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md` — post-H5 cohort

---

## Hard bans honoured

- ✅ No secrets · no public GO · no invites sent from this checklist
- ✅ No prod mutations · no env/deploy/DB changes
