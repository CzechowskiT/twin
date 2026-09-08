# Browser journeys A–H (Epic 2.26)

## Method
- Ordinary entitlement: open `/dashboard/interview-decision` and `/dashboard/interview-practice` without session → Sign-in required / redirect (PASS).
- Authenticated product journeys: synthetic mint via ops (not public signup) + HTTP API covering A–H (PASS 18 product + 6 stance + 1 invariant).
- No Founder screenshots, credentials, or real candidate accounts.

## Matrix
| ID | Journey | Result |
|----|---------|--------|
| A | No invented word-count score (code+live) | PASS |
| B | Catalog EN+PL / six exercises / auth required | PASS |
| C | Candidate-authored process (no SynthCo UI) | PASS |
| D | Practice session draft→submit→next→complete | PASS |
| E | Criterion feedback, score=null | PASS |
| F | PRACTICE_WORK_SAMPLE promote | PASS |
| G | Soft delete | PASS |
| H | Canary invariant diff=0 | PASS |

## Live AI
NOT_RUN_EXTERNAL_PREREQUISITE — production ANTHROPIC_API_KEY len=0.
