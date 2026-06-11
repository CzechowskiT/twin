"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { WAITLIST_MESSAGES } from "@/lib/waitlist-messages";

function normalizePath(pathname: string): string {
  const raw = pathname.split("?")[0] ?? "/";
  if (raw === "/" || raw === "") return "/";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function titleKeyForPath(path: string): TranslationKey {
  if (path.startsWith("/calculator/b2b")) return "meta.titleCalculatorB2b";
  if (path.startsWith("/dashboard/billing")) return "meta.titleBilling";
  if (path.startsWith("/dashboard/identity")) return "meta.titleIdentity";
  if (path.startsWith("/recruiter/calendar")) return "meta.titleRecruiterCalendar";
  if (path.startsWith("/dashboard/calendar")) return "meta.titleDashboardCalendar";
  if (path.startsWith("/dashboard")) return "meta.titleDashboard";
  if (path.startsWith("/auth/callback")) return "meta.titleAuthCallback";
  if (path.startsWith("/consent/gdpr")) return "meta.titleGdprConsent";

  if (path.startsWith("/admin/beta")) return "meta.titleBetaAdmin";
  if (path.startsWith("/beta/dashboard")) return "meta.titleBetaDashboard";
  if (path.startsWith("/beta/join")) return "meta.titleBetaJoin";
  if (path.startsWith("/beta")) return "meta.titleBeta";

  const map: Record<string, TranslationKey> = {
    "/": "meta.titleHome",
    "/about": "meta.titleAbout",
    "/case-studies": "meta.titleCaseStudies",
    "/faq": "meta.titleFaq",
    "/partners": "meta.titlePartners",
    "/media": "meta.titleMedia",
    "/careers": "meta.titleCareers",
    "/contact": "meta.titleContact",
    "/calculator": "meta.titleCalculator",
    "/login": "meta.titleLogin",
    "/register": "meta.titleRegister",
    "/profile": "meta.titleProfile",
    "/privacy": "meta.titlePrivacy",
    "/terms": "meta.titleTerms",
    "/forgot-password": "meta.titleForgotPassword",
    "/reset-password": "meta.titleResetPassword",
    "/onboarding-assistant": "meta.titleOnboarding",
    "/for-candidates": "meta.titleForCandidates",
    "/for-recruiters": "meta.titleForRecruiters",
    "/for-companies": "meta.titleForCompanies",
    "/demo": "meta.titleDemo",
    "/investor": "meta.titleInvestorRoom",
    "/for-investors": "meta.titleForInvestors",
  };
  return map[path] ?? "meta.titleHome";
}

/** Keeps `document.title` aligned with locale and route (static layout metadata is EN-only for crawlers). */
export function DocumentTitleSync() {
  const pathname = usePathname();
  const { locale, t } = useTranslation();

  useEffect(() => {
    const path = normalizePath(pathname ?? "/");
    if (path.startsWith("/waitlist")) {
      document.title = WAITLIST_MESSAGES[locale].metaTitle;
      return;
    }
    document.title = t(titleKeyForPath(path));
  }, [pathname, locale, t]);

  return null;
}
