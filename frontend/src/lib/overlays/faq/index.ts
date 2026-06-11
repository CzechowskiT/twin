/**
 * Full FAQ copy for es–ja locales — merged last in dictionary build so /faq and homepage teasers never fall back to EN.
 */
import type { Locale } from "../../i18n";
import type { FaqLocaleOverlay } from "./types";
import { faqAr } from "./ar";
import { faqDe } from "./de";
import { faqEs } from "./es";
import { faqFr } from "./fr";
import { faqIt } from "./it";
import { faqJa } from "./ja";
import { faqZh } from "./zh";

export type { FaqLocaleOverlay } from "./types";

export const FAQ_LOCALE_OVERLAYS: Partial<Record<Locale, FaqLocaleOverlay>> = {
  es: faqEs,
  de: faqDe,
  fr: faqFr,
  it: faqIt,
  zh: faqZh,
  ar: faqAr,
  ja: faqJa,
};
