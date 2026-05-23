"""Build readiness snapshot + phased milestones from ideal job vs current profile."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

from app.services.anthropic_client import get_anthropic_client, is_anthropic_configured
from app.services.candidate_readiness import candidate_has_cv

_PATH_PROMPT = """You design a gamified, time-bound career path for a candidate to reach their stated ideal job.

Return ONLY valid JSON:
{{
  "phases": [
    {{
      "id": "p1",
      "title": "string",
      "week_start": 1,
      "week_end": 4,
      "milestones": [
        {{"id": "p1-m1", "title": "string", "week": 2, "xp": 80, "hint": "string"}}
      ]
    }}
  ],
  "you_are_here": "string",
  "gaps_summary": ["string"],
  "strengths_aligned": ["string"],
  "readiness_score": 0
}}

Rules:
- 3–5 phases spanning the horizon in weeks (approx 4 weeks/month).
- 2–4 milestones per phase; week is 1..(horizon_months*4) roughly.
- xp per milestone 40–150; total milestones under 18.
- Use ONLY ideal + profile facts; do not invent employers.
- readiness_score: 0–100 honest estimate vs ideal.
- Same language as ideal/responsibilities (PL vs EN).

IDEAL JOB (JSON):
{ideal_json}

PROFILE SNAPSHOT:
{profile_snippet}
"""


def _level_from_xp(xp: int) -> int:
    tiers = [0, 80, 200, 400, 700, 1100, 1600, 2200, 3000]
    lv = 1
    for i, t in enumerate(tiers):
        if xp >= t:
            lv = i + 1
    return min(lv, 12)


def _norm_skill(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _skill_overlap(skills: list[str], tools: list[str]) -> tuple[list[str], list[str]]:
    sn = {_norm_skill(x) for x in skills if _norm_skill(x)}
    hit: list[str] = []
    miss: list[str] = []
    for t in tools:
        tn = _norm_skill(t)
        if not tn:
            continue
        if any(tn in s or s in tn for s in sn):
            hit.append(t.strip())
        else:
            miss.append(t.strip())
    return hit, miss


def _use_polish_copy(ideal: dict[str, Any]) -> bool:
    blob = " ".join(str(x) for x in (ideal.get("target_role_titles") or [])[:3])
    blob += " " + str(ideal.get("key_responsibilities") or "")
    return bool(re.search(r"[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]", blob))


def _compute_snapshot(ideal: dict[str, Any], profile: dict[str, Any]) -> dict[str, Any]:
    skills = [str(x) for x in (profile.get("skills") or []) if str(x).strip()]
    exp_y = int(profile.get("experience_years") or 0)
    salary = profile.get("desired_salary")
    target_sal = ideal.get("target_salary_gross_monthly_pln")
    tools = [str(x) for x in (ideal.get("must_have_tools") or []) if str(x).strip()]
    pl = _use_polish_copy(ideal)

    score = 28 + min(22, len(skills) * 2) + min(18, exp_y * 2)
    hit, miss = _skill_overlap(skills, tools)
    score += min(20, len(hit) * 7)
    strengths = hit[:12]
    gaps: list[str] = []
    for m in miss[:10]:
        gaps.append(f"Brak sygnału w profilu dla: {m}" if pl else f"No clear profile signal for: {m}")
    if isinstance(target_sal, int) and target_sal > 0:
        if salary is None:
            gaps.append(
                "Uzupełnij oczekiwane wynagrodzenie w profilu, aby porównać z celem."
                if pl
                else "Add desired salary to compare with target."
            )
            score -= 5
        elif isinstance(salary, int):
            if salary >= int(target_sal * 0.88):
                score += 8
                strengths.append(
                    "Wynagrodzenie w profilu zbliżone do celu." if pl else "Stated salary aligned with target band."
                )
            elif salary < int(target_sal * 0.55):
                gaps.append(
                    "Wynagrodzenie w profilu wyraźnie poniżej celu — przygotuj ścieżkę argumentacji."
                    if pl
                    else "Profile salary well below target — plan evidence or stepping-stone roles."
                )
                score -= 10
    score = max(5, min(100, int(score)))

    if pl:
        you = (
            f"Szacunkowo ok. {score}% drogi do zdefiniowanego celu. "
            f"{'Mocne strony: ' + '; '.join(strengths[:4]) + '. ' if strengths else ''}"
            f"{'Następny fokus: ' + gaps[0] if gaps else 'Realizuj kamienie milowe w ścieżce poniżej.'}"
        )
    else:
        you = (
            f"Roughly {score}% toward your defined target (estimate). "
            f"{'Strengths: ' + '; '.join(strengths[:4]) + '. ' if strengths else ''}"
            f"{'Next focus: ' + gaps[0] if gaps else 'Execute milestones in the path below.'}"
        )

    return {
        "readiness_score": score,
        "gaps_summary": gaps[:14],
        "strengths_aligned": strengths[:14],
        "you_are_here": you[:1200],
    }


def _recalc_xp_from_milestones(path: dict[str, Any]) -> None:
    total = 0
    for ph in path.get("phases") or []:
        if not isinstance(ph, dict):
            continue
        for m in ph.get("milestones") or []:
            if isinstance(m, dict) and m.get("done"):
                try:
                    total += int(m.get("xp") or 0)
                except (TypeError, ValueError):
                    total += 50
    path["xp_total"] = total
    path["level"] = _level_from_xp(total)


def _fallback_path(ideal: dict[str, Any], horizon_months: int, snapshot: dict[str, Any]) -> dict[str, Any]:
    wmax = max(8, horizon_months * 4)
    chunk = max(2, wmax // 4)
    phases: list[dict[str, Any]] = []
    titles = ideal.get("target_role_titles") or ["Target role"]
    head = str(titles[0])[:80] if titles else "Target role"
    pl = _use_polish_copy(ideal)
    if pl:
        templates = [
            (
                "Fundamenty profilu",
                [
                    ("CV + dowody pod narzędzia z listy must-have", 60),
                    ("Profil / LinkedIn spójny z rolą: " + head, 50),
                ],
            ),
            (
                "Widoczność i rozmowy",
                [
                    ("Celowane aplikacje + zapis feedbacku rekrutacyjnego", 70),
                    ("Mock: case + behavioral pod tę rolę", 80),
                ],
            ),
            (
                "Głębia merytoryczna",
                [
                    ("Mini-projekt lub certyfikat z jednego narzędzia z listy", 90),
                    ("Historie z metrykami (zakres, wpływ)", 65),
                ],
            ),
            (
                "Domknięcie pod cel",
                [
                    ("Benchmark wynagrodzenia vs cel", 55),
                    ("Format pracy vs preferencje (remote/hybrid/onsite)", 45),
                ],
            ),
        ]
    else:
        templates = [
            (
                "Profile foundations",
                [
                    ("CV + proof points for must-have tools", 60),
                    ("Align public profile with role: " + head, 50),
                ],
            ),
            (
                "Visibility & interviews",
                [
                    ("Targeted applications + capture recruiter feedback", 70),
                    ("Mock interviews: case + behavioral for this role", 80),
                ],
            ),
            (
                "Depth",
                [
                    ("Mini-project or cert on one must-have tool", 90),
                    ("Metric-heavy impact stories", 65),
                ],
            ),
            (
                "Close the gap",
                [
                    ("Comp benchmarking vs salary target", 55),
                    ("Work format vs stated preferences", 45),
                ],
            ),
        ]
    week_cursor = 1
    for pi, (ptitle, ms) in enumerate(templates):
        w0 = week_cursor
        w1 = min(wmax, week_cursor + chunk - 1)
        milestones = []
        for mi, (mtitle, xp) in enumerate(ms):
            milestones.append(
                {
                    "id": f"p{pi}-m{mi}",
                    "title": mtitle[:200],
                    "week": min(wmax, w0 + mi * 2),
                    "xp": xp,
                    "done": False,
                    "hint": ("Zaznacz po wykonaniu — XP i poziom rosną." if pl else "Check when done — earn XP and level up.")[
                        :200
                    ],
                }
            )
        phases.append({"id": f"p{pi}", "title": ptitle, "week_start": w0, "week_end": w1, "milestones": milestones})
        week_cursor = w1 + 1
        if week_cursor > wmax:
            break
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "fallback",
        "horizon_months": horizon_months,
        "current_phase_index": 0,
        "phases": phases,
    }


def _path_with_claude(ideal: dict[str, Any], profile: dict[str, Any], horizon: int, snapshot: dict[str, Any]) -> dict[str, Any] | None:
    client = get_anthropic_client()
    if not client:
        return None
    ideal_s = json.dumps(ideal, ensure_ascii=False)[:8000]
    prof_s = json.dumps(profile, ensure_ascii=False)[:6000]
    prompt = _PATH_PROMPT.format(ideal_json=ideal_s, profile_snippet=prof_s)
    try:
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text if msg.content else ""
        a = raw.find("{")
        b = raw.rfind("}")
        if a < 0 or b <= a:
            return None
        data = json.loads(raw[a : b + 1])
        if not isinstance(data, dict):
            return None
        phases_raw = data.get("phases")
        if not isinstance(phases_raw, list) or not phases_raw:
            return None
        phases: list[dict[str, Any]] = []
        for pi, ph in enumerate(phases_raw[:6]):
            if not isinstance(ph, dict):
                continue
            pid = str(ph.get("id") or f"p{pi}")[:32]
            milestones = []
            for mi, m in enumerate((ph.get("milestones") or [])[:6]):
                if not isinstance(m, dict):
                    continue
                mid = str(m.get("id") or f"{pid}-m{mi}")[:48]
                milestones.append(
                    {
                        "id": mid,
                        "title": str(m.get("title") or "Milestone")[:220],
                        "week": int(m.get("week") or 1),
                        "xp": max(30, min(200, int(m.get("xp") or 70))),
                        "done": False,
                        "hint": str(m.get("hint") or "")[:400],
                    }
                )
            if not milestones:
                continue
            phases.append(
                {
                    "id": pid,
                    "title": str(ph.get("title") or f"Phase {pi + 1}")[:120],
                    "week_start": int(ph.get("week_start") or 1),
                    "week_end": int(ph.get("week_end") or horizon * 4),
                    "milestones": milestones,
                }
            )
        if not phases:
            return None
        rs = data.get("readiness_score")
        try:
            rss = max(0, min(100, int(rs)))
        except (TypeError, ValueError):
            rss = int(snapshot.get("readiness_score") or 40)
        snap = {
            "readiness_score": rss,
            "gaps_summary": [str(x) for x in (data.get("gaps_summary") or []) if str(x).strip()][:14],
            "strengths_aligned": [str(x) for x in (data.get("strengths_aligned") or []) if str(x).strip()][:14],
            "you_are_here": str(data.get("you_are_here") or snapshot.get("you_are_here") or "")[:1200],
        }
        return {"phases_data": phases, "snapshot_override": snap, "source": "claude"}
    except Exception:
        return None


def ideal_dict_from_pydantic(ideal: Any) -> dict[str, Any]:
    data = ideal.model_dump()
    titles = []
    for t in data.get("target_role_titles") or []:
        s = str(t).strip()[:120]
        if s and s not in titles:
            titles.append(s)
        if len(titles) >= 15:
            break
    tools = []
    for t in data.get("must_have_tools") or []:
        s = str(t).strip()[:80]
        if s and s.lower() not in {x.lower() for x in tools}:
            tools.append(s)
        if len(tools) >= 40:
            break
    ind = []
    for t in data.get("industries") or []:
        s = str(t).strip()[:80]
        if s and s not in ind:
            ind.append(s)
        if len(ind) >= 20:
            break
    wf = []
    for w in data.get("work_formats") or []:
        s = str(w).strip().lower()[:32]
        if s and s not in wf:
            wf.append(s)
    return {
        "target_role_titles": titles,
        "target_salary_gross_monthly_pln": data.get("target_salary_gross_monthly_pln"),
        "work_formats": wf,
        "must_have_tools": tools,
        "key_responsibilities": (data.get("key_responsibilities") or "").strip()[:4000],
        "industries": ind,
        "location_preferences": (data.get("location_preferences") or "").strip()[:300] or None,
        "target_horizon_months": int(data.get("target_horizon_months") or 12),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def build_career_compass(
    ideal: dict[str, Any],
    profile: dict[str, Any],
    *,
    prev: dict[str, Any] | None,
    regenerate_path: bool,
) -> dict[str, Any]:
    """Full career_compass blob for profile_signals_json."""
    horizon = max(1, min(60, int(ideal.get("target_horizon_months") or 12)))
    snapshot = _compute_snapshot(ideal, profile)
    prev_path = prev.get("path") if isinstance(prev, dict) and isinstance(prev.get("path"), dict) else None

    if not regenerate_path and prev_path:
        return {"ideal": ideal, "path": prev_path, "snapshot": snapshot}

    xp_seed = 0
    if prev_path and isinstance(prev_path, dict):
        try:
            xp_seed = max(0, int(prev_path.get("xp_total") or 0))
        except (TypeError, ValueError):
            xp_seed = 0

    path: dict[str, Any]
    ai = _path_with_claude(ideal, profile, horizon, snapshot)
    if ai and ai.get("phases_data"):
        path = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": ai.get("source") or "claude",
            "horizon_months": horizon,
            "current_phase_index": 0,
            "phases": ai["phases_data"],
            "xp_total": 0,
            "level": 1,
        }
        so = ai.get("snapshot_override")
        if isinstance(so, dict):
            snapshot = {**snapshot, **so}
    else:
        path = _fallback_path(ideal, horizon, snapshot)
    _sync_milestone_done_from_prev(path, prev_path)
    _recalc_xp_from_milestones(path)
    # carry over XP from previous completions that no longer exist as milestones
    try:
        prev_xp = int(prev_path.get("xp_total") or 0) if prev_path else 0
    except (TypeError, ValueError):
        prev_xp = 0
    cur_xp = int(path.get("xp_total") or 0)
    if prev_xp > cur_xp:
        path["xp_total"] = prev_xp
    path["level"] = _level_from_xp(int(path.get("xp_total") or 0))
    return {"ideal": ideal, "snapshot": snapshot, "path": path}


def _sync_milestone_done_from_prev(new_path: dict[str, Any], prev: dict[str, Any] | None) -> None:
    if not prev or not isinstance(prev, dict):
        return
    done_ids: set[str] = set()
    for ph in prev.get("phases") or []:
        if not isinstance(ph, dict):
            continue
        for m in ph.get("milestones") or []:
            if isinstance(m, dict) and m.get("done") and m.get("id"):
                done_ids.add(str(m["id"]))
    if not done_ids:
        return
    for ph in new_path.get("phases") or []:
        if not isinstance(ph, dict):
            continue
        for m in ph.get("milestones") or []:
            if isinstance(m, dict) and str(m.get("id")) in done_ids:
                m["done"] = True


def find_milestone(compass: dict[str, Any], milestone_id: str) -> tuple[int, int] | None:
    path = compass.get("path")
    if not isinstance(path, dict):
        return None
    for pi, ph in enumerate(path.get("phases") or []):
        if not isinstance(ph, dict):
            continue
        for mi, m in enumerate(ph.get("milestones") or []):
            if isinstance(m, dict) and str(m.get("id")) == milestone_id:
                return pi, mi
    return None


def set_milestone_done(compass: dict[str, Any], milestone_id: str, done: bool) -> tuple[dict[str, Any], str | None]:
    """Update milestone; recalc xp_total from all done flags."""
    loc = find_milestone(compass, milestone_id)
    if not loc:
        return compass, "Milestone not found"
    pi, mi = loc
    path = compass["path"]
    assert isinstance(path, dict)
    phases = path.get("phases")
    if not isinstance(phases, list):
        return compass, "Invalid path"
    ph = phases[pi]
    ms = ph.get("milestones")
    if not isinstance(ms, list):
        return compass, "Invalid milestones"
    m = ms[mi]
    if not isinstance(m, dict):
        return compass, "Invalid milestone"
    if bool(m.get("done")) == done:
        return compass, None
    m["done"] = done
    _recalc_xp_from_milestones(path)
    cpi = 0
    for idx, ph2 in enumerate(phases):
        if not isinstance(ph2, dict):
            continue
        msl = ph2.get("milestones") or []
        if any(isinstance(x, dict) and not x.get("done") for x in msl):
            cpi = idx
            break
        cpi = idx
    path["current_phase_index"] = min(cpi, len(phases) - 1)
    return compass, None


def next_open_milestone_title(compass: dict[str, Any]) -> str | None:
    path = compass.get("path")
    if not isinstance(path, dict):
        return None
    for ph in path.get("phases") or []:
        if not isinstance(ph, dict):
            continue
        for m in ph.get("milestones") or []:
            if isinstance(m, dict) and not m.get("done"):
                t = str(m.get("title") or "").strip()
                return t[:200] if t else None
    return None


def get_career_compass_blob(signals: dict[str, Any]) -> dict[str, Any] | None:
    raw = signals.get("career_compass")
    return raw if isinstance(raw, dict) else None


def candidate_profile_dict(candidate: Any, skills: list[str], titles: list[str]) -> dict[str, Any]:
    ins = None
    if candidate.profile_signals_json:
        try:
            b = json.loads(candidate.profile_signals_json)
            if isinstance(b, dict):
                ins = b.get("cv_insights") if isinstance(b.get("cv_insights"), dict) else None
        except json.JSONDecodeError:
            pass
    return {
        "skills": skills,
        "preferred_job_titles": titles,
        "experience_years": candidate.experience_years,
        "desired_salary": candidate.desired_salary,
        "location": candidate.location,
        "has_cv": candidate_has_cv(candidate),
        "cv_insights": ins,
    }
