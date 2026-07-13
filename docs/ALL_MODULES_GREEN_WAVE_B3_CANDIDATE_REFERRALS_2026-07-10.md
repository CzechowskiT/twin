# All modules green — Wave B Slice 3: Candidate Referrals (2026-07-10)

> **Stance:** P0 CLOSED | Gate E PASS | Gate F PENDING | Launch NO-GO  
> **NOT_GATE_F_YES:** true  
> **NOT_PHASE_3B:** true  
> **PR #447 merge SHA:** `c2a08b025ca950b341540f0bc80f710825c778ce`

## Summary

Wave B slice 3 delivers **candidate-scoped referral persistence**: PostgreSQL program + referral rows, authenticated API under `/api/v1/candidates/me/referrals`, signup attribution via existing register flow, rebuilt `/dashboard/referrals` with link/copy/invite/list/how-it-works.

## Scope delivered

| Layer | Deliverable |
|-------|-------------|
| DB | `candidate_referral_programs`, `candidate_referrals` |
| Migration | `073_candidate_referrals` — renumbered from 071; chains after `072_recruiter_talent_pool_trust_review_c2` (merge after #449+#450) |
| API | `GET /me/referrals`, `POST /me/referrals/ensure-code`, `POST /me/referrals/invite`, `GET /me/referrals/{id}`, `GET /referrals/resolve?code=` |
| Signup | Candidate code resolution in `resolve_combined_signup_referrer_user_id` + `attach_signup_to_candidate_referral` |
| FE | `/dashboard/referrals` — persistent link, copy, invite tracking, list, how-it-works, earnings from legacy `/referrals/me` |
| Guard | `test:all-modules-green-wave-b3-referrals-guard` |

## Submodule status

| Submodule | Status | Notes |
|-----------|--------|-------|
| Referral link / code | **GREEN** | ensure-code + share_path |
| Copy / share | **GREEN** | clipboard + honest pilot banner |
| Invite tracking | **GREEN** | POST invite — no outreach |
| Referral list | **GREEN** | GET list with status |
| Signup attribution | **GREEN** | register + resolve endpoint |
| Earnings / tier | **PILOT** | legacy account referral ledger — manual rewards |
| Cash-out | **PILOT** | manual ops fulfillment |
| Leaderboard | **PILOT** | display only |

## Module status

| Field | Value |
|-------|-------|
| Module ID | `candidate_referrals` / `referrals` |
| Route | `/dashboard/referrals` |
| Activation | **PILOT** (not GREEN_WORKING) |
| Browser smoke | **NEEDS_FOUNDER_AUTH_SMOKE** |

Change to **LIVE / GREEN_WORKING** only after founder browser smoke on production with `demo@twin.career`.

## Excluded (unchanged)

- Auto-apply (PAUSED)
- Delegated apply (OFF)
- Stripe checkout live
- Automatic referral outreach / email invites
- ATS writeback
- Microsoft calendar live sync

## Tests

```bash
cd backend && pytest tests/test_candidate_referral_persistence.py -q
cd frontend && npm run test:all-modules-green-wave-b3-referrals-guard
```

## Next batch

Founder browser smoke: login `demo@twin.career` → `/dashboard/referrals` → copy link → record invite → verify list → (optional) signup attribution test account. On pass: flip `REFERRALS_SHIP_STATUS` to `live`.
