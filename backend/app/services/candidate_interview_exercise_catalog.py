"""Epic 2.26 v2 — interview practice exercise catalog.

3 career tracks × 2 exercises = 6 items.
  - software_backend : objective (explicit rules) + open rubric
  - business_data    : objective + open rubric
  - customer_b2b     : objective + open rubric

Old exercise IDs (v1: behavioral_star_1/2, role_problem_1/2, clarifying_1/2)
are kept as aliases that resolve to v2 IDs for historical sessions.

EN + PL bilingual. Stable id + version — session create snapshots the version.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.services.candidate_interview_practice_constants import (
    EXERCISE_CATALOG_SCHEMA_ID,
)

CATALOG_VERSION = 2  # increment when any exercise definition changes


@dataclass(frozen=True)
class Exercise:
    """Immutable exercise definition with bilingual content and schema version."""

    id: str
    family: str  # software_backend | business_data | customer_b2b
    difficulty: str  # easy | medium | hard
    criteria_ids: tuple[str, ...]
    title_en: str
    title_pl: str
    prompt_en: str
    prompt_pl: str
    rubric_en: str  # explicit answer rules (objective) or open rubric description
    rubric_pl: str
    exercise_type: str  # "objective" (explicit rules) | "open_rubric"
    version: int = CATALOG_VERSION

    def to_dict(self, locale: str = "en") -> dict[str, Any]:
        pl = locale.startswith("pl")
        return {
            "id": self.id,
            "family": self.family,
            "difficulty": self.difficulty,
            "criteria_ids": list(self.criteria_ids),
            "title": self.title_pl if pl else self.title_en,
            "prompt": self.prompt_pl if pl else self.prompt_en,
            "rubric": self.rubric_pl if pl else self.rubric_en,
            "exercise_type": self.exercise_type,
            "title_en": self.title_en,
            "title_pl": self.title_pl,
            "version": self.version,
        }


_CATALOG: tuple[Exercise, ...] = (

    # ── Track 1: software_backend ─────────────────────────────────────────────

    Exercise(
        id="sw_backend_objective_1",
        family="software_backend",
        difficulty="medium",
        criteria_ids=("relevance", "structure", "outcome_clarity"),
        exercise_type="objective",
        title_en="Debug a production incident — structured walkthrough",
        title_pl="Debugowanie incydentu produkcyjnego — ustrukturyzowany opis",
        prompt_en=(
            "Your API error rate jumped from 0.1% to 12% at 14:23 UTC. "
            "You have access to logs, metrics (Datadog/Grafana), and can deploy. "
            "Walk through your incident response step by step. "
            "Rules: (1) Start with impact scoping before any code change. "
            "(2) Name a specific diagnostic you would run first and why. "
            "(3) Describe your rollback or mitigation trigger. "
            "(4) Give the exact text of a status update you would send to stakeholders. "
            "Do NOT invent metrics you cannot verify."
        ),
        prompt_pl=(
            "Wskaźnik błędów Twojego API skoczył z 0.1% do 12% o 14:23 UTC. "
            "Masz dostęp do logów, metryk (Datadog/Grafana) i możesz wdrożyć kod. "
            "Opisz krok po kroku swoją odpowiedź na incydent. "
            "Zasady: (1) Zacznij od oceny wpływu zanim zmienisz kod. "
            "(2) Podaj konkretną diagnostykę, którą uruchomisz jako pierwszą i dlaczego. "
            "(3) Opisz wyzwalacz rollback lub mitygacji. "
            "(4) Podaj dokładny tekst aktualizacji, którą wysłałbyś do interesariuszy. "
            "Nie wymyślaj metryk, których nie możesz zweryfikować."
        ),
        rubric_en=(
            "Objective criteria: must address impact scoping, name a specific diagnostic, "
            "describe rollback trigger, and include a stakeholder message. "
            "Missing any of the four = NOT_DEMONSTRATED for structure."
        ),
        rubric_pl=(
            "Kryteria obiektywne: musi zawierać ocenę wpływu, konkretną diagnostykę, "
            "wyzwalacz rollback i wiadomość do interesariuszy. "
            "Brak któregokolwiek z czterech = NOT_DEMONSTRATED dla struktury."
        ),
    ),

    Exercise(
        id="sw_backend_rubric_1",
        family="software_backend",
        difficulty="hard",
        criteria_ids=("relevance", "evidence_use", "structure", "outcome_clarity"),
        exercise_type="open_rubric",
        title_en="Design a rate-limiting system at scale",
        title_pl="Zaprojektuj system rate-limiting na dużą skalę",
        prompt_en=(
            "Design a rate-limiting service that handles 100k requests/second across "
            "50 microservices with different per-endpoint limits. "
            "Cover: data structure choice, consistency guarantees, failure modes, "
            "and how you would roll it out without service degradation. "
            "Be honest about trade-offs — there is no single correct answer."
        ),
        prompt_pl=(
            "Zaprojektuj serwis rate-limiting obsługujący 100k req/s dla "
            "50 mikroserwisów z różnymi limitami per endpoint. "
            "Omów: wybór struktury danych, gwarancje spójności, tryby awarii "
            "i jak przeprowadzisz wdrożenie bez degradacji serwisu. "
            "Bądź szczery w kwestii trade-offów — nie ma jednej właściwej odpowiedzi."
        ),
        rubric_en=(
            "Open rubric: look for mention of at least one data structure tradeoff, "
            "acknowledgement of consistency vs availability, and a rollout strategy. "
            "No single correct answer — depth and honesty of trade-off reasoning matters."
        ),
        rubric_pl=(
            "Otwarty rubric: szukaj wzmianki o co najmniej jednym trade-offie struktury danych, "
            "uznania spójności vs dostępności i strategii wdrożenia. "
            "Nie ma jednej poprawnej odpowiedzi — ważna jest głębokość i szczerość rozumowania."
        ),
    ),

    # ── Track 2: business_data ────────────────────────────────────────────────

    Exercise(
        id="biz_data_objective_1",
        family="business_data",
        difficulty="medium",
        criteria_ids=("relevance", "structure", "outcome_clarity"),
        exercise_type="objective",
        title_en="Explain a drop in conversion rate — structured analysis",
        title_pl="Wyjaśnij spadek wskaźnika konwersji — ustrukturyzowana analiza",
        prompt_en=(
            "Checkout conversion dropped from 3.2% to 1.9% overnight. "
            "You have: GA4 events, Stripe webhook logs, and can query the DB. "
            "Walk through your diagnostic in order. "
            "Rules: (1) Identify at least two non-overlapping hypotheses. "
            "(2) For each hypothesis name the data source you would query first. "
            "(3) Describe the test that would confirm or rule out each. "
            "(4) State what you would NOT change before confirming the root cause. "
            "Do NOT claim a cause without naming the evidence that would support it."
        ),
        prompt_pl=(
            "Konwersja przy kasie spadła z 3,2% do 1,9% z dnia na dzień. "
            "Masz: zdarzenia GA4, logi webhooków Stripe i możesz odpytać bazę. "
            "Opisz krok po kroku swoją diagnostykę. "
            "Zasady: (1) Zidentyfikuj co najmniej dwie rozłączne hipotezy. "
            "(2) Dla każdej hipotezy podaj źródło danych, które sprawdzisz jako pierwsze. "
            "(3) Opisz test, który potwierdzi lub wykluczy każdą. "
            "(4) Powiedz co NIE zmienisz przed potwierdzeniem przyczyny głównej. "
            "Nie zakładaj przyczyny bez podania danych, które by ją potwierdziły."
        ),
        rubric_en=(
            "Objective criteria: must name ≥2 hypotheses, ≥2 data sources, "
            "at least one explicit 'would NOT change before confirming' statement. "
            "Missing = NOT_DEMONSTRATED for structure."
        ),
        rubric_pl=(
            "Kryteria obiektywne: musi zawierać ≥2 hipotezy, ≥2 źródła danych, "
            "co najmniej jedno stwierdzenie 'nie zmienię przed potwierdzeniem'. "
            "Brak = NOT_DEMONSTRATED dla struktury."
        ),
    ),

    Exercise(
        id="biz_data_rubric_1",
        family="business_data",
        difficulty="hard",
        criteria_ids=("relevance", "evidence_use", "outcome_clarity"),
        exercise_type="open_rubric",
        title_en="Build a growth experiment roadmap",
        title_pl="Zbuduj roadmapę eksperymentów wzrostowych",
        prompt_en=(
            "You are the first data person at a B2B SaaS company with 200 customers, "
            "$1.2M ARR, and a 4% monthly churn. Leadership wants to double ARR in 12 months. "
            "Propose a 90-day experiment roadmap. Cover at minimum: "
            "which metric you would optimize first, why, what experiments you would run "
            "to test your hypothesis, and what would tell you the strategy is failing. "
            "Be honest about uncertainty — say 'we would need to test' rather than claiming known outcomes."
        ),
        prompt_pl=(
            "Jesteś pierwszą osobą od danych w firmie B2B SaaS z 200 klientami, "
            "$1,2M ARR i 4% miesięcznego churnu. Zarząd chce podwoić ARR w 12 miesięcy. "
            "Zaproponuj roadmapę eksperymentów na 90 dni. Obowiązkowo: "
            "którą metrykę zoptymalizujesz jako pierwszą i dlaczego, jakie eksperymenty "
            "uruchomisz, żeby przetestować hipotezę, i co powie Ci, że strategia zawodzi. "
            "Bądź szczery w kwestii niepewności — powiedz 'musielibyśmy przetestować' "
            "zamiast zakładać znane wyniki."
        ),
        rubric_en=(
            "Open rubric: look for explicit metric choice with rationale, "
            "at least one testable experiment, and an honest failure signal. "
            "Claiming certainty about outcomes without evidence is a negative signal."
        ),
        rubric_pl=(
            "Otwarty rubric: szukaj jawnego wyboru metryki z uzasadnieniem, "
            "co najmniej jednego testowalnego eksperymentu i szczerego sygnału niepowodzenia. "
            "Twierdzenie o pewności wyników bez dowodów to sygnał negatywny."
        ),
    ),

    # ── Track 3: customer_b2b ─────────────────────────────────────────────────

    Exercise(
        id="cust_b2b_objective_1",
        family="customer_b2b",
        difficulty="medium",
        criteria_ids=("relevance", "structure", "outcome_clarity"),
        exercise_type="objective",
        title_en="Handle an escalating enterprise customer complaint",
        title_pl="Zarządź eskalacją reklamacji klienta enterprise",
        prompt_en=(
            "Your largest customer ($400k ARR) sends a message at 17:45 on a Friday: "
            "'Your platform went down for 90 minutes during our exec demo. "
            "We're reviewing our contract renewal.' "
            "Write your response and internal action plan. "
            "Rules: (1) Acknowledge the impact without deflecting. "
            "(2) State the first thing you will do in the next 60 minutes. "
            "(3) Name the internal owner you would loop in and why. "
            "(4) Describe how you would follow up within 24h. "
            "Do NOT make promises you cannot guarantee in writing."
        ),
        prompt_pl=(
            "Twój największy klient ($400k ARR) wysyła wiadomość o 17:45 w piątek: "
            "'Wasza platforma nie działała 90 minut podczas naszego demo dla zarządu. "
            "Rozważamy odnowienie kontraktu.' "
            "Napisz swoją odpowiedź i wewnętrzny plan działania. "
            "Zasady: (1) Uznaj wpływ bez odchylania winy. "
            "(2) Powiedz co zrobisz w ciągu najbliższych 60 minut. "
            "(3) Nazwij wewnętrznego właściciela, którego wpiszesz w pętlę i dlaczego. "
            "(4) Opisz jak zrobisz follow-up w ciągu 24h. "
            "Nie obiecuj niczego, czego nie możesz zagwarantować na piśmie."
        ),
        rubric_en=(
            "Objective criteria: must acknowledge impact, state a next action within 60min, "
            "name an internal owner, and describe a 24h follow-up. "
            "Making unjustifiable promises = negative signal for outcome_clarity."
        ),
        rubric_pl=(
            "Kryteria obiektywne: musi uznać wpływ, podać akcję w ciągu 60 min, "
            "nazwać wewnętrznego właściciela i opisać follow-up po 24h. "
            "Nieuzasadnione obietnice = negatywny sygnał dla outcome_clarity."
        ),
    ),

    Exercise(
        id="cust_b2b_rubric_1",
        family="customer_b2b",
        difficulty="hard",
        criteria_ids=("relevance", "evidence_use", "structure", "outcome_clarity"),
        exercise_type="open_rubric",
        title_en="Build a B2B customer success playbook for churn prevention",
        title_pl="Zbuduj playbook customer success dla zapobiegania churnowi B2B",
        prompt_en=(
            "You have just taken over a 30-customer enterprise portfolio. "
            "Monthly churn is 5% and you have no structured health scoring yet. "
            "Design a 60-day churn prevention playbook. Include at least: "
            "how you identify at-risk accounts, what interventions you would try "
            "(prioritised by effort vs expected impact), and how you would measure success. "
            "Name the signals you would watch — be specific about what counts as 'at-risk'. "
            "Acknowledge where you would need customer input before acting."
        ),
        prompt_pl=(
            "Właśnie przejąłeś portfel 30 klientów enterprise. "
            "Miesięczny churn to 5% i nie masz jeszcze ustrukturyzowanego health scoringu. "
            "Zaprojektuj 60-dniowy playbook zapobiegania churnowi. Obowiązkowo: "
            "jak identyfikujesz zagrożone konta, jakie interwencje próbujesz "
            "(priorytety: wysiłek vs oczekiwany wpływ) i jak mierzysz sukces. "
            "Podaj sygnały, które obserwujesz — bądź konkretny co do definicji 'zagrożone'. "
            "Zaznacz, gdzie potrzebujesz wkładu klienta przed działaniem."
        ),
        rubric_en=(
            "Open rubric: look for a concrete definition of 'at-risk', "
            "at least two distinct interventions with effort/impact reasoning, "
            "and an honest success metric. Vague platitudes without specifics "
            "should score lower on evidence_use."
        ),
        rubric_pl=(
            "Otwarty rubric: szukaj konkretnej definicji 'zagrożone', "
            "co najmniej dwóch interwencji z uzasadnieniem wysiłek/wpływ "
            "i szczerej metryki sukcesu. Ogólniki bez szczegółów "
            "powinny wypaść gorzej w evidence_use."
        ),
    ),
)

# Fast lookup by id
_BY_ID: dict[str, Exercise] = {ex.id: ex for ex in _CATALOG}

# v1 → v2 alias map (historical sessions referencing old exercise IDs)
_V1_ALIASES: dict[str, str] = {
    "behavioral_star_1": "sw_backend_rubric_1",
    "behavioral_star_2": "cust_b2b_rubric_1",
    "role_problem_1": "biz_data_rubric_1",
    "role_problem_2": "sw_backend_objective_1",
    "clarifying_1": "biz_data_objective_1",
    "clarifying_2": "cust_b2b_objective_1",
}

# v1 follow-up family aliases (kept for backward compat in next_turn)
_V1_FAMILY_ALIASES: dict[str, str] = {
    "behavioral_star": "software_backend",
    "role_problem": "business_data",
    "clarifying_questions": "customer_b2b",
}


def get_catalog(locale: str = "en") -> dict[str, object]:
    """Return full catalog serialized for the given locale."""
    return {
        "schema": EXERCISE_CATALOG_SCHEMA_ID,
        "version": CATALOG_VERSION,
        "count": len(_CATALOG),
        "families": list({ex.family for ex in _CATALOG}),
        "exercises": [ex.to_dict(locale) for ex in _CATALOG],
    }


def get_exercise(exercise_id: str) -> Exercise | None:
    """Lookup by id; follow v1 aliases for historical sessions. Return None if unknown."""
    if exercise_id in _BY_ID:
        return _BY_ID[exercise_id]
    # Resolve v1 alias
    v2_id = _V1_ALIASES.get(exercise_id)
    if v2_id:
        return _BY_ID.get(v2_id)
    return None


def first_question_for_exercise(exercise_id: str, locale: str = "en") -> str:
    """Return the opening question text for the exercise (locale-aware, alias-aware)."""
    ex = get_exercise(exercise_id)
    if not ex:
        return "Tell me about a professional challenge you overcame."
    return ex.prompt_pl if locale.startswith("pl") else ex.prompt_en


# Adaptive follow-up library — deterministic, labeled (no AI required)
# Keyed by v2 family; v1 family names are resolved via _V1_FAMILY_ALIASES
_FOLLOW_UPS: dict[str, list[str]] = {
    "software_backend": [
        "What would you do differently if you encountered this system failure again?",
        "How did you verify the root cause before applying the fix — what was your evidence?",
        "What monitoring or alerting would you put in place to catch this class of issue earlier?",
    ],
    "business_data": [
        "How would you validate your hypothesis with the smallest experiment possible?",
        "What metric would tell you definitively that the problem is solved — not just improved?",
        "What would you communicate to leadership if your first approach failed after 2 weeks?",
    ],
    "customer_b2b": [
        "How would you adjust your approach if the customer pushed back on your proposed fix?",
        "What early signal would tell you the relationship is at risk before the customer escalates?",
        "How would you document this case so the next account manager can handle a similar situation?",
    ],
}

# Polish translations for follow-ups
_FOLLOW_UPS_PL: dict[str, list[str]] = {
    "software_backend": [
        "Co zrobiłbyś inaczej, gdybyś znów napotkał tę awarię systemu?",
        "Jak zweryfikowałeś przyczynę główną przed zastosowaniem poprawki — jakie miałeś dowody?",
        "Jaki monitoring lub alerty postawiłbyś, żeby wcześniej wychwycić tę klasę problemów?",
    ],
    "business_data": [
        "Jak zweryfikowałbyś swoją hipotezę przy jak najmniejszym eksperymencie?",
        "Jaka metryka powiedziałaby Ci definitywnie, że problem jest rozwiązany — nie tylko poprawiony?",
        "Co zakomunikowałbyś zarządowi, gdyby pierwsze podejście zawiodło po 2 tygodniach?",
    ],
    "customer_b2b": [
        "Jak dostosowałbyś swoje podejście, gdyby klient odrzucił Twoje proponowane rozwiązanie?",
        "Jaki wczesny sygnał powiedziałby Ci, że relacja jest zagrożona zanim klient eskaluje?",
        "Jak udokumentowałbyś ten przypadek, żeby kolejny account manager mógł sobie poradzić z podobną sytuacją?",
    ],
}


def _resolve_family(family: str) -> str:
    """Resolve v1 family alias to v2; return unchanged if already v2."""
    return _V1_FAMILY_ALIASES.get(family, family)


def follow_up_question(family: str, turn_index: int, locale: str = "en") -> str:
    """Deterministic follow-up from library — never invented by AI.

    Accepts both v1 family names (behavioral_star, role_problem, clarifying_questions)
    and v2 family names (software_backend, business_data, customer_b2b).
    """
    resolved = _resolve_family(family)
    if locale.startswith("pl"):
        questions = _FOLLOW_UPS_PL.get(resolved, _FOLLOW_UPS_PL["software_backend"])
    else:
        questions = _FOLLOW_UPS.get(resolved, _FOLLOW_UPS["software_backend"])
    return questions[turn_index % len(questions)]
