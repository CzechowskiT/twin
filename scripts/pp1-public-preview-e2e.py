#!/usr/bin/env python3
"""PP1 — Public read-only synthetic preview E2E / stance checks.

Covers: kill-switch independence, fixture markers, robots/sitemap absence,
Epic 2.11 regression constants, and zero-mutation stance (code-level).
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PASS = 0
FAIL = 0


def check(name: str, ok: bool, detail: str = "") -> None:
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f"PASS  {name}" + (f" — {detail}" if detail else ""))
    else:
        FAIL += 1
        print(f"FAIL  {name}" + (f" — {detail}" if detail else ""))


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def main() -> int:
    gate = read("frontend/src/lib/public-preview-gate.ts")
    fixture = read("frontend/src/lib/public-preview-fixture.ts")
    page = read("frontend/src/app/preview/page.tsx")
    surface = read("frontend/src/components/public-preview/public-preview-surface.tsx")
    mw = read("frontend/src/middleware.ts")
    robots = read("frontend/src/app/robots.ts")
    sitemap = read("frontend/src/app/sitemap.ts")
    providers = read("frontend/src/components/providers.tsx")
    chrome = read("frontend/src/components/site-chrome.tsx")
    discover = read("backend/app/services/capability_discoverability.py")
    health = read("backend/app/services/health_ops.py")
    cfg = read("backend/app/config.py")
    production_gates = read("frontend/src/lib/production-action-gates.ts")

    check("gate exact value", 'READ_ONLY_SYNTHETIC' in gate)
    check("fixture 7 areas", fixture.count('id: "') >= 7)
    check("markers present", all(
        m in fixture
        for m in (
            "SYNTHETIC PRODUCT PREVIEW",
            "READ-ONLY",
            "FICTIONAL DATA",
            "NO ACCOUNT OR EXTERNAL ACTION IS TAKEN",
            "SIMULATED — NO REAL STATE CHANGE",
        )
    ))
    check("page gated", "isPublicPreviewEnabled" in page and "notFound" in page)
    check("page no private API", "/api/v1/" not in page and "fetch(" not in page)
    check("surface no storage APIs", all(
        s not in surface for s in ("localStorage", "sessionStorage", "indexedDB", "document.cookie")
    ))
    check("surface no fetch", not re.search(r"fetch\s*\(", surface))
    check("middleware X-Robots-Tag", "X-Robots-Tag" in mw and "noindex" in mw)
    check("middleware kill switch 404", "isPublicPreviewEnabled" in mw and "404" in mw)
    check("middleware private cache for cookies", "private, no-store" in mw)
    check("robots disallow /preview", '"/preview"' in robots)
    check("sitemap excludes /preview", "/preview" not in sitemap)
    check("providers skip analytics on preview", "PublicPreviewProviders" in providers)
    check("chrome immersive preview", "publicPreview" in chrome)
    check("backend independent switch", "public_preview_enabled" in discover)
    check("health ops preview fields", "rc1_public_preview_status" in health)
    check("config public_preview field", "public_preview: str" in cfg)
    check("launch stays NO-GO in gates", 'PILOT_ACCESS_STATUS = "OPERATIONALLY_READY_INACTIVE"' in production_gates)
    check(
        "enrollment gate untouched in preview gate",
        "EXTERNAL_PILOT_ENROLLMENT" not in gate and "LAUNCH" not in gate,
    )
    check(
        "no signup/waitlist form controls",
        all(
            x not in surface
            for x in (
                'href="/register"',
                'href="/waitlist"',
                'href="/login"',
                'type="email"',
                'type="password"',
                "<form",
                'type="file"',
                "<textarea",
            )
        ),
    )
    # Simulated flash copy
    check(
        "simulated flash copy",
        "SIMULATED — NO REAL STATE CHANGE" in surface
        or "simulatedFlash" in surface,
    )

    # Epic 2.11 regression: guided FV files still present
    check("epic211 guided entry exists", (ROOT / "frontend/src/components/dashboard/guided-first-value-entry.tsx").exists())
    check("epic211 isolated demo service exists", (ROOT / "backend/app/services/isolated_demo.py").exists())

    print(f"\nPP1 E2E code checks: {PASS} pass / {FAIL} fail")
    env = (os.environ.get("NEXT_PUBLIC_PUBLIC_PREVIEW") or "").strip()
    print(f"LOCAL_FLAG={env or '(unset)'} status={'ENABLED' if env == 'READ_ONLY_SYNTHETIC' else 'READY_INACTIVE'}")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
