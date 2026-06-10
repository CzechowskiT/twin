/** Collect rendered homepage + waitlist copy for locale guard tests. */
import type { Locale } from "@/lib/i18n";
import { dictionaries, en } from "@/lib/i18n";
import { WAITLIST_MESSAGES } from "@/lib/waitlist-messages";
import { WAITLIST_NARRATIVE } from "@/lib/waitlist/waitlist-narrative";

/** home.* keys rendered on `/` (marketing page.tsx). */
export const RENDERED_HOME_KEYS = [
  "curiosityEyebrow",
  "tagline",
  "title",
  "heroHook",
  "description",
  "getStarted",
  "ctaRegisterMicro",
  "ctaDemoSecondary",
  "ctaDemoCardSubtitle",
  "ctaDemoCardLead",
  "logInPrompt",
  "logIn",
  "liveCounter",
  "liveCounterUnavailable",
  "socialProofJoin",
  "socialProofQuote",
  "teaserEyebrow",
  "teaserTitle",
  "teaserUnlock",
  "teaserCard1Title",
  "teaserCard1Meta",
  "teaserCard2Title",
  "teaserCard2Meta",
  "teaserCard3Title",
  "teaserCard3Meta",
  "insideEyebrow",
  "insideTitle",
  "insideStep1Title",
  "insideStep1Line",
  "insideStep2Title",
  "insideStep2Line",
  "insideStep3Title",
  "insideStep3Line",
  "stickyCtaLabel",
  "stickyCtaMicro",
  "joinWishlist",
  "joinWishlistMicro",
  "foundingCounterAria",
  "foundingCounterEyebrow",
  "foundingCounterOf",
  "foundingCounterLoading",
  "foundingCounterLive",
  "foundingCounterOffline",
  "ctaBandWishlistEyebrow",
  "ctaBandWishlistTitle",
  "ctaBandWishlistMicro",
  "scrape",
  "scrapeDesc",
  "match",
  "matchDesc",
  "track",
  "trackDesc",
  "featuresTitle",
  "featuresSubtitle",
  "footerHint",
  "howEyebrow",
  "howTitle",
  "howDetailLink",
  "howStep1Title",
  "howStep1Line",
  "howStep2Title",
  "howStep2Line",
  "howStep3Title",
  "howStep3Line",
  "howStep4Title",
  "howStep4Line",
  "statsAria",
  "statJobs",
  "statUsers",
  "statApps",
  "statBoards",
  "featureGridTitle",
  "feature1Title",
  "feature1Line",
  "feature2Title",
  "feature2Line",
  "feature3Title",
  "feature3Line",
  "feature4Title",
  "feature4Line",
  "feature5Title",
  "feature5Line",
  "feature6Title",
  "feature6Line",
  "socialProofEyebrow",
  "faqEyebrow",
  "faqTitle",
  "faqPrivacyLink",
] as const;

/** faq.* keys on homepage FAQ teaser. */
export const RENDERED_FAQ_KEYS = [
  "homeTeaserLead",
  "homeCta",
  "homeCtaHint",
  "sectionGeneral",
  "sectionCandidates",
  "sectionRecruiters",
  "sectionCompanies",
  "sectionInvestors",
  "general01Q",
  "general01A",
  "general02Q",
  "general02A",
  "general03Q",
  "general03A",
] as const;

/** Founder-reported English phrases that must not appear on localized home/waitlist. */
export const ENGLISH_LEAK_PHRASES = [
  "See what's inside",
  "SEE WHAT'S INSIDE",
  "Founding cohort",
  "FOUNDING COHORT",
  "Join founding wishlist",
  "JOIN FOUNDING WISHLIST",
  "Founding spots left",
  "What you get inside",
  "Join the founding wishlist",
  "First 1,000 · founding cohort benefits",
  "Founding thousand",
  "Live waitlist data",
  "Loading live count",
  "Built for momentum, not tab chaos",
  "Your pipeline can work while you sleep",
  "Earn on outcomes",
  "We pay you for landing",
  "roles scanned on enabled boards",
  "Trigger",
  "When paid",
  "Finally one pipeline instead of twenty tabs",
  "Validated jobs",
  "Questions & answers",
] as const;

/** Expected localized markers (ES / DE smoke). */
export const ES_EXPECTED_MARKERS = [
  "Mira qué hay dentro",
  "Únete a la lista fundadora",
  "roles escaneados",
  "Gana por resultados",
  "Disparador",
] as const;

export const DE_EXPECTED_MARKERS = [
  "Sieh dir an, was drin ist",
  "Zur Gründerliste anmelden",
  "Rollen auf aktivierten Börsen gescannt",
  "Verdiene an Ergebnissen",
  "Belohnung",
] as const;

function flattenWaitlistCopy(locale: Locale): string {
  const base = WAITLIST_MESSAGES[locale];
  const narrative = WAITLIST_NARRATIVE[locale];
  const merged = { ...base, ...narrative, faq: [...base.faq, ...narrative.faqExtra] };
  const chunks: string[] = [];
  for (const value of Object.values(merged)) {
    if (typeof value === "string") chunks.push(value);
    else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") chunks.push(item);
        else if (item && typeof item === "object") chunks.push(JSON.stringify(item));
      }
    }
  }
  return chunks.join("\n");
}

/** All user-visible strings from `/` and `/waitlist` for a locale. */
export function collectRenderedHomepageCopy(locale: Locale): string {
  const dict = dictionaries[locale];
  const parts: string[] = [];

  for (const key of RENDERED_HOME_KEYS) {
    parts.push(dict.home[key as keyof typeof en.home]);
  }
  for (const key of Object.keys(dict.candidateRewards)) {
    parts.push(dict.candidateRewards[key as keyof typeof dict.candidateRewards]);
  }
  for (const key of RENDERED_FAQ_KEYS) {
    parts.push(dict.faq[key as keyof typeof dict.faq]);
  }
  parts.push(flattenWaitlistCopy(locale));

  return parts.filter(Boolean).join("\n");
}
