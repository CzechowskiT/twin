"""Epic 2.26 — interview practice exercise catalog.

3 families × 2 exercises = 6 items.
Original content — not copied from copyrighted question banks.
EN + PL, locale-aware getters.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.services.candidate_interview_practice_constants import (
    EXERCISE_CATALOG_SCHEMA_ID,
)


@dataclass(frozen=True)
class Exercise:
    """Immutable exercise definition with bilingual content."""

    id: str
    family: str  # behavioral_star | role_problem | clarifying_questions
    difficulty: str  # easy | medium | hard
    criteria_ids: tuple[str, ...]
    title_en: str
    title_pl: str
    prompt_en: str
    prompt_pl: str

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
        }


_CATALOG: tuple[Exercise, ...] = (
    # ── Family 1: behavioral_star ─────────────────────────────────────────────
    Exercise(
        id="behavioral_star_1",
        family="behavioral_star",
        difficulty="medium",
        criteria_ids=("relevance", "evidence_use", "structure", "outcome_clarity"),
        title_en="Your biggest professional achievement",
        title_pl="Twoje największe zawodowe osiągnięcie",
        prompt_en=(
            "Describe the professional achievement you are most proud of. "
            "Use the STAR format: explain the Situation you faced, the Task you owned, "
            "the Actions you took (yours specifically), and the measurable Result. "
            "Avoid invented metrics — use real numbers you can verify or say 'outcome was qualitative'."
        ),
        prompt_pl=(
            "Opisz osiągnięcie zawodowe, z którego jesteś najbardziej dumny. "
            "Użyj formatu STAR: Sytuacja, Zadanie, Działania (konkretnie Twoje), Wynik. "
            "Nie wymyślaj liczb — podaj prawdziwe dane, które możesz zweryfikować, "
            "albo napisz 'wynik był jakościowy'."
        ),
    ),
    Exercise(
        id="behavioral_star_2",
        family="behavioral_star",
        difficulty="medium",
        criteria_ids=("relevance", "evidence_use", "structure", "outcome_clarity"),
        title_en="A time you resolved conflict in a team",
        title_pl="Kiedy rozwiązałeś konflikt w zespole",
        prompt_en=(
            "Tell me about a time you had a significant disagreement with a colleague or stakeholder. "
            "Use STAR to explain what the conflict was about, what your role was, "
            "what you concretely did to move toward resolution, "
            "and what the outcome was for the team and the work."
        ),
        prompt_pl=(
            "Opowiedz o sytuacji, w której miałeś istotny spór z kolegą lub interesariuszem. "
            "Użyj STAR: o co chodziło, jaka była Twoja rola, co konkretnie zrobiłeś, "
            "by dojść do rozwiązania, i jaki był wynik dla zespołu i pracy."
        ),
    ),
    # ── Family 2: role_problem ────────────────────────────────────────────────
    Exercise(
        id="role_problem_1",
        family="role_problem",
        difficulty="hard",
        criteria_ids=("relevance", "structure", "outcome_clarity"),
        title_en="Diagnose a sudden drop in user retention",
        title_pl="Zdiagnozuj nagły spadek retencji użytkowników",
        prompt_en=(
            "Your product's 30-day retention dropped from 45% to 28% in two weeks. "
            "You have access to event logs, support tickets, and can run one A/B test. "
            "Walk through your diagnostic approach step by step: "
            "what hypotheses would you form, what data would you pull first, "
            "how would you rule out instrumentation error, "
            "and what would a minimum viable fix look like?"
        ),
        prompt_pl=(
            "Retencja 30-dniowa Twojego produktu spadła z 45% do 28% w ciągu dwóch tygodni. "
            "Masz dostęp do logów zdarzeń, zgłoszeń supportu i możesz przeprowadzić jeden test A/B. "
            "Opisz krok po kroku swoje podejście diagnostyczne: "
            "jakie hipotezy stawiasz, jakie dane sprawdzasz najpierw, "
            "jak wykluczasz błąd instrumentacji i jak wygląda minimalne naprawienie."
        ),
    ),
    Exercise(
        id="role_problem_2",
        family="role_problem",
        difficulty="medium",
        criteria_ids=("relevance", "structure", "outcome_clarity"),
        title_en="Prioritize a backlog with competing demands",
        title_pl="Spriorytetyzuj backlog z konkurującymi wymaganiami",
        prompt_en=(
            "You have inherited a product backlog with 40 items. "
            "Three different stakeholders each claim their epic is top priority. "
            "Engineering capacity is fixed at 6 developers for the next quarter. "
            "Explain your prioritization framework, "
            "how you would handle stakeholder alignment, "
            "and what trade-offs you would communicate explicitly."
        ),
        prompt_pl=(
            "Przejąłeś backlog produktu z 40 pozycjami. "
            "Trzech różnych interesariuszy twierdzi, że ich epic ma najwyższy priorytet. "
            "Pojemność inżynieryjna to 6 deweloperów na kolejny kwartał. "
            "Wyjaśnij swój framework priorytyzacji, "
            "jak zarządzasz alignmentem interesariuszy "
            "i jakie trade-offy komunikujesz wprost."
        ),
    ),
    # ── Family 3: clarifying_questions ───────────────────────────────────────
    Exercise(
        id="clarifying_1",
        family="clarifying_questions",
        difficulty="medium",
        criteria_ids=("relevance", "structure"),
        title_en="Our API response times increased 40%",
        title_pl="Czasy odpowiedzi API wzrosły o 40%",
        prompt_en=(
            "You are handed this problem statement: "
            "'Our API response times increased by 40% over the last 72 hours.' "
            "Before jumping to solutions, ask the clarifying questions you would need. "
            "Explain WHY each question matters for narrowing down the root cause. "
            "Then, based on a plausible set of answers, propose a focused investigation plan."
        ),
        prompt_pl=(
            "Otrzymujesz taki problem: "
            "'Czasy odpowiedzi API wzrosły o 40% przez ostatnie 72 godziny.' "
            "Zanim przejdziesz do rozwiązań, zadaj pytania doprecyzowujące. "
            "Wyjaśnij, DLACZEGO każde pytanie ma znaczenie dla zawężenia przyczyny. "
            "Następnie, na podstawie prawdopodobnych odpowiedzi, zaproponuj skupiony plan śledztwa."
        ),
    ),
    Exercise(
        id="clarifying_2",
        family="clarifying_questions",
        difficulty="hard",
        criteria_ids=("relevance", "structure", "outcome_clarity"),
        title_en="Double revenue in 6 months",
        title_pl="Podwój przychody w 6 miesięcy",
        prompt_en=(
            "Your CEO says: 'We need to double revenue in 6 months.' "
            "List the clarifying questions you would ask before committing to a plan. "
            "Group them by theme (e.g. current baseline, levers available, constraints). "
            "After each question state what answer would change your strategy most significantly. "
            "Finally, sketch two contrasting strategic paths and the assumptions each requires."
        ),
        prompt_pl=(
            "CEO mówi: 'Musimy podwoić przychody w 6 miesięcy.' "
            "Wypisz pytania doprecyzowujące, które zadasz przed zobowiązaniem się do planu. "
            "Pogrupuj je tematycznie (np. aktualna linia bazowa, dostępne dźwignie, ograniczenia). "
            "Przy każdym pytaniu zaznacz, jaka odpowiedź zmieniłaby Twoją strategię najbardziej. "
            "Na koniec nakreśl dwie kontrastujące ścieżki strategiczne i założenia każdej z nich."
        ),
    ),
)

# Fast lookup by id
_BY_ID: dict[str, Exercise] = {ex.id: ex for ex in _CATALOG}


def get_catalog(locale: str = "en") -> dict[str, object]:
    """Return full catalog serialized for the given locale."""
    return {
        "schema": EXERCISE_CATALOG_SCHEMA_ID,
        "count": len(_CATALOG),
        "families": list({ex.family for ex in _CATALOG}),
        "exercises": [ex.to_dict(locale) for ex in _CATALOG],
    }


def get_exercise(exercise_id: str) -> Exercise | None:
    """Lookup by id; return None if unknown."""
    return _BY_ID.get(exercise_id)


def first_question_for_exercise(exercise_id: str, locale: str = "en") -> str:
    """Return the opening question text for the exercise (locale-aware)."""
    ex = _BY_ID.get(exercise_id)
    if not ex:
        return "Tell me about a professional challenge you overcame."
    return ex.prompt_pl if locale.startswith("pl") else ex.prompt_en


# Adaptive follow-up library — deterministic, labeled (no AI required)
_FOLLOW_UPS: dict[str, list[str]] = {
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
    # Best-effort Polish for follow-ups
    _pl_map: dict[str, str] = {
        "What would you do differently if you faced this situation again?":
            "Co zrobiłbyś inaczej, gdybyś znów stanął w obliczu tej sytuacji?",
        "How did you measure the impact of your actions?":
            "Jak mierzyłeś wpływ swoich działań?",
        "What did you learn about your own working style from this?":
            "Czego nauczyłeś się o swoim stylu pracy z tej sytuacji?",
        "What constraints would you communicate upward if your first approach failed?":
            "Jakie ograniczenia zakomunikowałbyś w górę, gdyby pierwsze podejście zawiodło?",
        "How would you validate your hypothesis with minimal engineering cost?":
            "Jak zweryfikowałbyś hipotezę przy minimalnych kosztach inżynieryjnych?",
        "What metric would tell you the problem is solved?":
            "Jaka metryka powie Ci, że problem jest rozwiązany?",
        "Which of your clarifying questions would be hardest to get answered quickly?":
            "Które z Twoich pytań doprecyzowujących byłoby najtrudniej szybko uzyskać?",
        "How would you adjust your plan if the answer contradicted your main hypothesis?":
            "Jak dostosowałbyś plan, gdyby odpowiedź zaprzeczyła Twojej głównej hipotezie?",
        "What early signal would tell you the strategy is working?":
            "Jaki wczesny sygnał powie Ci, że strategia działa?",
    }
    return _pl_map.get(q_en, q_en)
