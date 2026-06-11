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

# Fix stale alembic_version after PR #97 renumbered migration revisions.
# The DB may still reference old IDs that no longer exist in the codebase.
python -c "
import sqlalchemy, os
url = os.environ.get('DATABASE_URL', '')
if url:
    engine = sqlalchemy.create_engine(url)
    old_to_new = {
        '052_recruiter_audit_events': '053_recruiter_audit_events',
        '053_recruiter_pipeline_status': '054_recruiter_pipeline_status',
        '054_recruiter_manual_scheduling': '055_recruiter_manual_scheduling',
    }
    with engine.connect() as conn:
        result = conn.execute(sqlalchemy.text('SELECT version_num FROM alembic_version'))
        row = result.fetchone()
        if row and row[0] in old_to_new:
            new_rev = old_to_new[row[0]]
            conn.execute(sqlalchemy.text('UPDATE alembic_version SET version_num = :new WHERE version_num = :old'), {'new': new_rev, 'old': row[0]})
            conn.commit()
            print(f'Stamped alembic_version: {row[0]} -> {new_rev}')
" 2>&1 || echo "Warning: alembic version stamp check failed (non-fatal)" >&2

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

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
