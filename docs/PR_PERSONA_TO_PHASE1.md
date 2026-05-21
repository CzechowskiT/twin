# PR: persona isolation → phase1 scaffold

**Status:** merged locally and pushed to `cursor/phase1-monorepo-scaffold` (fast-forward, commits `a327487`…`579f10d`).

## Open on GitHub (record / review)

If `gh` is installed:

```bash
gh pr create \
  --base cursor/phase1-monorepo-scaffold \
  --head cursor/persona-space-isolation \
  --title "Persona space isolation + MVP six todos" \
  --body-file - <<'EOF'
## Summary
- Isolate candidate / recruiter / company routes and navigation
- WebCal one-click subscribe from dashboard calendar strip
- Jobs empty state when corpus is zero; status scrape ops hint
- verify-mvp-six.sh gate

## Test plan
- [ ] ./scripts/verify-mvp-six.sh
- [ ] Dashboard → calendar strip → Open in calendar app
- [ ] /calculator/b2b blocked for candidate persona
EOF
```

Without CLI: [Compare branches](https://github.com/CzechowskiT/twin/compare/cursor/phase1-monorepo-scaffold...cursor/persona-space-isolation) — if already merged, GitHub shows no diff.

## Deploy

Push to `cursor/phase1-monorepo-scaffold` triggers Vercel + Railway when connected.

```bash
git push origin cursor/phase1-monorepo-scaffold
```
