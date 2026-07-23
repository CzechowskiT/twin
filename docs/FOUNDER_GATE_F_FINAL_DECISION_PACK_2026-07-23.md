# Founder Gate F — Final Decision Pack (2026-07-23)

**Type:** Founder decision package — **not launch approval**  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**Canonical tip (at pack creation):** `2418a9dba620f0320773bff0484487b458a497c6`  
**Ancestor baseline:** `c3cae1121342e3ede55127c0fe3d4af911dd1586`  
**Founder decision SHA:** `84a381d7742dd27b363ddc6ae5d9d6838a7a8a00`  
**Package date:** 2026-07-23  
**Founder decision:** **Option 3 approved** — see [decision record](./FOUNDER_GATE_F_DECISION_RECORD_2026-07-23.md).

**Related:** [O7 evidence](./O7_RESTORE_DRILL_EVIDENCE_2026-07-23.md) · [Slack handoff](./EXTERNAL_CONNECTOR_OPERATOR_HANDOFF.md) · [Hard LIVE registry](./HARD_LIVE_EVIDENCE_REGISTRY.json) · [Pilot block](./PILOT_FOUNDER_BLOCK_DECISION_2026-07-20.md)

This pack recorded evidence and options. Founder later approved **Option 3** (Gate F technical PASS + Slack exception). This still does **not** set Launch GO, Pilot GO, or enrollment ON.

---

## A. Technical verdict

| Item | Verdict |
|------|---------|
| Strict SHA alignment | **PASS** (pre-handoff) — `repo = origin = FE = API = worker = 2418a9db…` |
| Alembic | **PASS** — code + prod `096_connector_secret_hash_widen` |
| CI (tip) | **success** @ `2418a9db` (smoke run `29988958754`) |
| Production smoke (prior Gate F) | Wave1–5 / gap-close / connectors / AI / Hard LIVE — **PASS** (Slack draft-only) |
| Security | Prior High/Critical closed (SSRF, BOLA/IDOR, legal hold, Authologic, ATS, token log fingerprint) |
| Open High/Critical (Cursor-fixable) | **none** identified in this closure |
| Hard LIVE | PASS **122** · HELD_POLICY **30** · BLOCKED_EXTERNAL **1** · DEMO **0** · PENDING **0** |

---

## B. Completed evidence

| Evidence | Location / note |
|----------|-----------------|
| Canonical SHA | `2418a9db…` (strict four-way at verification start) |
| CI run | smoke success on tip `2418a9db` — run `29988958754` |
| Production smoke | connector evidence `EXTERNAL_CONNECTOR_PROD_SMOKE_EVIDENCE_2026-07-23.md` |
| Security fixes | Gate F verification line through `8bc25388` + realign |
| BOLA/IDOR / SSRF / legal hold / Authologic / ATS / token logging | closed in prior Gate F commits |
| Deployment poller | `wait:strict-deploy-alignment` / deploy-alignment-poller |
| O7 restore | **PASS** `o7-r020-20260723T065951Z` — `O7_RESTORE_DRILL_EVIDENCE_2026-07-23.md` |
| Recovery documentation | O7 evidence + `BACKUP_RESTORE_DRILL_LOG.md` row |

---

## C. Remaining non-code items

| Item | Status |
|------|--------|
| Slack credentials | **Open** — human Slack app + Railway env only ([handoff](./EXTERNAL_CONNECTOR_OPERATOR_HANDOFF.md)) |
| Fresh O7 restore drill | **Closed** — PASS `o7-r020` (not an operator gap) |
| Founder policy holds | **30** `HELD_POLICY` unchanged |
| Founder business decisions | **Option 3 recorded** — Gate F technical PASS; Pilot/Launch/Enrollment/Phase 3B unchanged (see §F + decision record) |

---

## D. Hard LIVE status

| Status | Count |
|--------|------:|
| PASS | 122 |
| HELD_POLICY | 30 |
| BLOCKED_EXTERNAL_CREDENTIALS | 1 (`plat_slack_connector` only) |
| DEMO_ONLY | 0 |
| PENDING_SMOKE | 0 |

---

## E. Founder decision matrix

Do not decide for Founder. Variants:

### Option 1

Gate F remains **PENDING** until:

- Slack PASS, and
- fresh O7 restore drill PASS.

| Field | Content |
|-------|---------|
| Consequences | O7 already PASS; only Slack blocks Option 1 exit |
| Risk | Schedule slip waiting on Slack app |
| Required action | Human Slack credentials → Cursor smoke → promote |
| Owner | Founder (creds) → Cursor (smoke) |
| Evidence | O7 PASS doc; Slack handoff |

### Option 2

Gate F **technical PASS** with accepted exceptions:

- Slack credentials-only exception,
- O7 operator evidence gap (**N/A — O7 PASS already**),
- Founder holds unchanged.

| Field | Content |
|-------|---------|
| Consequences | Unblocks Gate F evidence bar; Slack stays honestly BLOCKED in registry |
| Risk | Misread as “all connectors LIVE” if exception not recorded |
| Required action | Founder accept Slack exception explicitly |
| Owner | Founder |
| Evidence | Registry 122/30/1; O7 PASS; connector smoke |

### Option 3

Gate F **technical PASS**, but Pilot and Launch remain independently blocked.

| Field | Content |
|-------|---------|
| Consequences | Same technical bar as Option 2 + clearest Pilot/Launch firewall |
| Risk | Low if separations recorded |
| Required action | Founder mark Option 3; keep Pilot/Launch holds |
| Owner | Founder |
| Evidence | Option 2 evidence + Pilot block doc |

---

## F. Explicit decisions required from Founder

Decide **separately** (do not bundle):

### F.1 Gate F technical status

- [x] Gate F = YES (technical) — recorded as **PASS**
- [ ] Gate F = NO
- [ ] Gate F = PENDING (**default**)

**Founder choice:** **PASS** (Option 3) — 2026-07-23 @ `84a381d7…`

### F.2 Slack credentials-only exception

- [x] ACCEPT
- [ ] REJECT (require Slack PASS before any Gate F YES)
- [ ] DEFER

**Founder choice:** **ACCEPTED** — Slack stays `BLOCKED_EXTERNAL_CREDENTIALS` until credentials + provider smoke

### F.3 O7 evidence

- [x] ACCEPT PASS `o7-r020-20260723T065951Z`
- [ ] REQUIRE another founder-supervised drill
- [ ] DEFER

**Founder choice:** **ACCEPTED**

### F.4 HELD_POLICY (30)

- [x] KEEP all 30
- [ ] Review subset (list IDs separately)

**Founder choice:** **MAINTAIN (30)**

### F.5 Pilot / Launch / Enrollment (independent)

| Decision | Keep current | Other (write) |
|----------|--------------|---------------|
| Pilot (`BLOCKED_BY_FOUNDER`) | [x] | _______ |
| Launch (`NO-GO`) | [x] | _______ |
| Enrollment (OFF) | [x] | _______ |

**Founder choice:** Keep all current holds. Phase 3B remains **BLOCKED**.

---

## G. Recommended decision → Founder outcome

**Technical recommendation was: Option 3.**  
**Founder outcome (2026-07-23): Option 3 approved.**

1. Gate F technical bar accepted with one external exception (Slack credentials).
2. O7 closed and ACCEPTED (`o7-r020`).
3. Pilot remains `BLOCKED_BY_FOUNDER`, Launch `NO-GO`, enrollment OFF, Phase 3B BLOCKED, and all 30 `HELD_POLICY` until separate Founder actions.
4. Slack connector not promoted; no automatic stance propagation beyond the Gate F canonical field.

**Gate F technical PASS ≠ Launch GO.** Launch remains **NO-GO**. Pilot remains **BLOCKED_BY_FOUNDER**.
