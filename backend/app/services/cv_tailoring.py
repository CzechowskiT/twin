"""Generate role-specific CV pitch for application forms (Claude or deterministic fallback)."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

from app.config import get_settings
from app.services.anthropic_client import get_anthropic_client, is_anthropic_configured
from app.services.request_locale import is_polish_locale, normalize_locale

_TAILOR_PROMPT = """You tailor a candidate's CV content to a specific target job for use in application "motivation / cover letter" text fields and recruiter skim.

Return ONLY valid JSON with this exact shape:
{{
  "pitch_paragraph": "string",
  "strength_bullets": ["string", "string"],
  "keywords": ["string", "string"]
}}

Rules:
- Write ALL output in {output_language}. Do not mix languages.
- Use ONLY facts supported by the CV text; do not invent employers, degrees, dates, or tools.
- Never claim certifications, job titles, employers, or degrees that are not clearly supported by the CV text.
- pitch_paragraph: 3–6 sentences, max ~1200 characters, focused on fit for the target role.
- strength_bullets: 4–6 bullets, each max 220 characters, concrete achievements or responsibilities.
- keywords: 6–14 short phrases (skills/tools/domains) to echo the job — only if they appear in the CV or are obvious synonyms of CV content.

TARGET ROLE TITLE:
{title}

COMPANY (if known, else null):
{company}

JOB POSTING CONTEXT (may be truncated):
{job_ctx}

CV TEXT:
{cv_snippet}
"""


def _output_language_label(locale: str) -> str:
    return "Polish" if is_polish_locale(locale) else "English"


def _fallback_tailoring(cv_text: str, target_title: str, *, locale: str = "en") -> dict[str, Any]:
    pl = is_polish_locale(locale)
    snippet = re.sub(r"\s+", " ", (cv_text or "").strip())[:900]
    title = (target_title or ("wybrana rola" if pl else "selected role")).strip()[:200]
    bullets: list[str] = []
    for line in (cv_text or "").splitlines():
        s = line.strip()
        if 12 < len(s) < 200 and ("•" in s or s[:1].isdigit() or ":" in s[:6]):
            bullets.append(s.lstrip("•-0123456789.) ").strip()[:220])
        if len(bullets) >= 5:
            break
    if len(bullets) < 3:
        if pl:
            bullets = [
                f"Doświadczenie zawodowe opisane w CV — dopasowanie do roli: {title}.",
                "Szczegóły realizacji projektów i narzędzi — w załączonym CV.",
                "Gotowość do omówienia zakresu obowiązków na rozmowie.",
            ]
        else:
            bullets = [
                f"Professional experience in my CV — aligned with the role: {title}.",
                "Project delivery and tools — see the attached CV for detail.",
                "Happy to discuss scope and expectations in an interview.",
            ]
    if pl:
        pitch = (
            f"Chcę aplikować na stanowisko: {title}. "
            f"Poniżej skrót moich kompetencji z CV; pełna dokumentacja w załączniku. "
            f"Fragment profilu: {snippet[:400]}…"
            if snippet
            else f"Aplikuję na {title}. Szczegóły doświadczenia przekazuję w załączonym CV."
        )
    else:
        pitch = (
            f"I am applying for the role of {title}. "
            f"Below is a concise summary of my skills from my CV; the full document is attached. "
            f"Profile excerpt: {snippet[:400]}…"
            if snippet
            else f"I am applying for {title}. Full experience details are in my attached CV."
        )
    words = [w.strip(".,;:") for w in re.findall(r"\w{4,}", (cv_text or "").lower())]
    freq: dict[str, int] = {}
    for w in words:
        if len(w) < 4:
            continue
        freq[w] = freq.get(w, 0) + 1
    keywords = [k for k, _ in sorted(freq.items(), key=lambda x: -x[1])[:12]]
    return {
        "pitch_paragraph": pitch[:1200],
        "strength_bullets": bullets[:6],
        "keywords": keywords,
    }


def _tailor_with_claude(
    cv_text: str,
    *,
    target_job_title: str,
    company: str | None,
    job_context: str | None,
    locale: str = "en",
) -> dict[str, Any] | None:
    client = get_anthropic_client()
    if not client:
        return None
    snippet = cv_text[:14_000]
    title = target_job_title.strip()[:200]
    comp = (company or "").strip()[:200] or "null"
    pl = is_polish_locale(locale)
    ctx = (job_context or "").strip()[:8000] or (
        "(brak treści oferty — tylko tytuł roli)" if pl else "(no job posting text — role title only)"
    )
    prompt = _TAILOR_PROMPT.format(
        output_language=_output_language_label(locale),
        title=title,
        company=comp,
        job_ctx=ctx,
        cv_snippet=snippet,
    )
    try:
        msg = client.messages.create(
            model=get_settings().anthropic_model,
            max_tokens=2200,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text if msg.content else ""
        start = raw.find("{")
        end = raw.rfind("}")
        if start < 0 or end <= start:
            return None
        data = json.loads(raw[start : end + 1])
        if not isinstance(data, dict):
            return None
        pitch = str(data.get("pitch_paragraph") or "").strip()[:1200]
        bullets_raw = data.get("strength_bullets")
        bullets: list[str] = []
        if isinstance(bullets_raw, list):
            for b in bullets_raw:
                s = str(b).strip()[:220]
                if s:
                    bullets.append(s)
        bullets = bullets[:8]
        kw_raw = data.get("keywords")
        keywords: list[str] = []
        if isinstance(kw_raw, list):
            for k in kw_raw:
                s = str(k).strip()[:60]
                if s:
                    keywords.append(s)
        keywords = keywords[:16]
        if not pitch or len(bullets) < 2:
            return None
        return {"pitch_paragraph": pitch, "strength_bullets": bullets, "keywords": keywords}
    except Exception:
        return None


def build_cv_tailoring_blob(
    cv_text: str | None,
    *,
    target_job_title: str,
    job_id: int | None,
    company: str | None,
    job_context: str | None,
    locale: str = "en",
) -> dict[str, Any]:
    """Produce cv_tailoring dict to merge into profile_signals_json."""
    loc = normalize_locale(locale)
    text = (cv_text or "").strip()
    if not text:
        raise ValueError("CV text is empty — upload a CV first.")
    title = target_job_title.strip()
    if not title:
        raise ValueError("Target job title is required.")

    source = "fallback"
    body: dict[str, Any]
    if is_anthropic_configured():
        ai = _tailor_with_claude(
            text,
            target_job_title=title,
            company=company,
            job_context=job_context,
            locale=loc,
        )
        if ai:
            body = ai
            source = "claude"
        else:
            body = _fallback_tailoring(text, title, locale=loc)
    else:
        body = _fallback_tailoring(text, title, locale=loc)

    now = datetime.now(timezone.utc).isoformat()
    out: dict[str, Any] = {
        "target_job_title": title[:200],
        "job_id": job_id,
        "company": (company or None),
        "pitch_paragraph": body["pitch_paragraph"],
        "strength_bullets": body["strength_bullets"],
        "keywords": body.get("keywords") or [],
        "updated_at": now,
        "source": source,
        "locale": loc,
    }
    return out


def get_tailoring_pitch_for_job(signals: dict[str, Any] | None, apply_job_id: int) -> str | None:
    """Build text for motivation/cover fields when tailoring matches this application."""
    if not signals:
        return None
    t = signals.get("cv_tailoring")
    if not isinstance(t, dict):
        return None
    jid = t.get("job_id")
    if jid is not None:
        try:
            if int(jid) != int(apply_job_id):
                return None
        except (TypeError, ValueError):
            return None
    loc = str(t.get("locale") or "en")
    return _pitch_from_tailoring_dict(t, locale=loc) or None


def _pitch_from_tailoring_dict(body: dict[str, Any], *, locale: str = "en") -> str:
    parts: list[str] = []
    p = body.get("pitch_paragraph")
    if isinstance(p, str) and p.strip():
        parts.append(p.strip())
    bullets = body.get("strength_bullets")
    if isinstance(bullets, list):
        lines = [f"• {str(b).strip()}" for b in bullets if str(b).strip()][:8]
        if lines:
            parts.append("\n".join(lines))
    kw = body.get("keywords")
    if isinstance(kw, list):
        flat = [str(x).strip() for x in kw if str(x).strip()][:16]
        if flat:
            label = "Słowa kluczowe" if is_polish_locale(locale) else "Keywords"
            parts.append(f"{label}: " + ", ".join(flat))
    out = "\n\n".join(parts).strip()
    return out[:8000]


def build_motivation_text_for_auto_apply(
    cv_text: str,
    *,
    job_title: str,
    company: str | None,
    job_context: str | None,
    locale: str = "en",
) -> str:
    """Fresh pitch for each auto-apply from CV text + job listing (Claude or deterministic fallback)."""
    loc = normalize_locale(locale)
    text = (cv_text or "").strip()
    if not text:
        return ""
    default_title = "wybrana rola" if is_polish_locale(loc) else "selected role"
    title = (job_title or "").strip()[:200] or default_title
    comp = (company or "").strip()[:200] or None
    ctx = (job_context or "").strip()[:8000] or None
    if is_anthropic_configured():
        ai = _tailor_with_claude(text, target_job_title=title, company=comp, job_context=ctx, locale=loc)
        if ai:
            return _pitch_from_tailoring_dict(ai, locale=loc)
    fb = _fallback_tailoring(text, title, locale=loc)
    return _pitch_from_tailoring_dict(fb, locale=loc)
