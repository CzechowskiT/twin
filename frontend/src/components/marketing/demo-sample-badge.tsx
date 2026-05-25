"use client";

import { useTranslation } from "@/components/language-provider";

type DemoSampleBadgeVariant = "default" | "hero";

type DemoSampleBadgeProps = {
  className?: string;
  /** Hero: larger standalone pill on /demo and other primary headings. */
  variant?: DemoSampleBadgeVariant;
};

/** High-contrast pill for demo / sample / walkthrough surfaces (marketing + dashboard). */
export function DemoSampleBadge({ className = "", variant = "default" }: DemoSampleBadgeProps) {
  const { t } = useTranslation();
  const extra = className.trim();
  const base =
    variant === "hero" ? "demo-sample-badge demo-sample-badge--hero" : "demo-sample-badge";
  const classes = extra ? `${base} ${extra}` : base;
  return (
    <span className={classes} role="status">
      {t("demo.syntheticBadge")}
    </span>
  );
}
