"""Epic 2.26 M2 — interview practice exercise catalog (v2 tracks).

3 tracks × 2 exercises = 6 items (one objective + one open-rubric per track).

Tracks (v2):
  - software_backend  — backend engineering depth
  - business_data     — product / data problem-solving
  - customer_b2b      — customer-facing & stakeholder work

Legacy v1 family IDs (behavioral_star, role_problem, clarifying_questions) are
kept as _ALIASES pointing to canonical v2 exercises so historical session
exercise_id values continue to resolve via get_exercise().

EN + PL locale-aware content.
Original content — not copied from copyrighted question banks.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.services.candidate_interview_practice_constants import (
    EXERCISE_CATALOG_SCHEMA_ID,
)


@dataclass(frozen=True)
class Exercise:
    """Immutable exercise definition with bilingual content."""

    id: str
    family: str  # software_backend | business_data | customer_b2b | legacy_*
    difficulty: str  # easy | medium | hard
    criteria_ids: tuple[str, ...]
    title_en: str
    title_pl: str
    prompt_en: str
    prompt_pl: str
    exercise_type: str = "open_rubric"  # objective | open_rubric
    version: int = 2
    # Deterministic checker for objective exercises only.
    # required_groups: each group is OR of keywords; all groups must match for correct.
    # forbidden_any: if present → wrong.
    objective_rules: dict[str, object] | None = None

    def to_dict(self, locale: str = "en") -> dict[str, Any]:
        pl = locale.startswith("pl")
        return {
            "id": self.id,
            "family": self.family,
            "difficulty": self.difficulty,
            "criteria_ids": list(self.criteria_ids),
            "title": self.title_pl if pl else self.title_en,
            "prompt": self.prompt_pl if pl else self.prompt_en,
            "title_en": self.title_en,
            "title_pl": self.title_pl,
            "exercise_type": self.exercise_type,
            "version": self.version,
            "has_objective_rules": bool(self.objective_rules),
            "limitations_en": (
                "Deterministic keyword/concept check against supplied answer rules — "
                "not psychometric validation."
                if self.exercise_type == "objective"
                else "Open rubric; alternative valid approaches accepted."
            ),
            "estimated_minutes": 15 if self.exercise_type == "objective" else 20,
        }



_CATALOG: tuple[Exercise, ...] = (
    # ── Track 1: software_backend ─────────────────────────────────────────────

    Exercise(
        id="sw_backend_objective_1",
        family="software_backend",
        difficulty="hard",
        exercise_type="objective",
        version=2,
        criteria_ids=("relevance", "structure", "outcome_clarity"),
        title_en="Debug a production latency spike",
        title_pl="Debuguj wzrost opóźnień w produkcji",
        prompt_en=(
            "Your team's API p95 latency jumped from 80 ms to 600 ms after a deploy. "
            "Error rate is unchanged. Walk through your step-by-step investigation: "
            "what tooling do you open first, what hypotheses do you form, "
            "how do you isolate whether it is the database, network, or application layer, "
            "and what rollback/mitigation would you trigger before root-cause is confirmed? "
            "Be specific: name the commands or dashboards you would use."
        ),
        prompt_pl=(
            "P95 opóźnień Twojego API wzrosło z 80 ms do 600 ms po deploymencie. "
            "Współczynnik błędów pozostał bez zmian. Opisz krok po kroku swoje dochodzenie: "
            "jakie narzędzia otwierasz najpierw, jakie hipotezy stawiasz, "
            "jak izolujesz czy to baza danych, sieć, czy warstwa aplikacji, "
            "i jakie rollback/mitygację uruchamiasz przed potwierdzeniem przyczyny. "
            "Bądź konkretny: podaj nazwy komend lub dashboardów."
        ),
        objective_rules={
            "required_groups": [
                ["latency", "p95", "apm", "opóźnień", "metryk"],
                ["database", "db", "sql", "redis", "network", "sieć", "aplikac"],
                ["rollback", "feature flag", "mitigat", "cofnąć", "mityg"],
            ],
            "forbidden_any": ["rewrite overnight", "10000x", "hire more engineers first"],
        },
    ),

    Exercise(
        id="sw_backend_rubric_1",
        family="software_backend",
        difficulty="medium",
        exercise_type="open_rubric",
        version=2,
        criteria_ids=("relevance", "evidence_use", "structure", "outcome_clarity"),
        title_en="Design a rate-limiting service",
        title_pl="Zaprojektuj serwis rate-limiting",
        prompt_en=(
            "Design a distributed rate-limiting service that handles 50 000 req/s "
            "across 10 backend instances with sub-5 ms overhead per request. "
            "Cover: algorithm choice (token bucket / sliding window / leaky bucket — justify), "
            "where state lives (Redis, in-memory, or hybrid — justify), "
            "how you handle clock skew between nodes, "
            "and what your failure mode is if the rate-limit store becomes unavailable. "
            "Identify the trade-off you consider most important."
        ),
        prompt_pl=(
            "Zaprojektuj rozproszony serwis rate-limiting obsługujący 50 000 żądań/s "
            "na 10 instancjach backendowych z narzutem poniżej 5 ms na żądanie. "
            "Omów: wybór algorytmu (token bucket / sliding window / leaky bucket — uzasadnij), "
            "gdzie trzymasz stan (Redis, pamięć lokalna, hybrid — uzasadnij), "
            "jak radzisz sobie z clock skew między węzłami, "
            "i jaki jest Twój tryb awarii, gdy sklep rate-limit staje się niedostępny. "
            "Wskaż trade-off, który uważasz za najważniejszy."
        ),
    ),

    # ── Track 2: business_data ─────────────────────────────────────────────────

    Exercise(
        id="biz_data_objective_1",
        family="business_data",
        difficulty="hard",
        exercise_type="objective",
        version=2,
        criteria_ids=("relevance", "structure", "outcome_clarity"),
        title_en="Diagnose a sudden drop in user retention",
        title_pl="Zdiagnozuj nagły spadek retencji użytkowników",
        prompt_en=(
            "Your product's 30-day retention dropped from 45% to 28% in two weeks. "
            "You have access to event logs, support tickets, and can run one A/B test. "
            "Walk through your diagnostic approach step by step: "
            "what hypotheses would you form, what data would you pull first, "
            "how would you rule out instrumentation error, "
            "and what would a minimum viable fix look like? "
            "State explicitly: what would you NOT investigate first and why."
        ),
        prompt_pl=(
            "Retencja 30-dniowa Twojego produktu spadła z 45% do 28% w ciągu dwóch tygodni. "
            "Masz dostęp do logów zdarzeń, zgłoszeń supportu i możesz przeprowadzić jeden test A/B. "
            "Opisz krok po kroku swoje podejście diagnostyczne: "
            "jakie hipotezy stawiasz, jakie dane sprawdzasz najpierw, "
            "jak wykluczasz błąd instrumentacji i jak wygląda minimalne naprawienie. "
            "Powiedz wprost: czego NIE badasz najpierw i dlaczego."
        ),
        objective_rules={
            "required_groups": [
                ["retention", "retenc"],
                ["instrument", "event log", "analytics", "log", "ticket", "support"],
                ["hypothes", "hipotez", "a/b", "ab test", "cohort", "kohort"],
            ],
            "forbidden_any": ["ignore the data", "guess randomly"],
        },
    ),

    Exercise(
        id="biz_data_rubric_1",
        family="business_data",
        difficulty="medium",
        exercise_type="open_rubric",
        version=2,
        criteria_ids=("relevance", "structure", "outcome_clarity"),
        title_en="Prioritize a backlog with competing demands",
        title_pl="Spriorytetyzuj backlog z konkurującymi wymaganiami",
        prompt_en=(
            "You have inherited a product backlog with 40 items. "
            "Three different stakeholders each claim their epic is top priority. "
            "Engineering capacity is fixed at 6 developers for the next quarter. "
            "Explain your prioritization framework, "
            "how you would handle stakeholder alignment, "
            "what trade-offs you would communicate explicitly, "
            "and how you would measure whether the chosen order was correct in retrospect."
        ),
        prompt_pl=(
            "Przejąłeś backlog produktu z 40 pozycjami. "
            "Trzech różnych interesariuszy twierdzi, że ich epic ma najwyższy priorytet. "
            "Pojemność inżynieryjna to 6 deweloperów na kolejny kwartał. "
            "Wyjaśnij swój framework priorytyzacji, "
            "jak zarządzasz alignmentem interesariuszy, "
            "jakie trade-offy komunikujesz wprost "
            "i jak mierzysz czy wybrany porządek był słuszny z perspektywy czasu."
        ),
    ),

    # ── Track 3: customer_b2b ──────────────────────────────────────────────────

    Exercise(
        id="cust_b2b_objective_1",
        family="customer_b2b",
        difficulty="medium",
        exercise_type="objective",
        version=2,
        criteria_ids=("relevance", "evidence_use", "outcome_clarity"),
        title_en="Handle a security objection from a procurement team",
        title_pl="Odpowiedz na zastrzeżenie bezpieczeństwa zespołu procurement",
        prompt_en=(
            "A B2B procurement lead at a prospective enterprise customer says: "
            "'We cannot sign because your SOC 2 Type II audit was completed 14 months ago — "
            "our policy requires a report less than 12 months old.' "
            "Your company's next audit completes in 8 weeks. "
            "Walk through exactly what you would say and do: "
            "how you respond in the meeting, what you offer as interim assurance, "
            "how you escalate internally, and how you structure the follow-up email. "
            "State which commitments you would NOT make and why."
        ),
        prompt_pl=(
            "Lead procurement u potencjalnego klienta enterprise mówi: "
            "'Nie możemy podpisać umowy, bo Wasz audyt SOC 2 Type II był 14 miesięcy temu — "
            "nasza polityka wymaga raportu sprzed mniej niż 12 miesięcy.' "
            "Kolejny audyt Twojej firmy kończy się za 8 tygodni. "
            "Opisz dokładnie co powiesz i zrobisz: "
            "jak odpowiadasz na spotkaniu, co oferujesz jako tymczasowe zapewnienie, "
            "jak eskalujesz wewnętrznie i jak piszesz follow-up email. "
            "Powiedz, jakich zobowiązań NIE złożysz i dlaczego."
        ),
        objective_rules={
            "required_groups": [
                ["soc 2", "soc2", "audit", "audyt"],
                ["interim", "bridge", "letter", "assurance", "tymczas", "zapewn"],
                ["escalat", "eskal", "follow-up", "email", "nie złoż", "would not"],
            ],
            "forbidden_any": ["fake the report", "backdate the audit"],
        },
    ),

    Exercise(
        id="cust_b2b_rubric_1",
        family="customer_b2b",
        difficulty="hard",
        exercise_type="open_rubric",
        version=2,
        criteria_ids=("relevance", "evidence_use", "structure", "outcome_clarity"),
        title_en="Rescue a churning enterprise account",
        title_pl="Uratuj odpływający account enterprise",
        prompt_en=(
            "A 200-seat enterprise account has halved its active users in 60 days. "
            "Their renewal is in 90 days. The economic buyer stopped returning your calls. "
            "Describe your account recovery playbook: "
            "how you diagnose the root cause (usage drop vs relationship breakdown vs competitor), "
            "who you engage and in what order, "
            "what a 30/60/90-day action plan looks like, "
            "and what you would consider a successful recovery vs an acceptable churn. "
            "Be explicit about the escalation you would trigger and when."
        ),
        prompt_pl=(
            "Account enterprise z 200 miejscami zmniejszył liczbę aktywnych użytkowników o połowę "
            "w 60 dniach. Odnowienie jest za 90 dni. Kupujący ekonomiczny przestał odbierać telefony. "
            "Opisz swój playbook odbudowy konta: "
            "jak diagnozujesz przyczynę (spadek użycia vs relacje vs konkurent), "
            "kogo angażujesz i w jakiej kolejności, "
            "jak wygląda plan działania 30/60/90 dni, "
            "i co uznasz za skuteczną odbudowę vs akceptowalny churn. "
            "Powiedz wprost jaką eskalację uruchomisz i kiedy."
        ),
    ),
)

# Fast lookup by canonical id
_BY_ID: dict[str, Exercise] = {ex.id: ex for ex in _CATALOG}

# ── Legacy v1 exercises (preserve historical meaning — do NOT remap to unrelated v2) ──
_LEGACY_V1: tuple[Exercise, ...] = (
    Exercise(
        id="behavioral_star_1",
        family="behavioral_star",
        difficulty="medium",
        exercise_type="open_rubric",
        version=1,
        criteria_ids=("relevance", "evidence_use", "structure", "outcome_clarity"),
        title_en="STAR story — conflict at work",
        title_pl="Historia STAR — konflikt w pracy",
        prompt_en=(
            "Tell me about a time you resolved a conflict with a colleague. "
            "Use Situation, Task, Action, Result. Do not invent employers or figures."
        ),
        prompt_pl=(
            "Opowiedz o sytuacji, w której rozwiązałeś konflikt ze współpracownikiem. "
            "Użyj schematu Sytuacja, Zadanie, Działanie, Rezultat."
        ),
    ),
    Exercise(
        id="behavioral_star_2",
        family="behavioral_star",
        difficulty="medium",
        exercise_type="open_rubric",
        version=1,
        criteria_ids=("relevance", "evidence_use", "structure", "outcome_clarity"),
        title_en="STAR story — delivering under pressure",
        title_pl="Historia STAR — dostarczenie pod presją",
        prompt_en="Describe a time you delivered an important outcome under time pressure.",
        prompt_pl="Opisz sytuację, w której dostarczyłeś ważny rezultat pod presją czasu.",
    ),
    Exercise(
        id="role_problem_1",
        family="role_problem",
        difficulty="medium",
        exercise_type="open_rubric",
        version=1,
        criteria_ids=("relevance", "structure", "outcome_clarity"),
        title_en="Role problem — ambiguous requirements",
        title_pl="Problem roli — niejasne wymagania",
        prompt_en="How do you approach a project when requirements are incomplete or conflicting?",
        prompt_pl="Jak podchodzisz do projektu, gdy wymagania są niekompletne lub sprzeczne?",
    ),
    Exercise(
        id="role_problem_2",
        family="role_problem",
        difficulty="medium",
        exercise_type="open_rubric",
        version=1,
        criteria_ids=("relevance", "structure", "outcome_clarity"),
        title_en="Role problem — prioritizing work",
        title_pl="Problem roli — priorytetyzacja",
        prompt_en="How do you prioritize competing tasks when everything is marked urgent?",
        prompt_pl="Jak priorytetyzujesz konkurujące zadania, gdy wszystko jest oznaczone jako pilne?",
    ),
    Exercise(
        id="clarifying_1",
        family="clarifying_questions",
        difficulty="easy",
        exercise_type="open_rubric",
        version=1,
        criteria_ids=("relevance", "structure"),
        title_en="Clarifying questions — vague brief",
        title_pl="Pytania wyjaśniające — niejasny brief",
        prompt_en="You receive a vague project brief. List the clarifying questions you would ask first.",
        prompt_pl="Dostajesz niejasny brief projektu. Wymień pytania wyjaśniające, które zadasz najpierw.",
    ),
    Exercise(
        id="clarifying_2",
        family="clarifying_questions",
        difficulty="easy",
        exercise_type="open_rubric",
        version=1,
        criteria_ids=("relevance", "structure"),
        title_en="Clarifying questions — stakeholder ask",
        title_pl="Pytania wyjaśniające — prośba interesariusza",
        prompt_en="A stakeholder asks for 'something better.' What clarifying questions do you ask?",
        prompt_pl="Interesariusz prosi o 'coś lepszego'. Jakie pytania wyjaśniające zadajesz?",
    ),
)

for _lex in _LEGACY_V1:
    _BY_ID[_lex.id] = _lex

# Verbose v2 convenience aliases only (same exercise, same meaning)
_ALIASES: dict[str, Exercise] = {
    "software_backend_1": _BY_ID["sw_backend_objective_1"],
    "software_backend_2": _BY_ID["sw_backend_rubric_1"],
    "business_data_1": _BY_ID["biz_data_objective_1"],
    "business_data_2": _BY_ID["biz_data_rubric_1"],
    "customer_b2b_1": _BY_ID["cust_b2b_objective_1"],
    "customer_b2b_2": _BY_ID["cust_b2b_rubric_1"],
}


def evaluate_objective_answer(exercise: Exercise, answer: str) -> dict[str, Any] | None:
    """Deterministic objective check against explicit answer rules.

    Returns None when the exercise is not objective or has no rules.
    Does not invent semantic judgments beyond rule matches.
    """
    if exercise.exercise_type != "objective" or not exercise.objective_rules:
        return None
    text = (answer or "").strip().lower()
    rules = exercise.objective_rules
    forbidden = [str(x).lower() for x in (rules.get("forbidden_any") or [])]
    for bad in forbidden:
        if bad and bad in text:
            return {
                "evaluation_status": "COMPLETE",
                "objective_result": "incorrect",
                "score": None,
                "score_available": False,
                "source": "OBJECTIVE_ANSWER_KEY",
                "source_label": "objective_answer_rules",
                "degraded": False,
                "criteria": [
                    {
                        "id": cid,
                        "outcome": "NOT_DEMONSTRATED",
                        "note": f"Matched forbidden pattern for objective check: {bad}",
                    }
                    for cid in exercise.criteria_ids
                ],
                "strengths": [],
                "improvements": ["Avoid forbidden shortcuts; follow the supplied investigation rules."],
            }

    required_groups = rules.get("required_groups") or []
    missing: list[str] = []
    matched = 0
    for group in required_groups:
        keywords = [str(k).lower() for k in group]
        if any(k in text for k in keywords):
            matched += 1
        else:
            missing.append("|".join(keywords[:3]))

    total = len(required_groups) or 1
    if matched == total:
        outcome = "SUPPORTED_IN_RESPONSE"
        result = "correct"
        note = "All required concept groups present per exercise answer rules."
    elif matched == 0:
        outcome = "NOT_DEMONSTRATED"
        result = "incorrect"
        note = "No required concept groups matched the answer rules."
    else:
        outcome = "PARTIALLY_SUPPORTED"
        result = "partial"
        note = f"Matched {matched}/{total} required concept groups. Missing: {', '.join(missing)}"

    return {
        "evaluation_status": "COMPLETE",
        "objective_result": result,
        "score": None,
        "score_available": False,
        "source": "OBJECTIVE_ANSWER_KEY",
        "source_label": "objective_answer_rules",
        "degraded": False,
        "criteria": [
            {"id": cid, "outcome": outcome, "note": note} for cid in exercise.criteria_ids
        ],
        "strengths": ["Covered required concepts."] if result == "correct" else [],
        "improvements": (
            []
            if result == "correct"
            else ["Address missing required concepts from the exercise answer rules."]
        ),
        "factual_observations": [f"objective_groups_matched={matched}/{total}"],
    }


def get_catalog(locale: str = "en") -> dict[str, object]:
    """Return full catalog serialized for the given locale (v2 tracks only)."""
    return {
        "schema": EXERCISE_CATALOG_SCHEMA_ID,
        "count": len(_CATALOG),
        "families": list({ex.family for ex in _CATALOG}),
        "exercises": [ex.to_dict(locale) for ex in _CATALOG],
    }


def get_exercise(exercise_id: str) -> Exercise | None:
    """Lookup by canonical id or alias; return None if unknown."""
    return _BY_ID.get(exercise_id) or _ALIASES.get(exercise_id)


def first_question_for_exercise(exercise_id: str, locale: str = "en") -> str:
    """Return the opening question text for the exercise (locale-aware)."""
    ex = get_exercise(exercise_id)
    if not ex:
        return "Tell me about a professional challenge you overcame."
    return ex.prompt_pl if locale.startswith("pl") else ex.prompt_en


# ── Adaptive follow-up library ─────────────────────────────────────────────────
# Deterministic, labeled. Indexed by v2 family name; v1 names also kept.
_FOLLOW_UPS: dict[str, list[str]] = {
    # v2 tracks
    "software_backend": [
        "What specific signals or metrics would tell you the problem is fully resolved?",
        "How would you structure a post-mortem to prevent this class of issue?",
        "Which part of your investigation relied on assumptions — how would you validate them?",
    ],
    "business_data": [
        "What constraints would you communicate upward if your first approach failed?",
        "How would you validate your hypothesis with minimal engineering cost?",
        "What metric would tell you the problem is solved?",
    ],
    "customer_b2b": [
        "What would you do differently to surface this risk earlier next time?",
        "How would you document the outcome for future account health reviews?",
        "Which stakeholder in the account is your most reliable internal champion?",
    ],
    # v1 family aliases (kept for backward-compat with legacy follow_up_question calls)
    "behavioral_star": [
        "What would you do differently if you faced this situation again?",
        "How did you measure the impact of your actions?",
        "What did you learn about your own working style from this?",
    ],
    "role_problem": [
        "What constraints would you communicate upward if your first approach failed?",
        "How would you validate your hypothesis with minimal engineering cost?",
        "What metric would tell you the problem is solved?",
    ],
    "clarifying_questions": [
        "Which of your clarifying questions would be hardest to get answered quickly?",
        "How would you adjust your plan if the answer contradicted your main hypothesis?",
        "What early signal would tell you the strategy is working?",
    ],
}


def follow_up_question(family: str, turn_index: int, locale: str = "en") -> str:
    """Deterministic follow-up from library — never invented by AI."""
    questions = _FOLLOW_UPS.get(family, _FOLLOW_UPS["behavioral_star"])
    q_en = questions[turn_index % len(questions)]
    if not locale.startswith("pl"):
        return q_en
    # Best-effort Polish translations
    _pl_map: dict[str, str] = {
        # v2 translations
        "What specific signals or metrics would tell you the problem is fully resolved?":
            "Jakie konkretne sygnały lub metryki powiedzą Ci, że problem jest w pełni rozwiązany?",
        "How would you structure a post-mortem to prevent this class of issue?":
            "Jak zorganizowałbyś post-mortem, by zapobiec tej klasie problemów?",
        "Which part of your investigation relied on assumptions — how would you validate them?":
            "Która część Twojego dochodzenia opierała się na założeniach — jak je zweryfikujesz?",
        "What constraints would you communicate upward if your first approach failed?":
            "Jakie ograniczenia zakomunikowałbyś w górę, gdyby pierwsze podejście zawiodło?",
        "How would you validate your hypothesis with minimal engineering cost?":
            "Jak zweryfikowałbyś hipotezę przy minimalnych kosztach inżynieryjnych?",
        "What metric would tell you the problem is solved?":
            "Jaka metryka powie Ci, że problem jest rozwiązany?",
        "What would you do differently to surface this risk earlier next time?":
            "Co zrobiłbyś inaczej, żeby wcześniej wykryć to ryzyko następnym razem?",
        "How would you document the outcome for future account health reviews?":
            "Jak udokumentowałbyś wynik na potrzeby przyszłych przeglądów zdrowia konta?",
        "Which stakeholder in the account is your most reliable internal champion?":
            "Który interesariusz w koncie jest Twoim najbardziej niezawodnym wewnętrznym mistrzem?",
        # v1 translations (kept for compat)
        "What would you do differently if you faced this situation again?":
            "Co zrobiłbyś inaczej, gdybyś znów stanął w obliczu tej sytuacji?",
        "How did you measure the impact of your actions?":
            "Jak mierzyłeś wpływ swoich działań?",
        "What did you learn about your own working style from this?":
            "Czego nauczyłeś się o swoim stylu pracy z tej sytuacji?",
        "Which of your clarifying questions would be hardest to get answered quickly?":
            "Które z Twoich pytań doprecyzowujących byłoby najtrudniej szybko uzyskać?",
        "How would you adjust your plan if the answer contradicted your main hypothesis?":
            "Jak dostosowałbyś plan, gdyby odpowiedź zaprzeczyła Twojej głównej hipotezie?",
        "What early signal would tell you the strategy is working?":
            "Jaki wczesny sygnał powie Ci, że strategia działa?",
    }
    return _pl_map.get(q_en, q_en)
