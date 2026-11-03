# RC1 On-call roster — controlled pilot ownership

**Updated:** 2026-07-23  
**Rule:** Never invent human names. Contacts from Founder authorization + existing approved product mailbox only.

| Role ID | Env var (Railway `twin` + worker) | Assigned |
|---------|-----------------------------------|----------|
| `PILOT_ON_CALL_PRIMARY` | `PILOT_ON_CALL_PRIMARY` | **CONFIGURED** — Tomasz Czechowski (masked `cz***@protonmail.ch`) |
| `PILOT_ON_CALL_SECONDARY` | `PILOT_ON_CALL_SECONDARY` | **CONFIGURED** — role-based `co***@twin.care` (product support mailbox; escalates to primary) |
| `PILOT_ESCALATION_OWNER` | `PILOT_ESCALATION_OWNER` | **CONFIGURED** — Tomasz Czechowski |
| `PILOT_ROLLBACK_AUTHORITY` | `PILOT_ROLLBACK_AUTHORITY` | **CONFIGURED** — Tomasz Czechowski |

## Escalation path

1. Secondary (`contact@twin.care`) receives / monitors support + incident routes.  
2. Escalate to **PILOT_ON_CALL_PRIMARY** / **PILOT_ESCALATION_OWNER** (Tomasz).  
3. Rollback authority = same primary (Tomasz).

## Temporary canonical URL

`TEMPORARY_PILOT_CANONICAL_URL=https://twin-sooty.vercel.app` — used while Afternic NS parks `twin.care`. Custom DNS is desirable but **must not** block controlled pilot.

## Alert delivery (configured paths)

| Channel | Status |
|---------|--------|
| Email / in-app notifications | CORE_PILOT path (existing) |
| Support / privacy / security mailto | `contact@twin.care` → escalates to Tomasz |
| Slack webhook | OPTIONAL — not required for RC1 |
| Railway healthcheck | `/api/v1/health` on `twin` |

**Pilot stance:** `READY_FOR_CONTROLLED_PILOT`  
**Frozen:** Launch **NO-GO** · Enrollment **OFF** · Phase 3B **BLOCKED**
