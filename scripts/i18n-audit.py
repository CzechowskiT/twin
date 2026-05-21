#!/usr/bin/env python3
"""List TSX files with likely hardcoded UI strings (heuristic for i18n gaps)."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "frontend" / "src" / "app"
COMPONENTS = ROOT / "frontend" / "src" / "components"

# Lines that look like user-visible English (rough).
PATTERN = re.compile(
    r">([A-Z][a-z][^<{]{8,80})<|"
    r'placeholder="([A-Z][^"]{4,})"|'
    r'aria-label="([A-Z][^"]{4,})"'
)


def scan(path: Path) -> list[str]:
    if "node_modules" in str(path):
        return []
    text = path.read_text(encoding="utf-8", errors="ignore")
    if '"use client"' not in text and "/app/" not in str(path):
        return []
    if "useTranslation" in text or "getPersonaBundle" in text:
        return []
    hits: list[str] = []
    for i, line in enumerate(text.splitlines(), 1):
        if "t(" in line or "className=" in line and ">" not in line:
            continue
        for m in PATTERN.finditer(line):
            snippet = (m.group(1) or m.group(2) or m.group(3) or "").strip()
            if snippet and not snippet.startswith("http"):
                hits.append(f"  L{i}: {snippet[:60]}")
    return hits[:8]


def main() -> None:
    suspects: list[tuple[str, list[str]]] = []
    for base in (APP, COMPONENTS):
        for path in sorted(base.rglob("*.tsx")):
            hits = scan(path)
            if hits:
                suspects.append((str(path.relative_to(ROOT)), hits))

    print(f"# i18n audit — {len(suspects)} files may need useTranslation()")
    for rel, hits in suspects[:40]:
        print(f"\n## {rel}")
        for h in hits:
            print(h)
    if len(suspects) > 40:
        print(f"\n… and {len(suspects) - 40} more")


if __name__ == "__main__":
    main()
