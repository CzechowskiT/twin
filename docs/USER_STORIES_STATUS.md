# User stories — implementation status (auto-generated heuristic)

Source spec: [USER_STORIES_COMPLETE.md](./USER_STORIES_COMPLETE.md) (2617 lines).

**Reality:** TWIN Phase 1 MVP already covers most candidate journeys in code; this file tracks gaps, not greenfield builds.

| Phase | Stories | Repo signals | Honest status |
|-------|---------|--------------|---------------|
| Phase 1 Candidate | 50 (US-C*) | 8/8 areas | **mostly done** (~100% surfaces) |
| Phase 2 Recruiter | 40 (US-R*) | 3/3 areas | **mostly done** (~100% surfaces) |
| Phase 3 Investor | 20 (US-I*) | 2/2 areas | **mostly done** (~100% surfaces) |

## Phase 1 critical paths (investor demo)

- [x] Landing + social proof (`MvpLiveStatsStrip`, `/how-it-works`, `/pricing`)
- [x] Register/login zones per persona
- [x] 5-step onboarding + resume (`OnboardingGate`, localStorage step)
- [x] Dashboard matches + applications + nightly auto-apply
- [ ] Email verification flow (account activation email)
- [ ] Prod job corpus always populated (ops scrape)
- [ ] Full 50/50 story acceptance criteria from spec

## Not in 16h scope

- ATS integrations (Greenhouse/Lever) — Phase 2+
- 200+ dedicated endpoints / 1000+ tests per spec fiction
- Load test 100 concurrent users

Regenerate: `python scripts/story_audit.py`
