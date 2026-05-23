# Cursor AI Autonomous Execution Protocol

## Operating Principles

1. **Always checkpoint progress**
   - After every major task completion
   - Before starting risky operations
   - Every 2 hours minimum

2. **Maintain execution log**
   - Document all decisions in `logs/autonomous-execution/YYYY-MM-DD.md`
   - Track all changes and blockers

3. **Verify before deploy**
   - Run tests (`pytest backend/tests -x` for touched areas)
   - Check `git status` and review `git diff`
   - Confirm no breaking changes or secrets in commits

4. **Rollback capability**
   - Keep checkpoint commits (`checkpoint: …` messages)
   - Document rollback steps below
   - Prefer small commits over one large dump

## Execution Flow

```
Start Task
  ↓
Load Context (read relevant files)
  ↓
Plan Approach (write to log)
  ↓
Execute (make changes)
  ↓
Test (run relevant tests)
  ↓
Checkpoint (commit with message)
  ↓
Report Progress (update log)
  ↓
Next Task or Complete
```

## Checkpoint Commands

```bash
# Start new task
./scripts/autonomous-checkpoint.sh 1 "Starting [task name]"

# Complete subtask
./scripts/autonomous-checkpoint.sh 2 "Completed [subtask name]"

# Before risky operation
./scripts/autonomous-checkpoint.sh 3 "Pre-deployment backup"

# After testing
./scripts/autonomous-checkpoint.sh 4 "Tests passing, ready to proceed"
```

**Note:** The checkpoint script auto-commits all staged/unstaged changes. Review diffs before checkpoints in production-sensitive work, or commit manually with explicit file lists.

## Safety Checks

Before ANY deployment or major change:

```bash
# 1. Run tests
cd backend && pytest tests -x -q

# 2. Check git status
git status

# 3. Review changes
git diff

# 4. Confirm branch
git branch --show-current

# 5. If all clear → proceed
# 6. If issues → rollback to last checkpoint
```

Production smoke (when deployed):

```bash
./scripts/verify-prod-health.sh
# or investor demo: ./scripts/verify-investor-demo-ready.sh
```

## Rollback Procedure

```bash
# See recent checkpoints
git log --oneline -10

# Rollback to checkpoint
git reset --hard <checkpoint-commit-hash>

# Or rollback just files
git checkout <checkpoint-commit-hash> -- path/to/file
```

## Communication Protocol

**Progress reports (every 2 hours):**

```
✅ Completed: [list tasks]
🔄 In Progress: [current task]
⏳ Remaining: [upcoming tasks]
🚫 Blockers: [issues or none]
```

**Blocker escalation:** If stuck for >30 minutes:

1. Document blocker in the daily log
2. Try 2 alternative approaches
3. If still stuck → checkpoint + report to human

**Decision documentation:**

```
Decision: [what was decided]
Rationale: [why this approach]
Alternatives considered: [what else was possible]
Risk assessment: [low/medium/high]
```

## Related Docs

- `docs/AUTONOMOUS_EXECUTION_CHECKLIST.md` — readiness checklist
- `docs/AUTONOMOUS_EXECUTION_SETUP_COMPLETE.md` — latest setup report
- `docs/PROD_AUTONOMOUS.md` — production deploy runbook
