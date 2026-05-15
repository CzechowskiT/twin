import type { TranslationKey } from "@/lib/i18n";

/** Must match backend `REGION_ORDER` slugs. */
export const BOARD_REGION_ORDER = [
  "poland",
  "europe",
  "uk",
  "americas",
  "asia-pacific",
  "global",
] as const;

export type BoardRegionSlug = (typeof BOARD_REGION_ORDER)[number];

const REGION_I18N: Record<BoardRegionSlug, TranslationKey> = {
  poland: "dashboard.regionPoland",
  europe: "dashboard.regionEurope",
  uk: "dashboard.regionUk",
  americas: "dashboard.regionAmericas",
  "asia-pacific": "dashboard.regionAsiaPacific",
  global: "dashboard.regionGlobal",
};

export function regionLabelKey(region: string): TranslationKey {
  if (region in REGION_I18N) {
    return REGION_I18N[region as BoardRegionSlug];
  }
  return "dashboard.regionGlobal";
}

export function groupBoardsByRegion<T extends { region: string }>(
  items: T[],
): { region: BoardRegionSlug; boards: T[] }[] {
  const byRegion = new Map<string, T[]>();
  for (const board of items) {
    const list = byRegion.get(board.region) ?? [];
    list.push(board);
    byRegion.set(board.region, list);
  }
  return BOARD_REGION_ORDER.filter((region) => byRegion.has(region)).map((region) => ({
    region,
    boards: byRegion.get(region)!,
  }));
}
