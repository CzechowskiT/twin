/** Epic 2.18 — Journey Continuity / Safe Resume copy (EN + PL). */

export const JOURNEY_CONTINUITY_MESSAGES_EN = {
  title: "Continue recent work",
  lead: "Pick up where you left off on this or another device. TWIN rechecks ownership and version before opening — never overwrites newer edits.",
  empty: "Nothing to continue yet. Checkpoints appear after you explicitly save or advance a flow.",
  continue: "Continue",
  review: "Review safely",
  pin: "Pin",
  unpin: "Unpin",
  pause: "Pause",
  clear: "Clear",
  notFirstValue: "Continuity is not first value.",
  noReminders: "No email or push reminders from this panel.",
  loading: "Loading…",
  error: "Could not load continue list.",
  stale: "Something changed — review before editing.",
  exact: "Exact checkpoint ready.",
  invalid: "This checkpoint is no longer valid.",
} as const;

export const JOURNEY_CONTINUITY_MESSAGES_PL: Record<
  keyof typeof JOURNEY_CONTINUITY_MESSAGES_EN,
  string
> = {
  title: "Kontynuuj niedawną pracę",
  lead: "Wznów pracę na tym lub innym urządzeniu. TWIN sprawdza własność i wersję przed otwarciem — nigdy nie nadpisuje nowszych edycji.",
  empty: "Brak punktów wznowienia. Pojawią się po jawnym zapisie lub przejściu w flow.",
  continue: "Kontynuuj",
  review: "Przejrzyj bezpiecznie",
  pin: "Przypnij",
  unpin: "Odepnij",
  pause: "Wstrzymaj",
  clear: "Wyczyść",
  notFirstValue: "Continuity nie jest first value.",
  noReminders: "Bez e-mailowych ani push reminderów z tego panelu.",
  loading: "Ładowanie…",
  error: "Nie udało się wczytać listy kontynuacji.",
  stale: "Coś się zmieniło — przejrzyj przed edycją.",
  exact: "Dokładny checkpoint gotowy.",
  invalid: "Ten checkpoint jest już nieważny.",
};
