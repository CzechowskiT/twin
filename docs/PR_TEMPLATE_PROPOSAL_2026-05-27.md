# PR template proposal (docs-only) — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** Backlog 22 of the long autonomous security session.
A docs-only **proposal** for a `.github/PULL_REQUEST_TEMPLATE.md`
that the next session can drop in unchanged. This file lives in
`docs/` (not in `.github/`) because the session HARD BAN frowns
on adding new workflow / GitHub config surface in the same
window that ships security work — we want one deliberate add
review, not a piggyback.

## Why a PR template at all

- The repo has 36 routers, 175 routes, 50 migrations, and 1000+
  tracked files. Reviewers won't catch a `.env` commit, a
  `--no-verify` push, or a sneak migration **unless** the PR
  body forces a 30-second self-audit.
- A template is the cheapest way to enforce the HARD BAN list
  from `.cursorrules`.

## Drop-in template

Paste the block below into `.github/PULL_REQUEST_TEMPLATE.md`
in one deliberate commit:

```markdown
<!-- TWIN PR template — keep it skimmable. Tick what applies. -->

## What this PR changes
<!-- One paragraph. What and why, not how. -->

## Scope
- [ ] Backend (`backend/`)
- [ ] Frontend (`frontend/`)
- [ ] Docs (`docs/`, `README.md`)
- [ ] CI (`.github/workflows/`)
- [ ] Scripts (`scripts/`)
- [ ] Database migration (`backend/alembic/versions/`)

## Pre-merge safety check
- [ ] No `.env` / secrets in the diff
- [ ] No `--no-verify` push
- [ ] No force-push (`git push --force` / `git push -f`)
- [ ] If a migration was added: `alembic upgrade head` runs clean on a fresh DB locally
- [ ] If FE was touched: `npm run lint && npm run tsc && npm run build` passes locally
- [ ] If BE was touched: relevant `pytest` runs pass locally

## Tests
<!-- Which tests cover this PR? Paste names or describe. -->

## Risk
- [ ] Reversible by a single `git revert <sha>`
- [ ] Behind a feature flag / env toggle
- [ ] Touches money / placement / consent / GDPR surface

## Linked docs / issues
<!-- Reference docs/P1_*, docs/P2_*, or any design doc. -->
```

## Why every line is there

| Field                           | Why                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| "What this PR changes"          | Forces a sentence of intent — half the bad PRs in this repo were stopped by reading the title and asking "wait, why?".    |
| "Scope" checkboxes              | The reviewer sees at a glance whether to expect FE / BE / migration. A backend PR that says `frontend` got ticked is a red flag. |
| `.env` / secrets                | First-class HARD BAN from `.cursorrules`. Visible in every PR.                                                             |
| `--no-verify` / force-push      | Same.                                                                                                                     |
| Alembic upgrade on fresh DB     | The two times this branch has broken in CI in the last quarter both involved a migration that "worked locally but ran differently on prod". Force the local check. |
| FE local lint / tsc / build     | Mirrors `.cursorrules` test gates.                                                                                         |
| BE local pytest                 | Same.                                                                                                                     |
| "Reversible by git revert"      | If the answer is no, the PR needs a runbook — that's a culture signal, not a CI gate.                                       |
| "Behind a feature flag"         | Risk visibility; especially important once we wire LaunchDarkly / similar.                                                 |
| "Money / placement / consent"   | These are the three surfaces where a quiet regression has the largest blast radius (see `SECURITY_RISK_REGISTER_2026-05-27.md`). |
| "Linked docs / issues"          | Closes the loop with the `P1_DOCS_INDEX_2026-05-27.md` corpus.                                                              |

## What this proposal explicitly does **not** include

- **No required CODEOWNERS rule.** Adding `CODEOWNERS` forces
  GitHub's review-blocking machinery and would gate the
  founder's own merges, which is wrong while team size = 1.
- **No required status checks on merge.** Branch protection
  rules are operator-level config, not a doc-level proposal.
  Add them via the GitHub UI when team size > 1.
- **No automatic labelling.** The 60-line template is already
  the heaviest thing we'd add at this size; labels-as-friction
  is a future-team concern.

## Suggested rollout

1. Next session: copy the block above into
   `.github/PULL_REQUEST_TEMPLATE.md` in one commit titled
   `chore(repo): add PR template`.
2. Verify by opening a no-op PR against `main` and confirming
   GitHub pre-fills the body.
3. Add a one-liner to `README.md`: *"PRs follow
   `.github/PULL_REQUEST_TEMPLATE.md`."*

Total cost: < 10 LOC of repo change, no deploy.

## Hard bans honoured

- ✅ Docs only.
- ✅ No `.github/` change in this commit.
- ✅ No CI / workflow change.
- ✅ No source change.
- ✅ No deploy / Railway / Vercel change.
- ✅ No `.env` / secret change.
- ✅ No UX / copy change.

## Files

- `docs/PR_TEMPLATE_PROPOSAL_2026-05-27.md` (this doc).

## Related

- `.cursorrules` — the HARD BAN list that the template
  enforces.
- `.github/workflows/smoke.yml` — the existing CI surface that
  the template references (FE / BE test gates).
- `docs/CI_SMOKE_DOCS_ONLY_VERIFY_2026-05-27.md` — context on
  how `paths-ignore` + push coalescing interacts with the test
  gates in the template.

Backlog 22 of the long autonomous security session.
