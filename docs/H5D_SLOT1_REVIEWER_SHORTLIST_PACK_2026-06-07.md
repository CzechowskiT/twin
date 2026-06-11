# H5d Slot-1 Reviewer Shortlist Pack — 2026-06-07

**Owner:** TWIN H5d Slot-1 Reviewer Shortlist Pack Owner  
**Branch:** `chore/h5d-slot1-reviewer-shortlist-pack-2026-06-07`  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Audience:** Founder (private shortlist before any external recruiter invite)  
**Doc UTC:** `2026-06-07`

**Launch stance:** Public **NO-GO** · controlled recruiter pilot **H5b PASS** (`2026-06-07T07:03:13Z`) · **H5c pack created** · **H5d pack created** · default decision **HOLD** · auto-apply **PAUSED** · delegated **NOT LIVE** · recruiter calendar placeholder **NOT LIVE** · external invitations **not sent**

**Hard bans in this pack:** No deploy, env, DB, migrations, secrets, tokens, public GO, auto-apply/delegated enable, recruiter-replacement language, CSP/auth changes, **no invitation sending**, **no external messages**, **no LinkedIn outreach**, **no invented reviewer names**, **no pilot-started claims**.

---

## 1 — Executive summary

**H5c** established the GO SMALL decision gate (HOLD · GO SMALL 1 · GO SMALL 2 · ITERATE). **H5d** is the **founder shortlist lane** for **slot 1** — score 3–5 **possible** first reviewers **before** any invite workflow begins.

This pack **does not send invites**, **does not draft outreach**, and **does not invent names**. It provides profile criteria, a scoring rubric, an empty candidate table, slot-1 decision logic, and feedback focus so the founder can nominate real names privately and score them against a consistent bar.

**Prerequisites met:** H1–H5b complete · R1–R5 PASS · H4 **CLEAN PASS** · H5c pack created · S2 CSP **PASS** · candidate transparency polished `2026-06-07`.

**Default recommendation:** **HOLD** until founder supplies **3–5 possible names** for scoring in §6. Do not sign **GO SMALL 1** in H5c until one candidate scores **≥4.2** composite and §8 pre-send checklist is green.

---

## 2 — Objective

| # | Objective | Success signal |
| - | --------- | -------------- |
| O1 | **Identify** 3–5 real recruiter candidates for slot 1 (founder-supplied names only) | §6 table has 3–5 rows with founder-entered names |
| O2 | **Score** each candidate against §5 rubric before any outreach | Composite score recorded per row |
| O3 | **Select** at most **one** slot-1 reviewer with evidence | §11 decision log shows `select_slot_1` or remains `hold` |
| O4 | **Defer** invite send until H5c **GO SMALL 1** sign-off + §8 checklist | Invites pack unused until explicit GO SMALL |
| O5 | **Preserve** public NO-GO and zero external communications in this lane | invitations sent **no** |

**Out of scope for H5d:** cohort slots 2–5 shortlist · access code provisioning · tracker `invited` status · LinkedIn/email templates · onboarding scheduling.

---

## 3 — Ideal first reviewer profile

Target **one** slot-1 reviewer matching as many criteria as possible:

| # | Criterion | Why |
| - | --------- | --- |
| P1 | **In-house or agency recruiter** placing tech/product roles in Poland (or PL-speaking) | Matches demo seed + pilot copy |
| P2 | **Founder relationship** — candid feedback, low reputational risk if product gaps surface | GO SMALL is learning, not marketing |
| P3 | **Structured feedback habit** — willing to score signal vs noise after week 1 | Aligns with tracker week-4 rubric |
| P4 | **Accepts honest disclaimers** — no auto-apply, no public launch, token pilot, calendar **NOT LIVE** | Avoids invite/reality mismatch |
| P5 | **Not expecting ATS replacement** on day one | Recruiter-supporting framing (audit **C)**) |
| P6 | **Available for 15-min onboarding + async check-in** within first 7 days | Activation metric R1 |
| P7 | **Separate company slug** — not Nova Hiring PL demo path | Named pilot ≠ investor demo |

**Nice-to-have:** prior conversation about TWIN north star; tolerance for PL/EN UI; no active competitor building same wedge.

---

## 4 — Who not to select first

Defer these profiles for slot 1 (and often for entire GO SMALL cohort):

| # | Profile | Reason to defer |
| - | ------- | --------------- |
| N1 | **Press / influencer / investor** without recruiter ops role | Confuses pilot with public launch narrative |
| N2 | **Enterprise TA leader expecting SSO, RBAC, ATS** | Token pilot only — disappointment risk |
| N3 | **Recruiter who needs live calendar sync** (Google/Microsoft propose-slot) | Recruiter calendar **NOT LIVE** — placeholder only |
| N4 | **Anyone requiring auto-apply or delegated submit** | **PAUSED** / **NOT LIVE** on production |
| N5 | **Cold LinkedIn outreach targets** (no prior founder relationship) | Violates controlled named pilot; no spam lane |
| N6 | **Competitor or hostile evaluator** | Week-1 learning needs trust, not debate |
| N7 | **HM-only / hiring manager without inbox ownership** | Pilot validates recruiter queue workflow |
| N8 | **Partner expecting two-sided marketplace liquidity** | Candidate-led corpus; not evidenced at scale |
| N9 | **Anyone who cannot receive access code via secure channel** | Security + PII policy |
| N10 | **Second slot before week-2 synthesis on slot 1** (unless H5c GO SMALL 2 explicitly signed) | GO SMALL sequencing — learn before widen |

---

## 5 — Shortlist scoring rubric

Score each **founder-supplied** candidate on dimensions **1–5**. Record in §6. **Do not invent scores without real names.**

| # | Dimension | 1 (poor) | 3 (acceptable) | 5 (strong) |
| - | --------- | -------- | -------------- | ---------- |
| S1 | **Profile fit** | Wrong role/market | Partial PL/tech fit | Full P1–P7 alignment |
| S2 | **Trust & candor** | Low feedback trust | Will respond if asked | Known candid relationship |
| S3 | **Disclaimers tolerance** | Expects auto-apply/SSO day one | Needs careful framing | Comfortable with honest scope |
| S4 | **Availability** | Unlikely to engage in 7 days | Maybe async only | Onboarding + check-in likely |
| S5 | **Reputational risk** | High if product gaps | Moderate | Low — learning partner |
| S6 | **Pilot learning value** | Generic “nice to try” | Some signal on inbox UX | Strong structured feedback expected |

**Composite:** average of S1–S6 (one decimal).

| Composite | Verdict | Action |
| --------- | ------- | ------ |
| **≥4.2** | **Strong** | Eligible for slot-1 selection — proceed §7 if top score and §8 green |
| **3.5–4.1** | **Caution** | Hold or deprioritize — only select if no ≥4.2 candidate and founder accepts risk |
| **<3.5** | **No** | Do not invite — remove from slot-1 consideration |

**Tie-break:** higher S2 (trust) → higher S6 (learning value) → founder gut on relationship depth. Log rationale in §11.

---

## 6 — Reviewer candidate table (empty — founder fills)

**Rules:** Founder enters **real names only** — never commit PII beyond what founder chooses to track locally. **No agent-invented names.** Organization = company slug label or org name (non-secret). Leave rows blank until founder input.

| # | Name (founder) | Organization | Relationship | S1 | S2 | S3 | S4 | S5 | S6 | Composite | Verdict | Slot-1 pick? | Notes |
| - | -------------- | ------------ | ------------ | -- | -- | -- | -- | -- | -- | --------- | ------- | ------------ | ----- |
| C1 | | | | | | | | | | | | | |
| C2 | | | | | | | | | | | | | |
| C3 | | | | | | | | | | | | | |
| C4 | | | | | | | | | | | | | |
| C5 | | | | | | | | | | | | | |

**Verdict column:** `strong` · `caution` · `no` (from §5 thresholds)  
**Slot-1 pick?:** `yes` · `no` · `hold` — at most **one** `yes` before H5c GO SMALL 1

**Next founder input:** Provide **3–5 possible names** for scoring in this table (private — not in git if preferred; founder may keep names offline and use initials here).

---

## 7 — Slot-1 decision logic

**Default: HOLD** — no slot-1 selection logged until §6 has scored candidates.

```
IF §6 has zero founder-supplied names
  → HOLD (default) — wait for 3–5 names

ELSE IF no candidate composite ≥4.2
  → HOLD — widen search or accept highest caution (≥3.5) with explicit founder risk note in §11

ELSE IF exactly one candidate ≥4.2 AND §8 pre-send checklist green
  → SELECT slot 1 — log in §11 → founder signs H5c GO SMALL 1 → tracker row 1 → then invites pack

ELSE IF multiple candidates ≥4.2
  → SELECT highest composite (tie-break §5) — log others as `deferred` in Notes

ELSE IF any §10 stop trigger open
  → HOLD — no selection regardless of scores

ELSE
  → HOLD — founder review required
```

**This pack does not auto-send.** Selection authorizes founder to **begin** H5c GO SMALL 1 workflow manually — not bulk outreach or public announcements.

---

## 8 — Pre-send checklist

Complete **all** before first external message (after slot-1 selected and H5c **GO SMALL 1** signed):

| # | Check | Evidence |
| - | ----- | -------- |
| PS1 | **H5d slot-1 selected** — one candidate `yes` in §6 with composite ≥4.2 (or documented caution exception) | §6 + §11 |
| PS2 | **H5c decision logged** — GO SMALL 1 (not HOLD/ITERATE) | `docs/H5C_GO_SMALL_DECISION_PACK_2026-06-07.md` §9 |
| PS3 | **H5b PASS** still current (within 14 days) | `docs/H5_FOUNDER_DEMO_DRY_RUN_CHECKLIST_2026-06-06.md` |
| PS4 | **R1–R5 smoke** spot-check PASS (within 7 days of send) | `docs/RECRUITER_INBOX_PRODUCTION_SMOKE_2026-06-06.md` |
| PS5 | **Named reviewer** + organization in tracker row 1 (no secrets in doc) | `docs/LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md` |
| PS6 | **Access code + company slug** prepared for **separate secure message** | Founder ops — not in git |
| PS7 | **Invite template reviewed** — no watchlist/SSO/auto-apply live language | `docs/LIMITED_RECRUITER_PILOT_INVITES_2026-06-06.md` |
| PS8 | **Onboarding call slot** on founder calendar | Calendar link in template |
| PS9 | **Public launch NO-GO** acknowledged in founder talk track | §12 |
| PS10 | **Kill-switch awareness** — CSP / auto-apply incident runbook | `docs/LAUNCH_DAY_MONITORING_ROLLBACK_RUNBOOK_2026-06-04.md` |

---

## 9 — First reviewer feedback focus questions

Primary questions for slot-1 reviewer (week 1–4) — align with H5c §7 and tracker rubric:

| # | Question | How to measure |
| - | -------- | -------------- |
| Q1 | Do match % + reasons + **review card** align with your bar for “worth a conversation”? | R2 rubric |
| Q2 | Which rows felt like **noise** or misfit — and why? | Tracker notes |
| Q3 | Would you open the inbox again **next week** without a founder nudge? | R5 rubric |
| Q4 | Did the product match what the invite promised (auto-apply pause, calendar placeholder, token auth)? | R4 rubric |
| Q5 | Is the **PII / data visibility** note sufficient for your compliance comfort? | Conversation + no leak reports |
| Q6 | What **objections** surfaced — calendar, automation, ATS expectations? | Issue log |
| Q7 | Worth a **slot 2** or month 2 — or stop after week 4? | R6 rubric at week 4 |

**Not goals for slot 1:** revenue, placement fees, public case study, NPS at scale, ATS integration commitments.

---

## 10 — Stop triggers

**Any one trigger → HOLD or `cohort_pause` — no slot-1 invite until cleared.**

| # | Trigger | Action |
| - | ------- | ------ |
| T1 | Production queue ≠ **5 canonical rows** (Nova demo) or load failure on reviewer company | STOP — ops refresh per H4 |
| T2 | Review card broken or empty on live inbox | STOP — R5 regression |
| T3 | PII / data visibility note missing | STOP — H3 regression |
| T4 | CSP console errors on recruiter routes | STOP — S2 incident path |
| T5 | Founder or candidate selection used **do-not-say** phrase (auto-apply live, replace recruiters, public launch) | ITERATE — reset narrative |
| T6 | Access code leaked in public channel | STOP — rotate credentials |
| T7 | Unresolved spam escalation >48h on active reviewer | PAUSE cohort |
| T8 | Auto-apply or delegated apply incident on launch runbook | PAUSE — public NO-GO unchanged |
| T9 | Reviewer reports PII beyond policy | STOP — audit + founder review |
| T10 | Slot-1 selected without §5 scoring (invented or unscored name) | HOLD — complete H5d table first |

---

## 11 — Decision log

| UTC | Decision | Slot-1 | Rationale | Owner |
| --- | -------- | ------ | --------- | ----- |
| `2026-06-07` | **`hold`** (default) | **none selected** | H5d slot-1 reviewer shortlist pack created — docs only; H5b PASS preserved; H5c HOLD preserved; external invitations **not sent**; founder to supply 3–5 possible names for §6 scoring | Founder |
| `2026-06-11` | **`hold`** (unchanged) | **none selected** | H5c GO SMALL 1 prep pack created — Slot-1 visual review **READY**; §6 table still empty; external invitations **not sent**; see `docs/H5C_GO_SMALL_1_PREP_PACK_2026-06-11.md` | Founder |

**Decision codes:** `hold` · `select_slot_1` · `defer_candidate` · `widen_search` · `cohort_pause`

**On slot-1 selection:** add row with UTC, decision code, candidate # from §6, composite score, and one-line rationale. Update tracker H5d row to ✅. Then proceed H5c **GO SMALL 1** sign-off.

---

## 12 — Launch stance

| Field | Value |
| ----- | ----- |
| **Public launch** | **NO-GO** (unchanged) |
| **Controlled recruiter pilot** | **H5b PASS** · **H5c pack created** · **H5d pack created** `2026-06-07` |
| **H5d default decision** | **HOLD** — no slot-1 selected; no external invites sent |
| **Cohort invited** | **0 / 3–5** |
| **S2 CSP** | **PASS** — enforce ON |
| **Recruiter inbox R1–R5** | **PASS** |
| **H4 demo seed** | **CLEAN PASS** `2026-06-06T17:36:25Z` |
| **Auto-apply** | **PAUSED** |
| **Delegated apply** | **NOT LIVE** |
| **Recruiter calendar** | **NOT LIVE** — placeholder only |
| **External recruiter invites** | **Not sent** — deferred until H5d slot-1 selected + H5c **GO SMALL 1** sign-off |
| **Next founder action** | Run `docs/H5C_GO_SMALL_1_PREP_PACK_2026-06-11.md` §2 smoke → Slot-1 visual review → supply **3–5 possible names** for §6 scoring → select slot 1 if ≥4.2 → complete §8 → sign **GO SMALL 1** in H5c §9 → tracker row 1 → invites pack |

---

## Related docs

| Doc | Purpose |
| --- | ------- |
| `docs/H5C_GO_SMALL_DECISION_PACK_2026-06-07.md` | GO SMALL decision gate (after slot-1 selected) |
| `docs/H5_FOUNDER_DEMO_DRY_RUN_PACK_2026-06-06.md` | H5b dry run (prerequisite) |
| `docs/H5_FOUNDER_DEMO_DRY_RUN_CHECKLIST_2026-06-06.md` | H5b evidence + rubric |
| `docs/LIMITED_RECRUITER_PILOT_PACK_2026-06-06.md` | Full pilot scope |
| `docs/LIMITED_RECRUITER_PILOT_TRACKER_2026-06-06.md` | Cohort + metrics |
| `docs/LIMITED_RECRUITER_PILOT_INVITES_2026-06-06.md` | Outbound templates (**after H5c GO SMALL only**) |
| `docs/RECRUITER_INBOX_PRODUCTION_SMOKE_2026-06-06.md` | R1–R5 evidence |
| `docs/H5C_GO_SMALL_1_PREP_PACK_2026-06-11.md` | Slot-1 visual review prep — demo script, talk track, feedback capture |

---

## Hard bans honoured

- ✅ Docs only — no code, env, deploy, DB, migrations, secrets, tokens
- ✅ No public launch GO · auto-apply **PAUSED** · delegated **NOT LIVE**
- ✅ No invitation sending · no external communications · no LinkedIn outreach · no pilot-started claims
- ✅ No invented reviewer names · empty §6 table at publish
- ✅ No recruiter-replacement language · no CSP/auth changes
