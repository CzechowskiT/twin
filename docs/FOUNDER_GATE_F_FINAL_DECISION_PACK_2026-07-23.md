# Founder Gate F — Final Decision Pack (2026-07-23)

**Type:** Founder decision package (docs only) — **not launch approval**  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**Baseline SHA:** `8bc25388e76cccd14c61826079d37fdc65fb8132`  
**Package date:** 2026-07-23

**Related:** [O7 evidence 2026-07-23](./O7_RESTORE_DRILL_EVIDENCE_2026-07-23.md) · [Slack/connector handoff](./EXTERNAL_CONNECTOR_OPERATOR_HANDOFF.md) · [Hard LIVE registry](./HARD_LIVE_EVIDENCE_REGISTRY.json) · [Pilot block](./PILOT_FOUNDER_BLOCK_DECISION_2026-07-20.md)

---

## A. Canonical technical state (verified)

| Layer | Value |
|-------|--------|
| `repo_head` / `origin_head` | `8bc25388e76cccd14c61826079d37fdc65fb8132` |
| Prod FE / API / worker | same SHA — **strict four-way PASS** |
| Alembic code + prod | `096_connector_secret_hash_widen` |
| Hard LIVE | PASS **122** · HELD_POLICY **30** · BLOCKED_EXTERNAL **1** (`plat_slack_connector`) · DEMO/PENDING **0** |
| O7 restore | **PASS** — fresh drill `o7-r020-20260723T065951Z` |
| Slack WRITE | **BLOCKED_EXTERNAL_CREDENTIALS** — no Cursor-recoverable secrets |

---

## B. Stance framing (unchanged by this pack)

| Stance | Status | Note |
|--------|--------|------|
| Pilot | **BLOCKED_BY_FOUNDER** | Not flipped by this pack |
| Gate F | **PENDING** | Blank Founder choices below |
| Launch | **NO-GO** | Gate F YES ≠ Launch GO |
| Phase 3B | **BLOCKED** (policy) / product harness historically PASS | Not flipped |
| Enrollment | **OFF** | Not flipped |
| Auto-apply | **PAUSED** | Not flipped |
| Delegated apply | **NOT LIVE** | Not flipped |

This document records evidence and **blank Founder choices**. It does **not** set Gate F YES, Launch GO, Pilot GO, or enrollment ON.

---

## C. Decision matrix — Options 1–3

### Option 1 — Keep Gate F PENDING until Slack PASS + O7 PASS

| Field | Content |
|-------|---------|
| Meaning | Gate F stays PENDING until `plat_slack_connector` authenticated prod smoke PASS **and** O7 fresh PASS |
| Consequences | O7 is **already PASS** (2026-07-23); only Slack credentials remain. Timeline blocked on human Slack app + Railway env |
| Risk | Low technical risk; schedule risk if Slack is delayed indefinitely |
| Required action | Founder/operator create Slack test app + set env → Cursor smoke → promote module |
| Owner | Founder (credentials) → Cursor (smoke/registry) |
| Evidence | O7 [PASS](./O7_RESTORE_DRILL_EVIDENCE_2026-07-23.md); Slack [handoff](./EXTERNAL_CONNECTOR_OPERATOR_HANDOFF.md) |

### Option 2 — Gate F technical PASS with accepted Slack credentials-only exception

| Field | Content |
|-------|---------|
| Meaning | Accept Gate F **technical** PASS while documenting Slack as sole external exception; O7 closed |
| Consequences | Unblocks Gate F evidence bar without waiting for Slack; Slack remains honestly BLOCKED in registry |
| Risk | Medium — Gate F YES could be misread as “all connectors LIVE”; must keep exception explicit |
| Required action | Founder check Option 2 + Slack exception acceptance; docs refresh only after Founder mark |
| Owner | Founder (decision) |
| Evidence | Registry 122/30/1; O7 PASS; connector smoke 2026-07-23 (Slack draft-only) |

### Option 3 — Gate F technical PASS; Pilot + Launch remain independently blocked

| Field | Content |
|-------|---------|
| Meaning | Same technical PASS as Option 2, with explicit separation: Pilot `BLOCKED_BY_FOUNDER` and Launch `NO-GO` stay regardless of Gate F |
| Consequences | Cleanest stance hygiene; matches current Pilot block doc |
| Risk | Low misuse risk if Founder records separations explicitly |
| Required action | Founder check Option 3 + keep Pilot/Launch holds |
| Owner | Founder |
| Evidence | Same as Option 2 + [Pilot block](./PILOT_FOUNDER_BLOCK_DECISION_2026-07-20.md) |

---

## D. Explicit Founder decisions (check one per row — leave blank until Founder acts)

### D.1 Gate F technical status

- [ ] **Gate F = YES** (technical) — accept evidence; authorize doc refresh only
- [ ] **Gate F = NO** — blockers remain
- [ ] **Gate F = PENDING** — no decision yet (**default**)

**Founder choice (record):** _________________________________

### D.2 Slack credentials-only exception

- [ ] **ACCEPT** Slack as sole `BLOCKED_EXTERNAL` exception for Gate F technical bar
- [ ] **REJECT** — require Slack PASS before any Gate F YES
- [ ] **DEFER**

**Founder choice (record):** _________________________________

### D.3 O7 restore evidence

- [ ] **ACCEPT** fresh O7 PASS `o7-r020-20260723T065951Z`
- [ ] **REQUIRE another founder-supervised drill**
- [ ] **DEFER**

**Founder choice (record):** _________________________________

### D.4 HELD_POLICY (30 modules)

- [ ] **KEEP all 30** Founder hard holds
- [ ] **Review subset** (list IDs separately — do not bulk-lift here)

**Founder choice (record):** _________________________________

### D.5 Pilot / Launch / Enrollment (separate — do not bundle with Gate F)

| Decision | Choices (Founder only) |
|----------|------------------------|
| Pilot | [ ] keep BLOCKED_BY_FOUNDER · [ ] other (write) _______ |
| Launch | [ ] keep NO-GO · [ ] other _______ |
| Enrollment | [ ] keep OFF · [ ] other _______ |

**Founder choice (record):** _________________________________

---

## E. Non-negotiable framing

| Statement | Stance |
|-----------|--------|
| **Gate F YES ≠ Launch GO** | Gate F is evidence/harness acceptance only |
| **Launch GO** | Separate Founder decision |
| **Pilot GO** | Separate Founder decision (`BLOCKED_BY_FOUNDER` today) |
| **Slack BLOCKED ≠ product failure** | Credentials-only; draft/preview already LIVE |
| **No fake PASS** | Do not promote `plat_slack_connector` without authenticated write smoke on test workspace |
| **No stance flips in this pack** | Docs record choices; system stance unchanged until Founder marks |

---

## F. Recommended technical decision (advisory only)

**Recommend Option 3** (equivalent technical bar to Option 2, clearer Pilot/Launch firewall):

1. Treat Gate F **technical** bar as satisfiable with **one** accepted external exception: Slack credentials.
2. Record O7 as **PASS** on current Alembic `096` / aligned SHA.
3. Keep Pilot **BLOCKED_BY_FOUNDER**, Launch **NO-GO**, enrollment **OFF**, and all **30** `HELD_POLICY` until separate Founder actions.
4. Do **not** auto-set Gate F YES in registry or checklists from this recommendation alone.

**Not recommended as default:** Option 1 if Founder wants Gate F technical closure soon — Slack is human-only and already exhaustively audited missing.

---

## G. Operator follow-ups (not Founder stance)

| Item | Owner | Status |
|------|-------|--------|
| Create Slack test app + Railway env | Founder/operator | Open — see handoff |
| Slack authenticated prod smoke + registry promote | Cursor after creds | Blocked on creds |
| Quarterly O7 re-drill | Operator | Next after major migration train |

---

**End of pack.** No Gate F YES decided. Launch remains NO-GO. Pilot remains BLOCKED_BY_FOUNDER.
