/**
 * PP1 — Public-safe static projection of Epic 2.11 fictional demo_scenario_v1.
 * No candidate IDs, no prod DB, no private APIs, no runtime AI.
 */

export const PUBLIC_PREVIEW_FIXTURE_VERSION = "demo_scenario_v1" as const;
export const PUBLIC_PREVIEW_ASSET_CACHE_TAG = `pp1-${PUBLIC_PREVIEW_FIXTURE_VERSION}` as const;

export type PreviewLocale = "en" | "pl";

export type PreviewAreaId =
  | "home"
  | "direction"
  | "opportunities"
  | "evidence"
  | "plan"
  | "decisions"
  | "settings";

export type PreviewArea = {
  id: PreviewAreaId;
  title: { en: string; pl: string };
  body: { en: string; pl: string };
  sample: { en: string; pl: string };
  simulatedAction: { en: string; pl: string };
};

/** Seven canonical IA areas — fictional content only. */
export const PUBLIC_PREVIEW_AREAS: readonly PreviewArea[] = [
  {
    id: "home",
    title: { en: "Home", pl: "Start" },
    body: {
      en: "Calm next step for a simulated day — not a noisy dashboard.",
      pl: "Spokojny następny krok w symulowanym dniu — nie hałaśliwy dashboard.",
    },
    sample: {
      en: "SIMULATED: Review one demo opportunity this week.",
      pl: "SYMULACJA: Przejrzyj jedną demo-szansę w tym tygodniu.",
    },
    simulatedAction: {
      en: "Mark demo step done",
      pl: "Oznacz krok demo jako zrobiony",
    },
  },
  {
    id: "direction",
    title: { en: "Direction", pl: "Kierunek" },
    body: {
      en: "Explore product operations roles with a calm weekly cadence (demo only).",
      pl: "Odkrywaj role w product operations ze spokojnym rytmem tygodnia (tylko demo).",
    },
    sample: {
      en: "SIMULATED candidate — Alex Example · Product operations (simulated).",
      pl: "SYMULOWANY kandydat — Alex Example · Product operations (symulacja).",
    },
    simulatedAction: {
      en: "Save demo direction",
      pl: "Zapisz kierunek demo",
    },
  },
  {
    id: "opportunities",
    title: { en: "Opportunities", pl: "Szanse" },
    body: {
      en: "Illustrative matches — not live jobs and not a submission path.",
      pl: "Ilustracyjne dopasowania — nie żywe oferty i nie ścieżka aplikowania.",
    },
    sample: {
      en: "Demo Ops Coordinator @ Example Co (fictional). Demo Program Analyst @ Northwind Labs (fictional).",
      pl: "Demo Ops Coordinator @ Example Co (fikcyjne). Demo Program Analyst @ Northwind Labs (fikcyjne).",
    },
    simulatedAction: {
      en: "Open demo opportunity",
      pl: "Otwórz szansę demo",
    },
  },
  {
    id: "evidence",
    title: { en: "Evidence", pl: "Dowody" },
    body: {
      en: "Fictional evidence cards — not stored in portfolio tables.",
      pl: "Fikcyjne karty dowodów — nie trafiają do tabel portfolio.",
    },
    sample: {
      en: "SIMULATED: Demo project write-up.",
      pl: "SYMULACJA: Opis projektu demo.",
    },
    simulatedAction: {
      en: "Add demo evidence",
      pl: "Dodaj dowód demo",
    },
  },
  {
    id: "plan",
    title: { en: "Plan", pl: "Plan" },
    body: {
      en: "Organize simulated actions on a calendar you do not connect here.",
      pl: "Porządkuj symulowane działania w kalendarzu, którego tu nie łączysz.",
    },
    sample: {
      en: "SIMULATED: Review demo opportunity · This week (demo).",
      pl: "SYMULACJA: Przejrzyj szansę demo · W tym tygodniu (demo).",
    },
    simulatedAction: {
      en: "Schedule demo hold",
      pl: "Zaplanuj blok demo",
    },
  },
  {
    id: "decisions",
    title: { en: "Decisions", pl: "Decyzje" },
    body: {
      en: "Approve or decline when something needs you — silence is fine. Nothing is sent.",
      pl: "Zaakceptuj lub odrzuć, gdy coś wymaga Ciebie — cisza jest w porządku. Nic nie jest wysyłane.",
    },
    sample: {
      en: "SIMULATED approval queue is empty of real items.",
      pl: "SYMULOWANA kolejka decyzji nie zawiera prawdziwych pozycji.",
    },
    simulatedAction: {
      en: "Simulate approve",
      pl: "Symuluj akceptację",
    },
  },
  {
    id: "settings",
    title: { en: "Settings", pl: "Ustawienia" },
    body: {
      en: "Privacy, pause, export, and deletion stay under your control in a real account — this preview creates none.",
      pl: "Prywatność, pauza, eksport i usunięcie są pod Twoją kontrolą na prawdziwym koncie — ten podgląd go nie tworzy.",
    },
    sample: {
      en: "No account · no OAuth · no external action in this preview.",
      pl: "Brak konta · brak OAuth · brak zewnętrznej akcji w tym podglądzie.",
    },
    simulatedAction: {
      en: "Open demo privacy note",
      pl: "Otwórz notatkę prywatności demo",
    },
  },
] as const;

export const PUBLIC_PREVIEW_MARKERS = {
  synthetic: "SYNTHETIC PRODUCT PREVIEW",
  readOnly: "READ-ONLY",
  fictional: "FICTIONAL DATA",
  noAccount: "NO ACCOUNT OR EXTERNAL ACTION IS TAKEN",
  simulated: "SIMULATED — NO REAL STATE CHANGE",
} as const;
