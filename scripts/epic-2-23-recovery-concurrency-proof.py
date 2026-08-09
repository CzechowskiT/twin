#!/usr/bin/env python3
"""Epic 2.23 — local concurrency note for recovery completion (FOR UPDATE).

Does not hit production. Documents that complete_recovery_with_token uses
with_for_update() so concurrent completions serialize on the challenge row.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src = (ROOT / "backend/app/services/password_reset.py").read_text(encoding="utf-8")
ok = "with_for_update" in src and "revoke_everywhere" in src
print("complete_recovery uses with_for_update + revoke_everywhere:", ok)
raise SystemExit(0 if ok else 1)
