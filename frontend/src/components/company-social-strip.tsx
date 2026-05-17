"use client";

import { SocialIconRow } from "@/components/social-icon-row";
import { useTranslation } from "@/components/language-provider";

/**
 * Primary company social row (footer). URLs from `NEXT_PUBLIC_SOCIAL_*` env vars.
 * X and Twitter can point to different properties if you still maintain both.
 */
export function CompanySocialStrip() {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-card)]/60 px-5 py-5 sm:px-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">{t("site.footerFollowTitle")}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted)]">{t("site.footerFollowLead")}</p>
      <div className="mt-4">
        <SocialIconRow variant="footer" inline className="justify-center sm:justify-start" />
      </div>
    </div>
  );
}
