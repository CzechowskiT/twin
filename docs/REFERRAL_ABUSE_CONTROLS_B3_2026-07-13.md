# Referral abuse controls — #448 scope (2026-07-13)

> **Status:** CURRENT — enforced on #448 branch; guard references contract here  
> **Branch:** `feat/all-modules-green-wave-b3-candidate-referrals`

## Controls (B3)

| Control | Implementation |
|---------|----------------|
| Self-referral | Signup attribution rejects referrer === referee user |
| Rate limit | Referral code generation capped per user per day |
| Enumeration | Opaque referral codes — no sequential IDs in API |
| Cross-tenant | `/me/referrals` JWT-scoped only |

## Tests (#448)

- `backend/tests/test_candidate_referrals_persistence.py` — abuse scenarios
- Guard on #448: `test:referral-abuse-controls-guard`

## This branch (#450 tooling)

Static doc + data lifecycle cross-reference only — referrals code merges with #448.
