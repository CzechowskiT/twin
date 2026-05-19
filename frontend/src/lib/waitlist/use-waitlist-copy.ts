"use client";

import { useTranslation } from "@/components/language-provider";
import { WAITLIST_MESSAGES, type WaitlistCopy } from "@/lib/waitlist-messages";

/** Waitlist landing copy for the active app locale (all 9 locales). */
export function useWaitlistCopy(): WaitlistCopy {
  const { locale } = useTranslation();
  return WAITLIST_MESSAGES[locale];
}
