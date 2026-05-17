#!/bin/sh
set -e
cd /app

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
