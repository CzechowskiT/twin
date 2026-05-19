"use client";

import { useTranslation } from "@/components/language-provider";
import { WAITLIST_MESSAGES, type WaitlistCopy } from "@/lib/waitlist-messages";
import { WAITLIST_NARRATIVE } from "@/lib/waitlist/waitlist-narrative";

/** Waitlist landing copy for the active app locale (all 9 locales). */
export function useWaitlistCopy(): WaitlistCopy {
  const { locale } = useTranslation();
  const base = WAITLIST_MESSAGES[locale];
  const narrative = WAITLIST_NARRATIVE[locale];
  return {
    ...base,
    ...narrative,
    faq: [...base.faq, ...narrative.faqExtra],
  };
}
