#!/usr/bin/env python3
"""List FastAPI routes (method + path) for production audits. Run from repo root."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

from app.main import app  # noqa: E402


def collect_routes() -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            for method in sorted(route.methods - {"HEAD", "OPTIONS"}):
                out.append((method, route.path))
        elif hasattr(route, "routes"):
            for sub in route.routes:
                if hasattr(sub, "methods") and hasattr(sub, "path"):
                    for method in sorted(sub.methods - {"HEAD", "OPTIONS"}):
                        out.append((method, sub.path))
    return sorted(out, key=lambda x: (x[1], x[0]))


def main() -> None:
    routes = collect_routes()
    for method, path in routes:
        print(f"{method:7} {path}")
    print(f"--- TOTAL {len(routes)}", file=sys.stderr)


if __name__ == "__main__":
    main()
