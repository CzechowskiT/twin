/** Minimal OG meta copy — keep out of Edge bundles (no i18n.ts / waitlist-messages). */

export type OgLocale = "en" | "pl";

export type WaitlistOgCopy = { metaTitle: string; metaDescription: string };

const EN: WaitlistOgCopy = {
  metaTitle: "TWIN Wishlist — founding career agent",
  metaDescription:
    "Join the first 1,000 founding members: ranked jobs up to 200, honest application statuses, ~30 source adapters today. Free wishlist signup — no card.",
};

const PL: WaitlistOgCopy = {
  metaTitle: "TWIN Wishlist — agent kariery founding",
  metaDescription:
    "Pierwsze 1000 founding: ranking do 200 ofert, uczciwe statusy aplikacji, ~30 adapterów źródeł. Darmowy zapis — bez karty.",
};

export const WAITLIST_OG_COPY: Record<OgLocale, WaitlistOgCopy> = { en: EN, pl: PL };

/** Resolve OG locale from Accept-Language without importing full i18n. */
export function ogLocaleFromAcceptLanguage(header: string | null): OgLocale {
  if (!header?.trim()) return "en";
  const tags = header.split(",").map((part) => part.trim().split(";")[0]?.toLowerCase() ?? "");
  for (const raw of tags) {
    if (!raw) continue;
    if (raw === "pl" || raw.startsWith("pl-")) return "pl";
  }
  return "en";
}
