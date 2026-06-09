import type { Locale } from "../src/lib/i18n";
import { dictionaries, en } from "../src/lib/i18n";
import { WAITLIST_MESSAGES } from "../src/lib/waitlist-messages";
import { WAITLIST_NARRATIVE } from "../src/lib/waitlist/waitlist-narrative";

export const NON_EN_LOCALES: Locale[] = ["pl", "es", "it", "fr", "de", "zh", "ar", "ja"];

export const RENDERED_HOME_KEYS = [
  "home.curiosityEyebrow",
  "home.title",
  "home.heroHook",
  "home.description",
  "home.joinWishlist",
  "home.joinWishlistMicro",
  "home.insideEyebrow",
  "home.insideTitle",
  "home.insideStep1Title",
  "home.insideStep1Line",
  "home.insideStep2Title",
  "home.insideStep2Line",
  "home.insideStep3Title",
  "home.insideStep3Line",
  "home.stickyCtaLabel",
  "home.ctaBandWishlistTitle",
  "home.ctaBandWishlistMicro",
  "home.ctaDemoSecondary",
  "home.getStarted",
  "home.howTitle",
  "home.featureGridTitle",
  "home.feature6Title",
] as const;

export const RENDERED_LOGIN_HUB_KEYS = [
  "login.hubTitle",
  "login.hubLead",
  "register.hubTitle",
  "register.hubLead",
  "register.hubCuriosity",
  "register.hubBenefit",
  "register.hubMicro",
] as const;

export const RENDERED_DEMO_KEYS = [
  "demo.ctaWishlist",
  "demo.ctaFounding",
  "demo.signUpToApply",
  "demo.modeGuestBody",
  "demo.step8Lead",
  "interactiveDemo.step8Lead",
  "interactiveDemo.simulationLabel",
] as const;

/** Waitlist fields rendered on `/waitlist` (dead legacy fields excluded). */
export const RENDERED_WAITLIST_MESSAGE_KEYS = [
  "metaTitle",
  "metaDescription",
  "heroHeadline",
  "heroLead1",
  "heroLead2",
  "heroLead3",
  "metricSpots",
  "finalTitle",
  "finalLead",
  "formSubmit",
  "formBullet1",
  "boostRewards",
] as const;

export const RENDERED_WAITLIST_NARRATIVE_KEYS = [
  "heroEyebrow",
  "heroOfferBadge",
  "heroOfferSub",
  "valueStrip",
  "counterEyebrow",
  "foundingHeadline",
  "foundingSub",
  "sectionFounding",
  "how8Lead",
] as const;

/** Documented allowlist — product names and acronyms only. */
export const ALLOWLIST_TOKEN = /^(TWIN|B2B|ROI|Demo|FAQ|GDPR|OAuth|API|PDF|ICS|WebCal|LinkedIn|Google|Microsoft|Greenhouse|final_score)$/i;

export type ForbiddenRule = { pattern: RegExp; label: string };

/** English marketing leakage banned on es–ja rendered surfaces. PL may keep founding loanwords. */
export const FORBIDDEN_EN_MARKETING: ForbiddenRule[] = [
  { pattern: /\bwishlist\b/i, label: "wishlist" },
  { pattern: /\bfounding\b/i, label: "founding" },
  { pattern: /\bearly access\b/i, label: "early access" },
  { pattern: /See what'?s inside/i, label: "See what's inside" },
  { pattern: /Join founding wishlist/i, label: "Join founding wishlist" },
  { pattern: /Founding-Wishlist/i, label: "Founding-Wishlist" },
  { pattern: /What you get inside/i, label: "What you get inside" },
];

export const EXACT_BAD_EXAMPLES: Partial<Record<Locale, (string | RegExp)[]>> = {
  es: ["See what's inside", "Join founding wishlist", "Join wishlist", /\bwishlist\b/i, /\bfounding\b/i],
  de: ["Founding-Wishlist", "Early Access", "See what's inside", "Join founding wishlist"],
  fr: ["Wishlist →", "founding queue", "early access gratuit"],
  it: ["wishlist founding", "early access gratuito"],
  zh: ["founding 候补", "Wishlist"],
  ja: ["founding ウェイトリスト", "Wishlist"],
  ar: ["Wishlist", "founding"],
};

export function matchesExactBadExample(value: string, bad: string | RegExp): boolean {
  return typeof bad === "string" ? value.includes(bad) : bad.test(value);
}

/** Distinctive strings that must not leak across locales. */
export const LOCALE_SIGNATURES: Partial<Record<Locale, RegExp[]>> = {
  es: [/Únete a la lista fundadora/i, /Mira qué hay dentro/i],
  de: [/Zur Gründerliste anmelden/i, /Gründerkohorte — kostenloser früher Zugang/i],
  fr: [/Rejoindre la liste des fondateurs/i, /Liste des fondateurs · 1 000 premiers/i],
};

export function getString(obj: unknown, path: string): string | undefined {
  let current: unknown = obj;
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function collectRenderedHomeStrings(locale: Locale): { key: string; value: string }[] {
  const dict = dictionaries[locale];
  return RENDERED_HOME_KEYS.map((key) => ({ key, value: getString(dict, key) ?? "" }));
}

export function collectRenderedHubStrings(locale: Locale): { key: string; value: string }[] {
  const dict = dictionaries[locale];
  return RENDERED_LOGIN_HUB_KEYS.map((key) => ({ key, value: getString(dict, key) ?? "" }));
}

export function collectRenderedDemoStrings(locale: Locale): { key: string; value: string }[] {
  const dict = dictionaries[locale];
  return RENDERED_DEMO_KEYS.map((key) => ({ key, value: getString(dict, key) ?? "" }));
}

export function collectWaitlistStrings(locale: Locale): { key: string; value: string }[] {
  const base = WAITLIST_MESSAGES[locale];
  const narrative = WAITLIST_NARRATIVE[locale];
  const rows: { key: string; value: string }[] = [];
  for (const key of RENDERED_WAITLIST_MESSAGE_KEYS) {
    const value = base[key as keyof typeof base];
    if (typeof value === "string") rows.push({ key: `waitlist.${key}`, value });
  }
  for (const key of RENDERED_WAITLIST_NARRATIVE_KEYS) {
    const value = narrative[key as keyof typeof narrative];
    if (typeof value === "string") rows.push({ key: `narrative.${key}`, value });
    if (key === "valueStrip" && Array.isArray(value)) {
      for (const line of value as string[]) rows.push({ key: "narrative.valueStrip", value: line });
    }
  }
  return rows;
}

export function forbiddenHits(value: string, locale: Locale): string[] {
  if (locale === "en") return [];
  if (locale === "pl") {
    return FORBIDDEN_EN_MARKETING.filter(
      (rule) =>
        rule.label !== "founding" &&
        rule.label !== "wishlist" &&
        rule.pattern.test(value),
    ).map((r) => r.label);
  }
  return FORBIDDEN_EN_MARKETING.filter((rule) => rule.pattern.test(value)).map((r) => r.label);
}

export function equalsEnglish(path: string, locale: Locale): boolean {
  const enValue = getString(en, path);
  const localeValue = getString(dictionaries[locale], path);
  return Boolean(enValue && localeValue && enValue === localeValue);
}
