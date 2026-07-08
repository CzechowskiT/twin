"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";

type PremiumPreviewSurfaceProps = {
  variant: "candidate" | "company";
  className?: string;
};

/** Honest Premium Preview — waitlist/contact only, no checkout impression. */
export function PremiumPreviewSurface({ variant, className }: PremiumPreviewSurfaceProps) {
  const { t } = useTranslation();
  const titleKey = variant === "company" ? "productPolish.premiumPreviewCompanyTitle" : "productPolish.premiumPreviewTitle";
  const leadKey = variant === "company" ? "productPolish.premiumPreviewCompanyLead" : "productPolish.premiumPreviewLead";

  return (
    <aside
      className={`rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 sm:p-6 ${className ?? ""}`}
      data-premium-preview={variant}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-200/90">
          {t("productPolish.premiumPreviewEyebrow")}
        </p>
        <WorkspaceStatusBadge status="preview" />
      </div>
      <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">{t(titleKey)}</h2>
      <p className="twin-muted mt-2 max-w-2xl text-sm leading-relaxed">{t(leadKey)}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/waitlist" className="twin-btn-primary twin-touch-target inline-flex !w-auto">
          {t("productPolish.premiumPreviewWaitlistCta")}
        </Link>
        <Link href="/contact" className="twin-btn-secondary twin-touch-target inline-flex !w-auto">
          {t("productPolish.premiumPreviewContactCta")}
        </Link>
      </div>
    </aside>
  );
}
