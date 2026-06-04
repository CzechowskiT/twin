"use client";

import { useTranslation } from "@/components/language-provider";
import { ComparisonTwinPage } from "@/components/marketing/comparison-page";

export default function CompareMoonhubPage() {
  const { t } = useTranslation();
  return (
    <ComparisonTwinPage
      title={t("compare.moonhubTitle")}
      competitorLabel={t("compare.moonhubCompetitorLabel")}
      lead={t("compare.moonhubLead")}
      competitorBullets={[
        t("compare.moonhubCompetitor1"),
        t("compare.moonhubCompetitor2"),
        t("compare.moonhubCompetitor3"),
      ]}
      twinBullets={[t("compare.moonhubTwin1"), t("compare.moonhubTwin2"), t("compare.moonhubTwin3")]}
    />
  );
}
