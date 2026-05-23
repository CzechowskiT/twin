"""Validate Cursor agent can write files, run commands, and edit code (setup smoke)."""

from __future__ import annotations

import os
import subprocess


def test_autonomous_can_write_files() -> None:
    """Verify autonomous executor can create files."""
    test_file = "/tmp/autonomous_test.txt"
    with open(test_file, "w", encoding="utf-8") as f:
        f.write("Cursor AI autonomous execution test")
    assert os.path.exists(test_file)
    os.remove(test_file)


def test_autonomous_can_run_commands() -> None:
    """Verify autonomous executor can run bash commands."""
    result = subprocess.run(
        ["echo", "autonomous test"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0
    assert "autonomous test" in result.stdout


def test_autonomous_can_modify_code() -> None:
    """Verify autonomous executor can edit Python files."""
    test_file = "/tmp/test_edit.py"
    with open(test_file, "w", encoding="utf-8") as f:
        f.write("def hello():\n    return 'world'\n")
    with open(test_file, encoding="utf-8") as f:
        content = f.read()
    new_content = content.replace("world", "autonomous")
    with open(test_file, "w", encoding="utf-8") as f:
        f.write(new_content)
    with open(test_file, encoding="utf-8") as f:
        assert "autonomous" in f.read()
    os.remove(test_file)
