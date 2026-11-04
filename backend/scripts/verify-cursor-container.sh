#!/usr/bin/env bash
# Disposable standard-runner validation: no provider keys, cloud deploy or image push.
set -euo pipefail
image="twin-cursor-verify:${GITHUB_SHA:-local}"
env_file="$(mktemp)"
trap 'rm -f "$env_file"' EXIT
cat > "$env_file" <<'ENV'
ENVIRONMENT=development
SECRET_KEY=ci-only-container-verification-secret-at-least-32-characters
DATABASE_URL=postgresql+psycopg://postgres:ci-local-only@twin-verify-db:5432/twin_clean
REDIS_URL=redis://127.0.0.1:1/0
CELERY_BROKER_URL=memory://
CELERY_RESULT_BACKEND=cache+memory://
CELERY_TASK_ALWAYS_EAGER=false
AGENT_DISPATCH_BILLABLE_EXECUTION_ENABLED=false
AGENT_DISPATCH_TOKEN=ci-only-dispatch-token
AGENT_DISPATCH_REPO_ALLOWLIST=https://github.com/CzechowskiT/twin
AGENT_DISPATCH_BASE_BRANCH_ALLOWLIST=cursor/phase1-monorepo-scaffold
API_URL=https://container-verification.invalid
ENV
docker build --pull -t "$image" backend
docker image inspect "$image" --format 'Built image ID: {{.Id}}'
docker network create --internal twin-verify-net
docker run -d --name twin-verify-db --network twin-verify-net \
  -e POSTGRES_PASSWORD=ci-local-only -e POSTGRES_DB=twin_clean postgres:18
for attempt in $(seq 1 60); do
  if docker exec twin-verify-db pg_isready -U postgres -d twin_clean; then break; fi
  if [[ "$attempt" == 60 ]]; then exit 1; fi
  sleep 1
done
echo 'Clean PostgreSQL 18: base to head'
docker run --rm --network twin-verify-net --env-file "$env_file" "$image" alembic upgrade head
docker run --rm --network twin-verify-net --env-file "$env_file" "$image" python scripts/verify-cursor-container.py db
echo 'Existing schema: 077 to head with synthetic data'
docker exec twin-verify-db createdb -U postgres twin_upgrade
upgrade_url='postgresql+psycopg://postgres:ci-local-only@twin-verify-db:5432/twin_upgrade'
docker run --rm --network twin-verify-net --env-file "$env_file" -e DATABASE_URL="$upgrade_url" \
  "$image" alembic upgrade 077_candidate_activity_timeline
docker exec twin-verify-db psql -v ON_ERROR_STOP=1 -U postgres -d twin_upgrade -c \
  "INSERT INTO users (email,hashed_password,is_active,created_at,email_product_updates,email_interview_reminders) VALUES ('ci-preservation@example.invalid','not-a-real-password',true,NOW(),false,false);"
docker run --rm --network twin-verify-net --env-file "$env_file" -e DATABASE_URL="$upgrade_url" \
  "$image" alembic upgrade head
docker run --rm --network twin-verify-net --env-file "$env_file" -e DATABASE_URL="$upgrade_url" \
  "$image" python scripts/verify-cursor-container.py db --preserved-row
echo 'Recovery and no-op upgrade at head'
docker run --rm --network twin-verify-net --env-file "$env_file" "$image" python scripts/alembic_prod_recovery.py
docker run --rm --network twin-verify-net --env-file "$env_file" "$image" alembic upgrade head
docker run --rm --network twin-verify-net --env-file "$env_file" "$image" python scripts/verify-cursor-container.py db
echo 'Chromium with local HTML only'
docker run --rm --network twin-verify-net --env-file "$env_file" "$image" python -c \
  'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); b=p.chromium.launch(headless=True,args=["--no-sandbox"]); page=b.new_page(); page.set_content("<title>TWIN offline verification</title>"); assert page.title()=="TWIN offline verification"; b.close(); p.stop(); print("Chromium local HTML: PASS")'
echo 'Actual Docker CMD and start-api.sh'
docker run -d --name twin-verify-api --network twin-verify-net --env-file "$env_file" \
  -p 127.0.0.1:43877:8000 "$image"
for attempt in $(seq 1 90); do
  if curl -fsS http://127.0.0.1:43877/api/v1/health > /dev/null; then break; fi
  if [[ "$attempt" == 90 ]]; then docker logs twin-verify-api; exit 1; fi
  sleep 1
done
docker exec twin-verify-api python scripts/verify-cursor-container.py http
docker run --rm --network twin-verify-net --env-file "$env_file" "$image" python scripts/verify-cursor-container.py db
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  cat >> "$GITHUB_STEP_SUMMARY" <<'SUMMARY'
## TWIN container verification
- Dockerfile built successfully; no image published.
- PostgreSQL 18: clean migration and 077 to head passed, synthetic row preserved.
- Recovery at head and repeated migration passed.
- Chromium opened local HTML successfully.
- Actual container startup, database health and OAuth HTTP checks passed.
- Default execution interlock blocked dispatch; no Cursor agent launched.
- Temporary internal Docker network; no production credentials or databases.
SUMMARY
fi
