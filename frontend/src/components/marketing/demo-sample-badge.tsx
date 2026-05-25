"use client";

import { useTranslation } from "@/components/language-provider";

type DemoSampleBadgeProps = {
  className?: string;
};

/** High-contrast pill for demo / sample / walkthrough surfaces (marketing + dashboard). */
export function DemoSampleBadge({ className = "" }: DemoSampleBadgeProps) {
  const { t } = useTranslation();
  const extra = className.trim();
  return (
    <span
      className={extra ? `demo-sample-badge ${extra}` : "demo-sample-badge"}
      role="status"
    >
      {t("demo.syntheticBadge")}
    </span>
  );
}
