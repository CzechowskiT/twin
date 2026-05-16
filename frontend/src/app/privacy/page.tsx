"use client";

import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <Shell>
      <article className="twin-prose max-w-none">
        <h1>{t("privacy.title")}</h1>
        <p className="twin-muted text-sm">{t("privacy.updated")}</p>
        <h2>{t("privacy.collectTitle")}</h2>
        <ul>
          <li>{t("privacy.collect1")}</li>
          <li>{t("privacy.collect2")}</li>
          <li>{t("privacy.collect3")}</li>
        </ul>
        <h2>{t("privacy.whyTitle")}</h2>
        <p>{t("privacy.whyBody")}</p>
        <h2>{t("privacy.rightsTitle")}</h2>
        <p>{t("privacy.rightsBody")}</p>
        <h2>{t("privacy.retentionTitle")}</h2>
        <p>{t("privacy.retentionBody")}</p>
        <h2>{t("privacy.thirdTitle")}</h2>
        <p>{t("privacy.thirdBody")}</p>
      </article>
    </Shell>
  );
}
