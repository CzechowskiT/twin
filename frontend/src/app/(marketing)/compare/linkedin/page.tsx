"use client";

import { useTranslation } from "@/components/language-provider";
import { ComparisonTwinPage } from "@/components/marketing/comparison-page";

export default function CompareLinkedInPage() {
  const { t } = useTranslation();
  return (
    <ComparisonTwinPage
      title={t("compare.linkedinTitle")}
      competitorLabel={t("compare.linkedinCompetitorLabel")}
      lead={t("compare.linkedinLead")}
      competitorBullets={[
        t("compare.linkedinCompetitor1"),
        t("compare.linkedinCompetitor2"),
        t("compare.linkedinCompetitor3"),
      ]}
      twinBullets={[t("compare.linkedinTwin1"), t("compare.linkedinTwin2"), t("compare.linkedinTwin3")]}
    />
  );
}
