#!/bin/sh
set -e
cd /app

# Solo API on Railway: without Redis, default Celery broker (localhost) never accepts jobs.
# When neither broker env is set, run scrape tasks in-process (matches CELERY_TASK_ALWAYS_EAGER).
if [ -n "${RAILWAY_ENVIRONMENT:-}" ] && [ -z "${CELERY_TASK_ALWAYS_EAGER:-}" ]; then
  if [ -z "${REDIS_URL:-}" ] && [ -z "${CELERY_BROKER_URL:-}" ]; then
    export CELERY_TASK_ALWAYS_EAGER=true
    echo "Railway solo: REDIS_URL/CELERY_BROKER_URL unset — CELERY_TASK_ALWAYS_EAGER=true (in-process scrape)." >&2
  fi
fi

# PR #97/#101: prod may stamp past 052_calendar without applying it — rewind safely, then upgrade.
python scripts/alembic_prod_recovery.py 2>&1 \
  || echo "Warning: alembic prod recovery failed (non-fatal)" >&2

# Railway: Postgres may not accept connections for a few seconds after the container starts.
i=1
while [ "$i" -le 30 ]; do
  if alembic upgrade head; then
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "alembic upgrade head failed after 30 attempts — check DATABASE_URL and migration history" >&2
    exit 1
  fi
  echo "Waiting for database (alembic retry $i/30)..." >&2
  sleep 2
  i=$((i + 1))
done

# Two workers: calendar/oauth sync must not starve /health on a single event loop.
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 2
