# Investor demo gaps — prioritized (Day 2–3 sprint)

**Date:** 2026-05-23 (updated Day 3)  
**Demo target:** ~30 May 2026  
**Branch:** `cursor/phase1-monorepo-scaffold` (merged investor calc + persona pricing + logo colors)  
**Sources:** `AUDIT_RESULTS_2026-05-23_claude.md`, `FOUNDER_P0_AUDIT_2026-05-23.md`, live prod checks

Legend: **P0.5** = could embarrass in a live room · **P1** = nice to fix before demo · **P2** = after funding

---

## Sprint log

| Day | Done | Readiness |
|-----|------|-----------|
| 1 | Audit, gaps doc, 15-min script, investor calc model on branch | 8.5/10 |
| 2–3 | Merged to scaffold; placement verify ops seed; `/auth/signup` redirect; seed fix for `placement_verified_at` | **9.0/10** (post-push + Vercel redeploy) |

**Pre-demo ops (founder, 2 min):**

```bash
./scripts/ops-refresh-recruiter-inbox.sh          # reset batch accept rows
./scripts/ops-seed-placement-verify.sh            # bump verified_placements to ≥1 (after API deploy)
./scripts/verify-investor-demo-ready.sh           # expect READY
```

---

## P0.5 — Could embarrass in demo

| # | Gap | Evidence | Fix | Owner | Status |
|---|-----|----------|-----|-------|--------|
| 1 | Persona pricing lanes unreachable when logged in | Session redirect sent users to workspace home off `/for-companies#persona-pricing` | Merged PR #8 | Engineering | ✅ on scaffold |
| 2 | Investor calculator missing 4-program cost model | Referral 3-tier, founding drag, interview bonus not in P&L | Merged to scaffold | Engineering | ✅ on scaffold |
| 3 | `verified_placements: 0` on live metrics | `/investor/metrics` shows zero verified hires | `./scripts/ops-seed-placement-verify.sh` (ops token) + seed fix sets `placement_verified_at` | Founder/Eng | ✅ script shipped; run on prod after Railway deploy |
| 4 | Recruiter inbox empty after accept test | Batch accept consumes `applied` rows | `./scripts/ops-refresh-recruiter-inbox.sh` before demo | Founder/Eng | ✅ ops script on scaffold |
| 5 | Feature branch not on Vercel production | Persona pricing + calculator fixes local only | Push scaffold → Vercel auto-deploy | Engineering | ⚠️ push pending (founder merge/deploy) |

---

## P1 — Nice to fix before demo

| # | Gap | Fix | Owner | Status |
|---|-----|-----|-------|--------|
| 1 | Data room S3 off — “local demo” banner | Paste `S3_*` into `.env.railway` + `railway-apply-production-env.sh` | Founder | open |
| 2 | Thin social proof (`registered_users: 3`) | Label “pilot cohort” on metrics; avoid claiming scale | Product copy | ✅ early-stage badge on `/investor/metrics` |
| 3 | GitHub / Apple OAuth off | Optional — don’t demo those buttons | — | — |
| 4 | `/auth/signup` 404 | Redirect to `/register` | Eng | ✅ middleware 308 |
| 5 | Logo marquee grayscale on OAuth buttons | Merge `cursor/fix-logo-brand-colors` | Engineering | ✅ merged PR #9 |
| 6 | Paid subs / MRR zero | Honest — say Stripe wired, no active subs yet | Talking point | — |
| 7 | `INVESTOR_QA_TOP10.md` | Anticipate diligence questions | Product/docs | ✅ Day 1 |

---

## P2 — After funding

| # | Gap | Notes |
|---|-----|-------|
| 1 | Microsoft Graph write (propose events) | Read busy shipped; write is roadmap |
| 2 | Authologic KYC for placement cash-out | Legal/compliance |
| 3 | ATS OAuth live (Greenhouse/Lever prod keys) | Stub UI exists |
| 4 | GitHub Actions smoke on every push | Workflow on branch — PAT scope blocks push; use `cursor/p0-audit-ops-no-workflow` pattern or expand PAT |
| 5 | 100k jobs / global board scale | Out of Phase 1 scope |
| 6 | Full i18n audit (9 locales) | EN/PL solid; others spot-check |
| 7 | Playwright CI on Vercel previews | `frontend/e2e/smoke.spec.ts` |

---

## Founder-only blockers (cannot fix in code)

| Item | Why | Action |
|------|-----|--------|
| S3 / R2 keys | `data_room_s3_enabled: false` | `docs/FOUNDER_SECRETS_WHERE.md` |
| PAT workflow scope | Push may fail for workflow file changes | Frontend-only PRs push fine; or expand PAT scope |
| `DATABASE_PUBLIC_URL` | Local reseed / ensure-founder-demo-profile | Railway Postgres → Connect → copy URL |
| Demo password | Not in git | Vault / founder memory |
| Vercel production branch | Must track scaffold | Vercel dashboard — confirm `cursor/phase1-monorepo-scaffold` |

---

## Recommended fix order (Days 4–7)

1. **Founder:** push scaffold → confirm Vercel + Railway deploy; run ops scripts on prod.
2. Rehearse `DEMO_SCRIPT_v1.md` with timer (15 min).
3. Optional: S3 keys for live confidential data room.
4. Record Loom backup of logged-in walkthrough.
5. Day 7: dry-run with `./scripts/verify-investor-demo-ready.sh` + full script.
