# Founder Launch Execution Pack — 2026-07-23

**Type:** Operational handoff for Founder decisions — **not** Pilot/Launch activation  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**Related:** [Decision pack](./FOUNDER_GATE_F_FINAL_DECISION_PACK_2026-07-23.md) · [Decision record (Option 3)](./FOUNDER_GATE_F_DECISION_RECORD_2026-07-23.md) · [Slack handoff](./EXTERNAL_CONNECTOR_OPERATOR_HANDOFF.md) · [O7 evidence](./O7_RESTORE_DRILL_EVIDENCE_2026-07-23.md)

This pack does **not** activate Pilot, enable enrollment, or set Launch GO. Founder Option 3 records Gate F **technical PASS** only.

---

## A. Current verified state

| Item | Value |
|------|--------|
| Canonical baseline verified | `2418a9dba620f0320773bff0484487b458a497c6` (pre-handoff tip; post-commit tip = this pack’s SHA) |
| FE / API / worker | Strict four-way aligned at verification; re-check after handoff deploy |
| Alembic | code = prod = `096_connector_secret_hash_widen`, `is_at_head=true` |
| CI (baseline) | smoke **success** @ `2418a9db` — run `29988958754` |
| Final smoke | public-health OK; candidate auth OK; recruiter/company session OK; admin negative RBAC 401; connectors Slack WRITE BLOCKED; Alembic head OK |
| Hard LIVE | PASS **122** · HELD_POLICY **30** · BLOCKED_EXTERNAL **1** · DEMO_ONLY **0** · PENDING_SMOKE **0** |
| O7 | **PASS** `o7-r020-20260723T065951Z` (isolated staging; prod untouched) |
| Slack | `plat_slack_connector` **BLOCKED_EXTERNAL_CREDENTIALS** only — credentials MISSING on Railway API/worker |

**Stance after Founder Option 3:** Gate F technical **PASS** (Slack exception ACCEPTED) · Pilot **BLOCKED_BY_FOUNDER** · Launch **NO-GO** · Enrollment **OFF** · Phase 3B **BLOCKED** · Slack **BLOCKED_EXTERNAL_CREDENTIALS** · HELD_POLICY **30**

---

## B. Remaining external action

### Slack (sole Cursor-external credentials blocker)

| Field | Content |
|-------|---------|
| Owner | Founder / human Slack operator |
| Prerequisites | Slack app in **test** workspace; Incoming Webhook to `#twin-smoke`; set `SLACK_INCOMING_WEBHOOK_URL` (min) on Railway `twin` (+ worker if worker posts); optional OAuth vars per [handoff](./EXTERNAL_CONNECTOR_OPERATOR_HANDOFF.md) |
| Estimated effort | ~30–60 min app setup + env + redeploy + smoke |
| Required evidence | Connector status WRITE=LIVE; `test:external-connector-prod-smoke` PASS; audit ledger attempt; then registry promote + Hard LIVE guard + four-way realign |
| Rollback | Unset Slack env → redeploy → WRITE returns BLOCKED_EXTERNAL; revert registry promote; rotate webhook |

### Operator checklist (names only — no values)

1. Create Slack app in test workspace  
2. Set redirect URI (OAuth path only)  
3. Set required scopes / Incoming Webhooks  
4. Obtain incoming webhook (or OAuth token per implementation)  
5. Add exact env names to Railway API + worker  
6. Redeploy API/worker  
7. Production smoke in `#twin-smoke` (no customer channels)  
8. Audit verification  
9. Registry promotion (Cursor, only after smoke PASS)  
10. Hard LIVE guard  
11. Strict four-way realignment  
12. Rollback + secret rotation plan ready  

**Do not** mark Slack PASS without real provider smoke.

---

## C. Founder decisions required

Decide **separately** (use [decision record](./FOUNDER_GATE_F_DECISION_RECORD_2026-07-23.md)):

| Decision | Founder Option 3 (2026-07-23) |
|----------|-------------------------------|
| Gate F technical status | **PASS** |
| Slack credentials-only exception | **ACCEPTED** |
| O7 evidence | **ACCEPTED** (`o7-r020`) |
| HELD_POLICY (30) | **MAINTAIN** all |
| Pilot | BLOCKED_BY_FOUNDER (unchanged) |
| Launch | NO-GO (unchanged) |
| Enrollment | OFF (unchanged) |
| Phase 3B | BLOCKED (unchanged) |

---

## D. Recommended sequencing

1. Founder accepts or rejects Slack exception.  
2. Founder decides Gate F technical status.  
3. Slack activation **if** required before any Gate F YES.  
4. Pilot decision (independent of Gate F).  
5. Controlled pilot setup (only after Pilot APPROVED).  
6. Pilot evidence review.  
7. Launch decision (independent).  
8. Enrollment decision (independent).  

**Gate F YES ≠ Pilot APPROVED ≠ Launch GO.**

---

## E. Launch prerequisites checklist

### Mandatory technical

- [x] Strict four-way SHA alignment (verify on final HEAD)  
- [x] Alembic `096` at head  
- [x] CI smoke green on canonical tip  
- [x] Hard LIVE 122/30/1/0/0 honesty  
- [x] O7 PASS evidence  
- [x] Slack LIVE **or** Founder-accepted exception recorded  

### Mandatory operational

- [x] Slack operator checklist complete **or** exception accepted  
- [ ] On-call / incident owner named for first 24h after any Pilot  
- [x] Rollback authority named (Founder)  

### Mandatory security

- [x] Prior High/Critical Gate F closures retained (no revert)  
- [x] Admin ops negative RBAC (401 without ops token)  
- [ ] No secrets in git / tickets  

### Mandatory legal/privacy

- [x] HELD_POLICY modules remain held until Founder release  
- [x] Enrollment OFF until Founder decision  
- [ ] DSR / legal-hold monitoring owner for Pilot window  

### Mandatory business

- [x] Gate F decision recorded (Option 3 — technical PASS)  
- [x] Pilot decision recorded (remains BLOCKED_BY_FOUNDER)  
- [x] Launch decision recorded (default NO-GO)  

### Optional post-launch

- [ ] Full app-boot O7 residual (staging API against clone)  
- [ ] Broader connector WRITE paths (Teams webhook / Graph)  

---

## F. Go/No-Go matrix

### Variant 1 — Gate F PENDING until Slack PASS

| Field | Content |
|-------|---------|
| Risk | Schedule slip waiting on Slack app |
| Owner | Founder (creds) → Cursor (smoke/promote) |
| Evidence | Slack smoke PASS + registry 123 PASS / 0 BLOCKED |
| Founder decision | Keep Gate F PENDING; REJECT Slack exception |
| Rollback | N/A until Slack promoted |

### Variant 2 — Gate F technical PASS + Slack exception

| Field | Content |
|-------|---------|
| Risk | Misread as “all connectors LIVE” |
| Owner | Founder (exception) |
| Evidence | Registry 122/30/1; O7 PASS; decision record ACCEPTED |
| Founder decision | Gate F YES (technical) + Slack exception ACCEPTED |
| Rollback | Do not flip Pilot/Launch; Slack stays BLOCKED in registry |

### Variant 3 — Gate F technical PASS; controlled Pilot later; Launch NO-GO *(recommended → selected)*

| Field | Content |
|-------|---------|
| Risk | Low if separations recorded |
| Owner | Founder |
| Evidence | Variant 2 + Pilot block doc + this pack + [decision record](./FOUNDER_GATE_F_DECISION_RECORD_2026-07-23.md) |
| Founder decision | **Option 3 approved** — Gate F technical PASS; Pilot still BLOCKED until separate APPROVED; Launch NO-GO |
| Rollback | Pilot never started → no user rollback; keep enrollment OFF |

---

## G. First 24 hours after Pilot activation

Checklist only — **do not activate Pilot now:**

- [ ] Health monitoring (`/api/public-health`, db_ok, worker_active)  
- [ ] Auth failure rate  
- [ ] Queue depth / broker  
- [ ] DB errors  
- [ ] Worker retries  
- [ ] DSR / legal hold path  
- [ ] Audit integrity  
- [ ] Connector failures (esp. Slack/Teams)  
- [ ] AI decision monitoring  
- [ ] Incident ownership named  
- [ ] Rollback criteria agreed (auth outage, data integrity, connector spam)  

---

## H. First 7 days

- [ ] Daily technical review  
- [ ] Security events review  
- [ ] User incidents triage  
- [ ] Data integrity spot-checks  
- [ ] Performance / public-health latency  
- [ ] Connector stability  
- [ ] Audit completeness  
- [ ] Founder checkpoint (Pilot continue / pause / stop)  

---

**End of pack.** Founder Option 3 recorded. No Pilot started. Launch remains NO-GO. Slack not promoted.
