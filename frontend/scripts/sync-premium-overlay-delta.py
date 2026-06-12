#!/usr/bin/env python3
"""Translate only premium overlay keys that still match English."""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]
EN_JSON = Path("/tmp/premium-en.json")
OUT_DIR = ROOT / "src/lib/overlays/premium/generated"

LOCALES = {
    "es": "es",
    "it": "it",
    "fr": "fr",
    "de": "de",
    "zh": "zh-CN",
    "ar": "ar",
    "ja": "ja",
}

TOKENS = re.compile(
    r"(\{[^}]+\}|TWIN|ICS|WebCal|GDPR|OAuth|API|PDF|CSV|XLSX|Google|Microsoft|"
    r"LinkedIn|GitHub|Apple|Zoom|Teams|Meet|CalDAV|B2B|ROI|ATS|CRM|SDR|PLN|"
    r"Authologic|Railway|Vercel|Redis|Celery|ANTHROPIC_API_KEY|NEXT_PUBLIC_API_URL|"
    r"TWIN_API_BASE_URL|CORS_ORIGINS|SCRAPE_ENABLED_BOARD_IDS|LINKEDIN_|BETA_WAITLIST_CAP)"
)


def flatten(obj: dict, prefix: str = "") -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in obj.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, str):
            out[path] = value
        elif isinstance(value, dict):
            out.update(flatten(value, path))
    return out


def unflatten(flat: dict[str, str]) -> dict:
    out: dict = {}
    for path, value in flat.items():
        parts = path.split(".")
        cur = out
        for part in parts[:-1]:
            cur = cur.setdefault(part, {})
        cur[parts[-1]] = value
    return out


def shield(text: str) -> tuple[str, dict[str, str]]:
    mapping: dict[str, str] = {}

    def repl(match: re.Match[str]) -> str:
        token = f"__TOK{len(mapping)}__"
        mapping[token] = match.group(0)
        return token

    return TOKENS.sub(repl, text), mapping


def unshield(text: str, mapping: dict[str, str]) -> str:
    for token, original in mapping.items():
        text = text.replace(token, original)
    return text


def translate_text(text: str, target: str, attempt: int = 0) -> str:
    shielded, mapping = shield(text)
    try:
        out = GoogleTranslator(source="en", target=target).translate(shielded[:4500])
        return unshield(out or text, mapping)
    except Exception:
        if attempt < 3:
            time.sleep(1.5 * (attempt + 1))
            return translate_text(text, target, attempt + 1)
        raise


def load_existing_flat(code: str) -> dict[str, str]:
    path = OUT_DIR / f"{code}.ts"
    text = path.read_text(encoding="utf-8")
    start = text.index("{")
    end = text.rindex("}") + 1
    nested = json.loads(text[start:end])
    return flatten(nested)


def main() -> None:
    flat_en = flatten(json.loads(EN_JSON.read_text()))
    only = __import__("sys").argv[1] if len(__import__("sys").argv) > 1 else None

    for code, google_to in LOCALES.items():
        if only and code != only:
            continue
        existing = load_existing_flat(code)
        pending = [
            path
            for path, source in sorted(flat_en.items())
            if existing.get(path, source) == source
        ]
        print(f"{code}: translating {len(pending)} pending keys…")
        flat = dict(existing)
        for i, path in enumerate(pending):
            source = flat_en[path]
            try:
                flat[path] = translate_text(source, google_to)
            except Exception as err:
                print(f"  fail {path}: {err}")
            if i % 20 == 0:
                time.sleep(0.3)
            else:
                time.sleep(0.12)
        nested = unflatten(flat)
        export = f"premium{code[0].upper()}{code[1:]}Overlay"
        out = OUT_DIR / f"{code}.ts"
        out.write_text(
            f"/** Premium product overlay — {code} (generated). */\n"
            f"export const {export}: Record<string, unknown> = "
            f"{json.dumps(nested, ensure_ascii=False, indent=2)};\n",
            encoding="utf-8",
        )
        print(f"Wrote {out}")


if __name__ == "__main__":
    main()
