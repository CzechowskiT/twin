import type { FaqSectionId } from "@/lib/faq-messages";
import { FAQ_SECTIONS } from "@/lib/faq-messages";

/** Hash target for investor FAQ on /faq (sticky header offset via scroll-mt on element). */
export const FAQ_INVESTOR_ANCHOR_ID = "investor-faq";

export const FAQ_INVESTOR_HREF = `/faq#${FAQ_INVESTOR_ANCHOR_ID}`;

const ANCHOR_TO_SECTION: Record<string, FaqSectionId> = {
  [FAQ_INVESTOR_ANCHOR_ID]: "investors",
};

export function isFaqSectionId(value: string): value is FaqSectionId {
  return FAQ_SECTIONS.some((s) => s.id === value);
}

/** Resolve persona tab from `?section=` or `#investor-faq` (and future anchors). */
export function faqSectionFromLocation(
  sectionParam: string | null,
  hash: string,
): FaqSectionId | null {
  const bareHash = hash.replace(/^#/, "");
  const fromAnchor = bareHash ? ANCHOR_TO_SECTION[bareHash] : undefined;
  if (fromAnchor) return fromAnchor;
  if (sectionParam && isFaqSectionId(sectionParam)) return sectionParam;
  return null;
}

export function scrollToFaqAnchor(anchorId: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(anchorId);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
