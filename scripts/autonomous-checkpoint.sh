#!/bin/bash
# Autonomous execution checkpoint

CHECKPOINT_NUM=$1
MESSAGE=$2

echo "🔹 Checkpoint $CHECKPOINT_NUM: $MESSAGE"
echo "Time: $(date)"
echo "Branch: $(git branch --show-current)"
echo "Files changed: $(git status --short | wc -l | tr -d ' ')"
echo ""

# Auto-commit if changes exist
if [[ $(git status --short | wc -l | tr -d ' ') -gt 0 ]]; then
  git add -A
  git commit -m "checkpoint: $MESSAGE"
  echo "✅ Auto-committed"
else
  echo "No changes to commit"
fi
