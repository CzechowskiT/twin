.PHONY: up down api worker beat migrate test setup open

setup:
	@./open-folder.sh

open:
	@./open-folder.sh --launch

up:
	docker compose up -d postgres redis

down:
	docker compose down

migrate:
	cd backend && . .venv/bin/activate && alembic upgrade head

api:
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload

worker:
	cd backend && . .venv/bin/activate && celery -A app.tasks.celery_app worker --loglevel=info

beat:
	cd backend && . .venv/bin/activate && celery -A app.tasks.celery_app beat --loglevel=info

test:
	cd backend && . .venv/bin/activate && pytest -q

frontend:
	cd frontend && npm run dev

auto-apply:
	@test -n "$(JOB_ID)" || (echo "Usage: make auto-apply JOB_ID=42 EMAIL=you@example.com"; exit 1)
	@test -n "$(EMAIL)" || (echo "Usage: make auto-apply JOB_ID=42 EMAIL=you@example.com"; exit 1)
	cd backend && . .venv/bin/activate && python -m app.automation.cli --job-id $(JOB_ID) --email $(EMAIL)
