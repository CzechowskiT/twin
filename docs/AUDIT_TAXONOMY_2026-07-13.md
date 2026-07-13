# Audit taxonomy — recruiter & candidate events (2026-07-13)

## Recruiter (`recruiter_audit_events`)

| action_type | Writer | Reader (C5) | PII allowed in meta |
|-------------|--------|-------------|---------------------|
| `decision_accept` | inbox/pipeline | timeline | No |
| `decision_decline` | inbox/pipeline | timeline | No notes |
| `review_opened` | client | timeline | No |
| `radar_*` | talent radar | timeline | Snapshot IDs only |

**Forbidden meta keys:** `decline_note`, `email`, `phone`, `cv`, `candidate_name`.

## Candidate trust

| Source | Projection | Mutations |
|--------|------------|-----------|
| Trust center events | Candidate activity timeline UI | **None** (read-only) |

## Compliance stance

Append-only at persistence layer; no DELETE endpoints on C5/candidate timeline APIs.
