#!/usr/bin/env bash
# TWIN local dev bootstrap — run from repo root: ./open-folder.sh [--launch]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

LAUNCH_TERMINALS=false
if [[ "${1:-}" == "--launch" ]]; then
  LAUNCH_TERMINALS=true
fi

echo "==> TWIN @ $ROOT"

# Open in Cursor if CLI exists
if command -v cursor >/dev/null 2>&1; then
  cursor "$ROOT" >/dev/null 2>&1 || true
elif [[ -d "/Applications/Cursor.app" ]]; then
  open -a Cursor "$ROOT"
fi

# Env file
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example — set SECRET_KEY and ANTHROPIC_API_KEY"
fi

# Backend venv + deps
if [[ ! -d backend/.venv ]]; then
  echo "==> Creating Python venv in backend/"
  python3 -m venv backend/.venv
fi
# shellcheck source=/dev/null
source backend/.venv/bin/activate
pip install -q -r backend/requirements.txt

if ! python -c "import playwright" 2>/dev/null; then
  : # already in requirements
fi
if [[ ! -d "$HOME/.cache/ms-playwright" ]] && [[ ! -d backend/.playwright ]]; then
  echo "==> Installing Playwright Chromium (first run only)"
  playwright install chromium || true
fi

# Frontend deps
if [[ ! -d frontend/node_modules ]]; then
  echo "==> npm install (frontend)"
  (cd frontend && npm install)
fi
if [[ ! -f frontend/.env.local ]]; then
  cp frontend/.env.local.example frontend/.env.local
fi

# Docker: Postgres + Redis
if ! docker info >/dev/null 2>&1; then
  echo ""
  echo "ERROR: Docker is not running."
  echo ""
  echo "TWIN needs Docker Desktop for the database. Do this:"
  echo "  1. Open Docker Desktop (Applications → Docker)"
  echo "  2. Wait until the whale icon says Docker is running"
  echo "  3. Run again:  ./open-folder.sh --launch"
  echo ""
  if [[ ! -d "/Applications/Docker.app" ]]; then
    echo "Docker is not installed. Install from: https://www.docker.com/products/docker-desktop/"
  fi
  exit 1
fi
echo "==> Starting Postgres + Redis (docker compose)"
docker compose up -d postgres redis

echo "==> Running migrations"
(cd backend && alembic upgrade head)

echo ""
echo "Ready. In separate terminals (or use --launch):"
echo "  make api       # http://localhost:8000/docs"
echo "  make worker"
echo "  make beat"
echo "  make frontend  # http://localhost:3000"
echo ""

if $LAUNCH_TERMINALS && [[ "$(uname)" == "Darwin" ]]; then
  run_tab() {
    osascript -e "tell application \"Terminal\" to do script \"$1\""
  }
  run_tab "cd '$ROOT' && make api"
  run_tab "cd '$ROOT' && make worker"
  run_tab "cd '$ROOT' && make beat"
  run_tab "cd '$ROOT' && make frontend"
  sleep 3
  open "http://localhost:3000"
  open "http://localhost:8000/docs"
  echo "Opened Terminal tabs and browsers."
else
  open "http://localhost:3000" 2>/dev/null || true
fi
