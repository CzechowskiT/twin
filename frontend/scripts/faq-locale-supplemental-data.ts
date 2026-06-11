import { supplementalAr } from "./faq-data/ar";
import { supplementalDe } from "./faq-data/de";
import { supplementalEs } from "./faq-data/es";
import { supplementalFr } from "./faq-data/fr";
import { supplementalIt } from "./faq-data/it";
import { supplementalJa } from "./faq-data/ja";
import { supplementalZh } from "./faq-data/zh";

export const FAQ_LOCALE_SUPPLEMENTAL: Record<string, Record<string, string>> = {
  es: supplementalEs,
  de: supplementalDe,
  fr: supplementalFr,
  it: supplementalIt,
  zh: supplementalZh,
  ar: supplementalAr,
  ja: supplementalJa,
};
