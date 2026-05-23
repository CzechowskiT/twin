# Investor demo gaps — prioritized (Day 1 sprint)

**Date:** 2026-05-23  
**Demo target:** ~30 May 2026  
**Sources:** `AUDIT_RESULTS_2026-05-23_claude.md`, `FOUNDER_P0_AUDIT_2026-05-23.md`, live prod checks

Legend: **P0.5** = could embarrass in a live room · **P1** = nice to fix before demo · **P2** = after funding

---

## P0.5 — Could embarrass in demo

| # | Gap | Evidence | Fix | Owner | Status |
|---|-----|----------|-----|-------|--------|
| 1 | Persona pricing lanes unreachable when logged in | Session redirect sent users to workspace home off `/for-companies#persona-pricing` | Merge `cursor/fix-persona-pricing-lanes` | Engineering | ✅ fixed on branch |
| 2 | Investor calculator missing 4-program cost model | Referral 3-tier, founding drag, interview bonus not in P&L | Merge investor calculator slice on same branch | Engineering | ✅ fixed locally, unmerged |
| 3 | `verified_placements: 0` on live metrics | `/investor/metrics` shows zero verified hires | Seed placement verify event OR talking point: “pilot — verification machine shipped, first fees post-launch” | Founder/Eng | ⚠️ open |
| 4 | Recruiter inbox empty after accept test | Batch accept consumes `applied` rows | Run `./scripts/ops-refresh-recruiter-inbox.sh` before demo | Founder/Eng | ⚠️ ops script exists |
| 5 | Feature branch not on Vercel production | Persona pricing + calculator fixes local only | Merge to scaffold + redeploy | Engineering | ⚠️ open |

---

## P1 — Nice to fix before demo

| # | Gap | Fix | Owner |
|---|-----|-----|-------|
| 1 | Data room S3 off — “local demo” banner | Paste `S3_*` into `.env.railway` + `railway-apply-production-env.sh` | Founder |
| 2 | Thin social proof (`registered_users: 3`) | Label “pilot cohort” on metrics; avoid claiming scale | Product copy |
| 3 | GitHub / Apple OAuth off | Optional — don’t demo those buttons | — |
| 4 | `/auth/signup` 404 | Add redirect to `/register` or document in script only | Eng (quick) |
| 5 | Logo marquee grayscale on OAuth buttons | Merge `cursor/fix-logo-brand-colors` | Engineering |
| 6 | Paid subs / MRR zero | Honest — say Stripe wired, no active subs yet | Talking point |
| 7 | `INVESTOR_QA_TOP10.md` | Anticipate diligence questions | Product/docs |

---

## P2 — After funding

| # | Gap | Notes |
|---|-----|-------|
| 1 | Microsoft Graph write (propose events) | Read busy shipped; write is roadmap |
| 2 | Authologic KYC for placement cash-out | Legal/compliance |
| 3 | ATS OAuth live (Greenhouse/Lever prod keys) | Stub UI exists |
| 4 | GitHub Actions smoke on every push | Workflow added on branch — enable on scaffold |
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
| Vercel production branch | Must track scaffold | Vercel dashboard |

---

## Recommended fix order (Days 2–3)

1. Merge + deploy persona pricing + investor calculator + logo colors (single PR or two small PRs).
2. `./scripts/ops-refresh-recruiter-inbox.sh` + verify inbox has `applied` rows.
3. Optional: `ensure-founder-demo-profile.py` on prod if profile thin.
4. Founder: S3 keys if sharing confidential diligence pack live.
5. Rehearse `DEMO_SCRIPT_v1.md` once with timer.
