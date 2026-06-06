# Limited Recruiter Pilot Tracker — 2026-06-06

**Owner:** Founder  
**Pack:** `docs/LIMITED_RECRUITER_PILOT_PACK_2026-06-06.md`  
**Cohort target:** 3–5 named recruiters  
**Launch stance:** Public **NO-GO** · pilot **READY FOR FOUNDER DECISION** (founder **defers external invitations** until hardening) · R1–R5 **PASS** · auto-apply **PAUSED** · delegated **NOT LIVE**

**Rules:** No access codes, tokens, or secrets in this doc. Company slugs only when non-sensitive. Update weekly during active pilot.

---

## Cohort tracker (empty — fill on invite)

| # | Recruiter name | Organization | Locale | Invited UTC | Onboarding call | First queue load | First decision | Week-2 check-in | Week-4 synthesis | Status | Notes |
| - | -------------- | ------------ | ------ | ----------- | --------------- | ---------------- | -------------- | --------------- | ------------------ | ------ | ----- |
| 1 | | | PL / EN | | | | | | | `planned` | |
| 2 | | | PL / EN | | | | | | | `planned` | |
| 3 | | | PL / EN | | | | | | | `planned` | |
| 4 | | | PL / EN | | | | | | | `planned` | |
| 5 | | | PL / EN | | | | | | | `planned` | |

**Status values:** `planned` · `invited` · `active` · `paused` · `completed` · `withdrawn`

**Column hints:**

- **First queue load** — UTC timestamp when recruiter successfully loaded `/recruiter/inbox` (empty queue counts as PASS).
- **First decision** — UTC timestamp of first accept or decline.
- **Notes** — match score disputes, product gaps, objection themes (no PII in notes).

---

## Weekly metrics log (optional aggregate)

| Week ending (UTC) | Active recruiters | Total decisions | Accepts | Declines | Spam escalations | Median match % (accept) | Median match % (decline) |
| ----------------- | ----------------- | --------------- | ------- | -------- | ---------------- | ----------------------- | ------------------------ |
| | | | | | | | |

---

## Rubric — per-recruiter scorecard (week 4)

Score each dimension **1–5** at synthesis. Composite guides expand / hold / withdraw.

| # | Dimension | 1 (poor) | 3 (acceptable) | 5 (strong) | Score | Evidence |
| - | --------- | -------- | -------------- | ---------- | ----- | -------- |
| R1 | **Activation** | Never loaded queue | Loaded; delayed first decision | Load + decision within 7 days | | |
| R2 | **Signal trust** | “Reasons feel random” | Mixed trust; some useful rows | Reasons + **review card** align with recruiter bar | | |
| R3 | **Noise rate** | Repeated spam reports | One tune resolved | No spam reports post-tune | | |
| R4 | **Honesty fit** | Felt misled vs invite | Mostly matched disclaimers | Product = invite promise | | |
| R5 | **Workflow fit** | Won't use again | Occasional use | Weekly habit | | |
| R6 | **Expansion intent** | Hard no | Maybe with SSO/ATS | Wants month 2 + referral | | |

**Composite guide:**

| Average | Recommendation |
| ------- | -------------- |
| ≥4.0 | **Expand** — offer month 2; consider 6th recruiter slot |
| 3.0–3.9 | **Hold** — tune thresholds; revisit in 4 weeks |
| <3.0 | **Withdraw** — thank, capture learnings, no public case study |

---

## Decision log

| UTC | Recruiter # | Decision | Rationale | Owner |
| --- | ----------- | -------- | --------- | ----- |
| | | `pilot_go` / `expand` / `hold` / `withdraw` / `cohort_pause` | | Founder |

**Starter row (pre-fill at pack publish):**

| UTC | Recruiter # | Decision | Rationale | Owner |
| --- | ----------- | -------- | --------- | ----- |
| `2026-06-06T16:38:40Z` | — | `match_receipt_pass` | R5 Match Receipt founder smoke **PASS** — Nova Hiring PL; all review-card sections visible; accept/decline unchanged; no CSP | Founder |
| `2026-06-06` | — | `h4_demo_seed_shipped` | H4 demo seed polish shipped — 5 synthetic Nova Hiring PL rows (code); prod seed pending founder approval | Agent |
| `2026-06-06` | — | `pilot_go_pending` | R1–R5 PASS; H1–H4 shipped; founder **defers external invitations** until H5 GO + prod seed verify | Founder |

---

## Synthesis template (week 4–6)

Copy into decision log when cohort review completes.

```markdown
### Pilot synthesis — YYYY-MM-DD

**Cohort:** N invited · M active · K completed week 4

**What worked**
-

**What failed**
-

**Product gaps (priority)**
-

**Copy / invite gaps**
-

**Recommendation:** expand | hold | withdraw cohort

**Public launch impact:** none — public remains NO-GO
```

---

## Expansion criteria (founder gate)

Expand limited recruiter pilot beyond 5 **only if all** are true:

| # | Criterion | Evidence source |
| - | --------- | --------------- |
| E1 | ≥3 recruiters at **composite ≥4.0** | Rubric § above |
| E2 | Zero unresolved spam escalations >14 days | Tracker notes + operating manual |
| E3 | R1–R4 smoke still PASS on prod (spot-check) | `docs/RECRUITER_INBOX_PRODUCTION_SMOKE_2026-06-06.md` |
| E4 | Public launch still **NO-GO** acknowledged in expansion comms | Gate checklist |
| E5 | Auto-apply remains **PAUSED** unless separate employer playbook signed | Launch matrix § F |
| E6 | Founder capacity for onboarding (+1 recruiter ≈ 2h first month) | Founder sign-off |

**Do not expand if:** any recruiter reports PII leak from token mishandling until rotation verified; or CSP/auto-apply incident open on launch runbook.

---

## Pre-pilot hardening checklist (before first invite)

| # | Item | Status | Notes |
| - | ---- | ------ | ----- |
| H1 | PII / consent receipt alignment | ✅ | `docs/PII_CONSENT_RECEIPT_AUDIT_2026-06-06.md`; inbox `data_visibility_*` API |
| H2 | Candidate-side consent receipt | ✅ | Dashboard applications panel — collapsible receipt (no DB) |
| H3 | Recruiter-side data visibility explanation | ✅ | Inbox PL/EN note + API `data_visibility_summary` |
| H4 | Demo seed polish | ✅ | `docs/H4_DEMO_SEED_POLISH_2026-06-06.md` — 5 synthetic candidates; prod seed = founder approval |
| H5 | Founder GO for 3–5 named recruiters | ☐ | After H4 prod seed verify |

---

## Related

- `docs/LIMITED_RECRUITER_PILOT_PACK_2026-06-06.md`
- `docs/LIMITED_RECRUITER_PILOT_INVITES_2026-06-06.md`
- `docs/RECRUITER_TRUST_ROADMAP_2026-06-06.md`
- `docs/PILOT_TRACKER.csv` — candidate pilot (separate cohort)
- `docs/TWIN_RECRUITER_ALIGNMENT_PRODUCT_AUDIT_2026-06-04.md`

---

## Hard bans honoured

- ✅ Docs only · no secrets · no public GO · no auto-apply/delegated enable claims
