"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { COMPANY_TALENT_POOL_MARKERS, companyTalentPoolRadarHrefIsRoleAware } from "@/lib/company-talent-pool";

type CompanyTalentPoolRadarCtaProps = {
  radarHref: string;
  recruiterPoolHref: string;
  className?: string;
};

/** Role-aware radar CTA — company lane defaults to ask recruiter; no cross-role access implied. */
export function CompanyTalentPoolRadarCta({
  radarHref,
  recruiterPoolHref,
  className = "text-xs",
}: CompanyTalentPoolRadarCtaProps) {
  const { t } = useTranslation();
  const roleAware = companyTalentPoolRadarHrefIsRoleAware(radarHref);

  if (roleAware) {
    return (
      <span className={`inline-flex flex-col items-start gap-0.5 ${className}`}>
        <Link
          href={radarHref}
          className="twin-link font-medium"
          data-testid={COMPANY_TALENT_POOL_MARKERS.radarLink}
        >
          {t("companyTalentPool.openRecruiterRadar")}
        </Link>
        <span className="twin-muted text-[10px] leading-snug">{t("companyTalentPool.openRecruiterRadarHint")}</span>
      </span>
    );
  }

  return (
    <Link href={recruiterPoolHref} className={`twin-link font-medium ${className}`}>
      {t("companyTalentPool.askRecruiterReview")}
    </Link>
  );
}
