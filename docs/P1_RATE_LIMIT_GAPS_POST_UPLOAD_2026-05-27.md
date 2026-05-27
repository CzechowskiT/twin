# P1 Rate-limit gaps (post upload slice) — 2026-05-27

After `ff22f3a` the following **authenticated** mutations still
have no backend SlowAPI cap (Layer 2 partial coverage only on LLM routes):

| Endpoint family | Suggested cap | Blocker |
| --------------- | ------------- | ------- |
| `POST/PATCH/DELETE /applications/*` | 30/min user | Product review |
| `POST /candidates/me/match-feedback` | 60/min user | — |
| `PATCH /candidates/me` profile | 30/min user | — |
| `POST /candidates/me/profile-documents` | 10/min user | Multi-file UX |
| `POST /auto-apply/trigger` | existing daily cap inside handler | — |

Public surfaces now capped:

- `POST /beta/join` — 5/min IP
- `POST /beta/waitlist/{code}/cv|voice` — 10/min IP
- `POST /csp-report` — 60/min IP

Stripe webhook — not rate-limited (Stripe controls delivery); dedup
ledger handles replay when migrated.
