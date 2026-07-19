#!/usr/bin/env bash
set -euo pipefail

changed_paths() {
  if [[ "$#" -eq 0 ]]; then
    cat
    return
  fi
  if [[ "$#" -ne 2 ]]; then
    echo "usage: $0 [<before-sha> <after-sha>]" >&2
    return 2
  fi
  git diff --name-only "$1" "$2"
}

api_required=false
frontend_required=false

while IFS= read -r path || [[ -n "$path" ]]; do
  [[ -z "$path" ]] && continue
  case "$path" in
    backend/*|.env.railway.example|docker-compose*.yml)
      api_required=true
      ;;
    frontend/*)
      frontend_required=true
      ;;
    docs/*|*.md|.github/*|scripts/*)
      ;;
    *)
      # Unknown root-level runtime files may affect either deployment.
      api_required=true
      frontend_required=true
      ;;
  esac
done < <(changed_paths "$@")

printf 'API_DEPLOY_REQUIRED=%s\n' "$api_required"
printf 'FRONTEND_DEPLOY_REQUIRED=%s\n' "$frontend_required"
