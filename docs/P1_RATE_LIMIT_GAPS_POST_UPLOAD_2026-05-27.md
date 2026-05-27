# P1 Rate-limit gaps (post 12h session slice) — 2026-05-27

After this session's Layer 2 extensions:

## Now capped (authenticated, user-keyed)

| Endpoint | Cap | Commit |
| -------- | --- | ------ |
| `POST /candidates/me/match-feedback` | 60/min user | this session |
| `PUT /candidates/me` | 30/min user | this session |
| `POST /candidates/me/documents` | 10/min user | this session |
| `POST /applications/` | 30/min user | this session |
| `PATCH /applications/{id}` | 30/min user | this session |
| `DELETE /applications/{id}` | 30/min user | this session |
| `POST /candidates/me/cv` | 20/min user | `ff22f3a` |
| `POST /candidates/me/intro-audio` | 20/min user | `ff22f3a` |
| Career assistant + interview coach LLM routes | 60/min user | `28a50a0` |

## Public surfaces (IP-keyed)

| Endpoint | Cap |
| -------- | --- |
| `POST /beta/join` | 5/min IP |
| `POST /beta/waitlist/{code}/cv\|voice` | 10/min IP |
| `POST /csp-report` | 60/min IP |

## Still open (gate S10 partial)

| Endpoint family | Suggested cap | Notes |
| --------------- | ------------- | ----- |
| OAuth callbacks (`/auth/google/callback`, LinkedIn, Microsoft) | 10/min IP | Design only — prevents provider quota burn |
| `POST /auto-apply/trigger` | daily cap inside handler | OK |
| `POST /candidates/me/cv/tailor` | 10/min user | LLM — consider Layer 2 |
| Placement declare/dispute | 10/min user | Low volume |

Stripe webhook — not rate-limited (Stripe controls delivery); dedup ledger when migration runs.

Tests: `tests/test_auth_mutation_rate_limits.py`
