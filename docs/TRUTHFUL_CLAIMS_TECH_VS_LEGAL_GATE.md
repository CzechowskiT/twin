# Truthful claims — tech PASS vs marketing / legal gate

**Founder Class D (2026-07-23):** `TECH_READY_NO_CLAIM` for certification-style modules.  
Do **not** auto-PASS Hard LIVE registry from this note.

Code constants: `backend/app/services/truthful_claims.py`  
Enforced in: `mark_evidence_after_smoke` + `compliance_status` (`ai_act_certified` always false).

---

## Split

| module_id | Tech readiness | Marketing / legal claim gate | Honesty field |
|-----------|----------------|------------------------------|---------------|
| `ai_act_certified_claim` | Control coverage may be ready | **CLOSED** — not claimable as certified | `ai_act_certified: false` |
| `ai_protected_attr_monitoring` | Monitoring tech may be scaffolded | **CLOSED** — legal hold | `ai_protected_attribute_monitoring_enabled: false` |

`assert_certification_not_claimable(module_id, status=PASS)` raises if code tries to mark these PASS/CERTIFIED/LIVE_CLAIM.

---

## Stance

- Pilot `BLOCKED_BY_FOUNDER`
- Launch `NO-GO`
- Enrollment OFF
- Phase 3B `BLOCKED`
- Compliance language: readiness and control coverage only — not legal certification
