"use client";

import { useTranslation } from "@/components/language-provider";
import { ComparisonTwinPage } from "@/components/marketing/comparison-page";

export default function CompareAgenciesPage() {
  const { t } = useTranslation();
  return (
    <ComparisonTwinPage
      title={t("compare.agenciesTitle")}
      competitorLabel={t("compare.agenciesCompetitorLabel")}
      lead={t("compare.agenciesLead")}
      competitorBullets={[
        t("compare.agenciesCompetitor1"),
        t("compare.agenciesCompetitor2"),
        t("compare.agenciesCompetitor3"),
      ]}
      twinBullets={[t("compare.agenciesTwin1"), t("compare.agenciesTwin2"), t("compare.agenciesTwin3")]}
    />
  );
}
