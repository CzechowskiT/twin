"use client";

import { useTranslation } from "@/components/language-provider";
import { ComparisonTwinPage } from "@/components/marketing/comparison-page";

export default function CompareDoverPage() {
  const { t } = useTranslation();
  return (
    <ComparisonTwinPage
      title={t("compare.doverTitle")}
      competitorLabel={t("compare.doverCompetitorLabel")}
      lead={t("compare.doverLead")}
      competitorBullets={[
        t("compare.doverCompetitor1"),
        t("compare.doverCompetitor2"),
        t("compare.doverCompetitor3"),
      ]}
      twinBullets={[t("compare.doverTwin1"), t("compare.doverTwin2"), t("compare.doverTwin3")]}
    />
  );
}
