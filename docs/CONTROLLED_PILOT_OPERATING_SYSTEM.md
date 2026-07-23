# Controlled Pilot Operating System — index

**Updated:** 2026-07-23  
**Expected verdict (no approved real org):**  
`CONTROLLED PILOT OPERATING SYSTEM READY — AWAITING FIRST FOUNDER-APPROVED PILOT ORGANIZATION`

**Frozen stance:** Pilot `READY_FOR_CONTROLLED_PILOT` · Gate F `PASS` · Launch `NO-GO` · Enrollment `OFF` · Phase 3B `BLOCKED`

## Exact next Founder action

1. Select a **real** employer/org (not `nova-hiring-pl` / demo).  
2. Name recipients (emails).  
3. Approve via CLI (ops Bearer):

```bash
# create candidate (optional)
curl -sS -X POST "$API/api/v1/admin/pilot-os/organizations" \
  -H "Authorization: Bearer $OPS_ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"slug":"acme-pl","display_name":"Acme PL","recipient_emails":["r1@acme.example","r2@acme.example","r3@acme.example"]}'

# FOUNDER_APPROVE
curl -sS -X POST "$API/api/v1/admin/pilot-os/organizations/ID/approve" \
  -H "Authorization: Bearer $OPS_ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"approved_by_label":"Tomasz Czechowski"}'

# prepare pack (stays READY_UNSENT)
curl -sS -X POST "$API/api/v1/admin/pilot-os/organizations/ID/invitation-packs" \
  -H "Authorization: Bearer $OPS_ADMIN_TOKEN" -H "Content-Type: application/json" -d '{}'

# send ONLY with explicit approval ref
curl -sS -X POST "$API/api/v1/admin/pilot-os/invitation-packs/PACK_ID/send" \
  -H "Authorization: Bearer $OPS_ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"founder_send_approval_ref":"FOUNDER_SEND_YYYYMMDD_ref"}'
```

Or status-only: `python scripts/controlled-pilot-os-status.py`

## Machine surfaces

| Surface | Path |
|---------|------|
| Manifest | `docs/CONTROLLED_PILOT_OS_MANIFEST.json` |
| Launch GO evidence gate | `docs/LAUNCH_GO_EVIDENCE_GATE.json` |
| Org workspace | `docs/PILOT_ORG_SELECTION_WORKSPACE.md` |
| Invitation pack template | `docs/PILOT_INVITATION_PACK_TEMPLATE.md` |
| Readiness matrices | `docs/CONTROLLED_PILOT_LAUNCH_PREP_MATRICES.md` |
| Playbooks | `docs/CONTROLLED_PILOT_FIRST_WEEK_PLAYBOOK.md` |
| DNS (non-blocking) | `docs/RC1_DOMAIN_DNS_FOUNDER_ACTION.md` |
| Daily ops manual | `docs/CONTROLLED_PILOT_OPERATING_MANUAL_2026-05-27.md` |
| API | `/api/v1/admin/pilot-os/*` |
| Alembic | `100_controlled_pilot_os` |

## Docs drift classification

| Item | Class |
|------|--------|
| FE tip `72caad54` vs API/worker `b4b7e917` (pre-OS) | **docs_only_drift** — topology tip commit; product stance unchanged |
| Older `PILOT_FOUNDER_BLOCK_*` saying BLOCKED | **historical** — superseded by RC1 READY + this OS |
| `nova-hiring-pl` / `demo@twin.career` | **synthetic** — never counts as real pilot org |
| `PILOT_TRACKER.csv` header-only | **empty** — no real rows |

## Hard bans

- No Launch GO without real evidence + Founder decision  
- No Enrollment ON / public registration / live Stripe / CAPTCHA bypass  
- No invented customers, fake logos/quotes, auto mass outreach  
- No Phase 3B flip  

## KPI honesty

Default token: **`NO_REAL_PILOT_DATA`** until a non-synthetic FOUNDER_APPROVED org has a SENT invitation pack.
