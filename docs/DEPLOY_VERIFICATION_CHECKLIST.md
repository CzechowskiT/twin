# Deploy Verification Checklist

**Branch:** `cursor/phase1-monorepo-scaffold` (primary deploy)  
**API:** https://twin-production-bcd9.up.railway.app  
**Frontend:** https://twin-sooty.vercel.app  

Run after Railway/Vercel deploy — **do not** run destructive DB ops from this checklist.

---

## After deploy

- [ ] **API health + commit SHA**
  ```bash
  curl -s "https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1&db=1" | jq '{status, git_commit, db_ok}'
  ```
  Expect: `status=ok`, `db_ok=true`, `git_commit` matches intended deploy SHA.

- [ ] **Full prod smoke script**
  ```bash
  ./scripts/verify-prod-health.sh
  ```
- [ ] **Investor metrics — pipeline (not $0 revenue)**
  - Visit https://twin-sooty.vercel.app/investor/metrics (investor persona)
  - When `verified_placements === 0`: card shows **Recruitment pipeline** (applications + interviews), not “$0 placement revenue”.

- [ ] **Demo snapshot**
  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" "https://twin-production-bcd9.up.railway.app/api/v1/demo/snapshot"
  ```
  Expect: `200` (not 404/500). Visit https://twin-sooty.vercel.app/demo → HTTP 200.

- [ ] **Frontend build parity (pre-push CI)**
  ```bash
  cd frontend && npm run build
  ```

- [ ] **Backend tests (pre-push CI)**
  ```bash
  cd backend && python3 -m pytest tests/test_auto_apply_investor_demo.py tests/test_job_competitive_api.py -q
  ```

- [ ] **Investor demo readiness (after seed)**
  ```bash
  ./scripts/verify-investor-demo-ready.sh
  ```
  Expect exit 0 when `DEMO_MODE_ENABLED=true` and seed applied.

---

## Rollback if deploy fails

1. Identify last good commit: `git log --oneline -5`
2. Revert bad commits on deploy branch (prefer revert over force-push):
   ```bash
   git revert <bad-sha>..HEAD
   git push origin cursor/phase1-monorepo-scaffold
   ```
3. Redeploy Railway/Vercel from reverted branch.
4. Re-run `./scripts/verify-prod-health.sh`.

**Do not** force-push to `main` unless explicitly approved. **Do not** run migrations down on production without a written plan.

---

## Related

- [FOUNDER_STATUS_LIVE.md](./FOUNDER_STATUS_LIVE.md)
- [INVESTOR_DEMO_RUNBOOK.md](./INVESTOR_DEMO_RUNBOOK.md)
- `.github/workflows/smoke.yml` (CI: pytest + build + prod curl)
