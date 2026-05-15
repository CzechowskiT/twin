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
