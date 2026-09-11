"""Epic 2.26 M2 — interview practice exercise catalog (v2 tracks).

3 tracks × 2 exercises = 6 items (one objective + one open-rubric per track).

Tracks (v2):
  - software_backend  — backend engineering depth
  - business_data     — product / data problem-solving
  - customer_b2b      — customer-facing & stakeholder work

Legacy v1 family IDs (behavioral_star, role_problem, clarifying_questions) are
kept as aliases pointing to canonical v2 exercises so historical session
exercise_id values continue to resolve via get_exercise().

EN + PL locale-aware content.
Original content — not copied from copyrighted question banks.
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
    family: str  # software_backend | business_data | customer_b2b
    difficulty: str  # easy | medium | hard
    criteria_ids: tuple[str, ...]
    title_en: str
    title_pl: str
    prompt_en: str
    prompt_pl: str
    # v2 fields
    exercise_type: str = "open_rubric"  # objective | open_rubric
    version: int = 2

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
        }


_CATALOG: tuple[Exercise, ...] = (
    # ── Track 1: software_backend ─────────────────────────────────────────────

    # Objective: explicit correctness rules — debugging a latency spike
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
    ),

    # Open rubric: system design with evaluative criteria
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

    # Objective: explicit correctness rules — retention drop diagnosis
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
    ),

    # Open rubric: backlog prioritization framework
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

    # Objective: explicit rules — handling a technical objection
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
    ),

    # Open rubric: account health and relationship management
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

# ── Legacy v1 aliases ─────────────────────────────────────────────────────────
# Map v1 exercise IDs (behavioral_star, role_problem, clarifying_questions families)
# to their closest v2 canonical counterpart.
# Historical session.exercise_id values continue to resolve via get_exercise().
_ALIASES: dict[str, Exercise] = {
    # behavioral_star family aliases (v1 IDs → v2 canonical IDs)
    "behavioral_star_1": _BY_ID["sw_backend_objective_1"],   # STAR achievement → backend debug
    "behavioral_star_2": _BY_ID["cust_b2b_objective_1"],     # STAR conflict → B2B objection
    # role_problem family aliases
    "role_problem_1": _BY_ID["biz_data_objective_1"],        # retention drop (same content)
    "role_problem_2": _BY_ID["biz_data_rubric_1"],           # backlog prioritization (same)
    # clarifying_questions family aliases
    "clarifying_1": _BY_ID["sw_backend_rubric_1"],           # API latency → backend design
    "clarifying_2": _BY_ID["cust_b2b_rubric_1"],             # account rescue
    # Cross-naming aliases for historical sessions using longer names
    "customer_b2b_1": _BY_ID["cust_b2b_objective_1"],
    "customer_b2b_2": _BY_ID["cust_b2b_rubric_1"],
    "business_data_1": _BY_ID["biz_data_objective_1"],
    "business_data_2": _BY_ID["biz_data_rubric_1"],
    "software_backend_1": _BY_ID["sw_backend_objective_1"],
    "software_backend_2": _BY_ID["sw_backend_rubric_1"],
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
    """Lookup by canonical or legacy alias id; return None if unknown."""
    return _BY_ID.get(exercise_id) or _ALIASES.get(exercise_id)


def first_question_for_exercise(exercise_id: str, locale: str = "en") -> str:
    """Return the opening question text for the exercise (locale-aware)."""
    ex = get_exercise(exercise_id)
    if not ex:
        return "Tell me about a professional challenge you overcame."
    return ex.prompt_pl if locale.startswith("pl") else ex.prompt_en


# ── Adaptive follow-up library ─────────────────────────────────────────────────
# Deterministic, labeled (no AI required).
# Indexed by v2 family name; v1 family names also kept for follow_up_question compat.
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
        "Which stakeholder in the account is your most reliable internal champion — how would you leverage them?",
    ],
    # v1 family aliases (kept for backward-compat with follow_up_question calls)
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
    # Best-effort Polish translations for follow-up library questions
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
        "Which stakeholder in the account is your most reliable internal champion — how would you leverage them?":
            "Który interesariusz w koncie jest Twoim najbardziej niezawodnym wewnętrznym mistrzem — jak go wykorzystasz?",
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
