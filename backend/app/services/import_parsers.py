"""Epic 2.12 — Sandboxed family parsers (no network/shell; bounded output)."""

from __future__ import annotations

import csv
import io
import json
import re
from typing import Any

from app.services.candidate_owned_import_constants import (
    MAX_CSV_ROWS,
    MAX_EXTRACT_CHARS,
    MAX_STAGING_ITEMS,
    TWIN_RESTORE_DENY_KEYS,
)
from app.services.cv_parser import CvParseError, extract_cv_text
from app.services.import_security import ImportSecurityError

UNTRUSTED_PREFIX = "UNTRUSTED_CANDIDATE_DATA"


def _clip(text: str, n: int = MAX_EXTRACT_CHARS) -> str:
    return (text or "")[:n]


def _escape_preview(text: str) -> str:
    # Structural: never treat imported text as code/instructions
    t = _clip(text, 4000)
    t = t.replace("<", "&lt;").replace(">", "&gt;")
    return f"[{UNTRUSTED_PREFIX}]\n{t}"


def parse_document(content: bytes, ext: str) -> list[dict[str, Any]]:
    """Document → evidence staging proposals (not committed)."""
    name = f"file{ext}"
    try:
        if ext in {".txt", ".md"}:
            text = content.decode("utf-8", errors="replace")
            text = _clip(text)
            if len(text.strip()) < 20:
                raise ImportSecurityError("insufficient_text")
        else:
            # Reuse CV extractor with synthetic name matching ext
            text = extract_cv_text(content, name)
    except CvParseError as exc:
        raise ImportSecurityError("parse_failed") from exc

    # Split into coarse evidence cards — no LLM
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    items: list[dict[str, Any]] = []
    for i, para in enumerate(paragraphs[:MAX_STAGING_ITEMS]):
        title = para.split("\n", 1)[0][:120] or f"Imported section {i + 1}"
        items.append(
            {
                "item_key": f"doc:{i}",
                "target_kind": "evidence",
                "title": title,
                "summary": para[:2000],
                "claim_kind": "CANDIDATE_DECLARED",
                "truth": "CANDIDATE_DECLARED",
                "preview_escaped": _escape_preview(para),
                "provenance": {"family": "document", "parser": "document_v1"},
            }
        )
    if not items:
        items.append(
            {
                "item_key": "doc:0",
                "target_kind": "evidence",
                "title": "Imported document",
                "summary": text[:2000],
                "claim_kind": "CANDIDATE_DECLARED",
                "truth": "CANDIDATE_DECLARED",
                "preview_escaped": _escape_preview(text),
                "provenance": {"family": "document", "parser": "document_v1"},
            }
        )
    return items


def parse_tracker_csv(content: bytes) -> list[dict[str, Any]]:
    text = content.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ImportSecurityError("csv_missing_header")
    items: list[dict[str, Any]] = []
    for i, row in enumerate(reader):
        if i >= MAX_CSV_ROWS:
            break
        clean = {str(k).strip().lower()[:64]: str(v or "").strip()[:500] for k, v in row.items() if k}
        title = clean.get("title") or clean.get("job_title") or clean.get("company") or f"Opportunity {i + 1}"
        company = clean.get("company") or clean.get("employer") or ""
        items.append(
            {
                "item_key": f"opp:{i}",
                "target_kind": "opportunity",
                "title": title[:200],
                "summary": f"{company} · {clean.get('status', '')}".strip(" ·"),
                "payload": clean,
                "claim_kind": "CANDIDATE_DECLARED",
                "truth": "CANDIDATE_DECLARED",
                "preview_escaped": _escape_preview(json.dumps(clean, ensure_ascii=False)),
                "provenance": {"family": "tracker", "parser": "tracker_csv_v1"},
            }
        )
    if not items:
        raise ImportSecurityError("csv_empty")
    return items[:MAX_STAGING_ITEMS]


def parse_tracker_json(content: bytes) -> list[dict[str, Any]]:
    try:
        data = json.loads(content.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ImportSecurityError("json_invalid") from exc
    rows = data if isinstance(data, list) else data.get("opportunities") or data.get("items") or []
    if not isinstance(rows, list):
        raise ImportSecurityError("json_shape_invalid")
    items: list[dict[str, Any]] = []
    for i, row in enumerate(rows[:MAX_CSV_ROWS]):
        if not isinstance(row, dict):
            continue
        clean = {str(k)[:64]: str(v)[:500] for k, v in row.items() if v is not None}
        title = clean.get("title") or clean.get("job_title") or f"Opportunity {i + 1}"
        items.append(
            {
                "item_key": f"opp:{i}",
                "target_kind": "opportunity",
                "title": title[:200],
                "summary": (clean.get("company") or "")[:300],
                "payload": clean,
                "claim_kind": "CANDIDATE_DECLARED",
                "truth": "CANDIDATE_DECLARED",
                "preview_escaped": _escape_preview(json.dumps(clean, ensure_ascii=False)),
                "provenance": {"family": "tracker", "parser": "tracker_json_v1"},
            }
        )
    if not items:
        raise ImportSecurityError("json_empty")
    return items[:MAX_STAGING_ITEMS]


def parse_twin_export(content: bytes) -> list[dict[str, Any]]:
    try:
        data = json.loads(content.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ImportSecurityError("twin_export_invalid") from exc
    if not isinstance(data, dict):
        raise ImportSecurityError("twin_export_not_object")
    # Deny secrets/roles/consents/telemetry
    lowered = {str(k).lower() for k in data.keys()}
    if lowered & TWIN_RESTORE_DENY_KEYS:
        raise ImportSecurityError("twin_export_denied_keys")
    nested = json.dumps(data).lower()
    for banned in ("access_token", "refresh_token", "hashed_password", "secret_key"):
        if banned in nested:
            raise ImportSecurityError("twin_export_denied_payload")

    items: list[dict[str, Any]] = []
    evidence = data.get("career_evidence") or data.get("evidence") or []
    if isinstance(evidence, list):
        for i, ev in enumerate(evidence[:MAX_STAGING_ITEMS]):
            if not isinstance(ev, dict):
                continue
            title = str(ev.get("title") or f"Restored evidence {i + 1}")[:200]
            summary = str(ev.get("summary") or "")[:2000]
            items.append(
                {
                    "item_key": f"restore:ev:{i}",
                    "target_kind": "evidence",
                    "title": title,
                    "summary": summary,
                    "payload": {"title": title, "summary": summary, "remap": True},
                    "claim_kind": "CANDIDATE_DECLARED",
                    "truth": "CANDIDATE_DECLARED",
                    "preview_escaped": _escape_preview(summary or title),
                    "provenance": {"family": "twin_export", "parser": "twin_restore_v1"},
                }
            )
    profile = data.get("profile") or data.get("candidate") or {}
    if isinstance(profile, dict) and (profile.get("skills") or profile.get("headline")):
        skills = profile.get("skills") or []
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(",") if s.strip()]
        items.append(
            {
                "item_key": "restore:profile",
                "target_kind": "profile",
                "title": "Profile facts (restore)",
                "summary": ",".join(str(s)[:40] for s in skills[:20]),
                "payload": {
                    "skills": [str(s)[:60] for s in skills[:40]],
                    "headline": str(profile.get("headline") or "")[:200],
                },
                "claim_kind": "CANDIDATE_DECLARED",
                "truth": "CANDIDATE_DECLARED",
                "preview_escaped": _escape_preview(json.dumps(profile, ensure_ascii=False)[:1500]),
                "provenance": {"family": "twin_export", "parser": "twin_restore_v1"},
            }
        )
    if not items:
        raise ImportSecurityError("twin_export_empty_allowlist")
    return items[:MAX_STAGING_ITEMS]


def parse_linkedin_export(content: bytes, ext: str) -> list[dict[str, Any]]:
    """User-owned LinkedIn export file only — no login/scrape."""
    if ext == ".csv":
        return parse_tracker_csv(content)  # positions/jobs-like rows
    try:
        data = json.loads(content.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ImportSecurityError("linkedin_export_invalid") from exc
    # Allowlist shapes only
    if isinstance(data, dict) and "positions" in data and isinstance(data["positions"], list):
        rows = data["positions"]
    elif isinstance(data, list):
        rows = data
    else:
        raise ImportSecurityError("linkedin_export_shape")
    items: list[dict[str, Any]] = []
    for i, row in enumerate(rows[:MAX_STAGING_ITEMS]):
        if not isinstance(row, dict):
            continue
        title = str(row.get("title") or row.get("position") or f"Role {i + 1}")[:200]
        company = str(row.get("company") or row.get("organization") or "")[:200]
        summary = str(row.get("description") or row.get("summary") or "")[:2000]
        items.append(
            {
                "item_key": f"li:{i}",
                "target_kind": "evidence",
                "title": f"{title} @ {company}".strip(" @"),
                "summary": summary or company,
                "payload": {"title": title, "company": company},
                "claim_kind": "CANDIDATE_DECLARED",
                "truth": "CANDIDATE_DECLARED",
                "preview_escaped": _escape_preview(summary or title),
                "provenance": {"family": "linkedin_export", "parser": "linkedin_file_v1"},
            }
        )
    if not items:
        raise ImportSecurityError("linkedin_export_empty")
    return items


def parse_family(*, family: str, content: bytes, ext: str) -> list[dict[str, Any]]:
    if family == "document":
        return parse_document(content, ext)
    if family == "tracker":
        return parse_tracker_csv(content) if ext == ".csv" else parse_tracker_json(content)
    if family == "twin_export":
        return parse_twin_export(content)
    if family == "linkedin_export":
        return parse_linkedin_export(content, ext)
    raise ImportSecurityError("unsupported_family")
