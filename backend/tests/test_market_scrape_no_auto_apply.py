"""Market scrape batches must not import auto-apply modules."""

import ast
from pathlib import Path


def test_market_scrape_batches_module_has_no_auto_apply_imports() -> None:
    path = Path(__file__).resolve().parents[1] / "app" / "tasks" / "market_scrape_batches.py"
    tree = ast.parse(path.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                assert "auto_apply" not in alias.name
        elif isinstance(node, ast.ImportFrom):
            mod = node.module or ""
            assert "auto_apply" not in mod
            for alias in node.names:
                assert "auto_apply" not in alias.name
