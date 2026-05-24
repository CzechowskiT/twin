"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { Button, Card } from "@/components/ui";

type PaywallMeta = {
  feature: string;
  required_tier: string;
  upgrade_path: string;
};

export function FeaturePaywall({
  paywall,
  titleKey = "strategic.paywallTitle",
  bodyKey = "strategic.paywallBody",
}: {
  paywall: PaywallMeta | null | undefined;
  titleKey?: TranslationKey;
  bodyKey?: TranslationKey;
}) {
  const { t } = useTranslation();
  if (!paywall) return null;
  const tierLabel = paywall.required_tier.toUpperCase();
  return (
    <Card className="border-[var(--twin-accent)]/30 bg-[var(--twin-accent-muted)]/20 p-4">
      <p className="text-sm font-semibold text-[var(--foreground)]">{t(titleKey)}</p>
      <p className="twin-muted mt-1 text-sm">{t(bodyKey).replace("{tier}", tierLabel)}</p>
      <Link href={paywall.upgrade_path || "/dashboard/billing"} className="mt-3 inline-block">
        <Button className="!w-auto">{t("strategic.upgradeCta")}</Button>
      </Link>
    </Card>
  );
}
