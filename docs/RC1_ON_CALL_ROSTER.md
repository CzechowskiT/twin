# RC1 On-call roster — role placeholders only

**Updated:** 2026-07-23  
**Rule:** Never invent human names. Founder assigns real people to role IDs.

| Role ID | Env var (Railway `twin` + worker) | Assigned |
|---------|-----------------------------------|----------|
| `PILOT_ON_CALL_PRIMARY` | `PILOT_ON_CALL_PRIMARY` | **UNASSIGNED** |
| `PILOT_ON_CALL_SECONDARY` | `PILOT_ON_CALL_SECONDARY` | **UNASSIGNED** |

## Founder business action (exact)

1. Name one human as **PILOT_ON_CALL_PRIMARY** (24h window during controlled pilot).  
2. Name one human as **PILOT_ON_CALL_SECONDARY** (backup).  
3. Set Railway vars (no redeploy required for labels):

```bash
railway variables set --service twin --skip-deploys \
  'PILOT_ON_CALL_PRIMARY=Name <email@domain>' \
  'PILOT_ON_CALL_SECONDARY=Name <email@domain>'
```

4. Update this file’s Assigned column.  
5. Re-run RC1 §24 checklist — only then may Pilot flip to `READY_FOR_CONTROLLED_PILOT`.

## Alert delivery (configured paths)

| Channel | Status |
|---------|--------|
| Email / in-app notifications | CORE_PILOT path (existing) |
| Slack webhook | OPTIONAL — not required for RC1 |
| Railway healthcheck | `/api/v1/health` on `twin` |

Until roles are assigned, verdict remains **B** (technically ready; awaits support ownership).
