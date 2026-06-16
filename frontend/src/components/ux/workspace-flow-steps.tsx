"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";

export type WorkspaceFlowStepId = "dashboard" | "profile" | "matches" | "actions";

type StepDef = {
  id: WorkspaceFlowStepId;
  href: string;
  labelKey: TranslationKey;
};

const STEPS: StepDef[] = [
  { id: "dashboard", href: "/dashboard", labelKey: "ux.flowStepDashboard" },
  { id: "profile", href: "/profile", labelKey: "ux.flowStepProfile" },
  { id: "matches", href: "/dashboard/matches", labelKey: "ux.flowStepMatches" },
  { id: "actions", href: "/dashboard#dashboard-applications", labelKey: "ux.flowStepActions" },
];

type WorkspaceFlowStepsProps = {
  current: WorkspaceFlowStepId;
  className?: string;
};

/** Linear workspace breadcrumb: dashboard → profile → matches → applications. */
export function WorkspaceFlowSteps({ current, className = "" }: WorkspaceFlowStepsProps) {
  const { t } = useTranslation();

  return (
    <nav
      className={`flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--twin-muted-strong)] ${className}`.trim()}
      aria-label={t("ux.flowNavAria")}
    >
      {STEPS.map((step, index) => {
        const isCurrent = step.id === current;
        return (
          <span key={step.id} className="inline-flex min-w-0 items-center gap-2">
            {index > 0 ? <span aria-hidden className="text-[var(--twin-muted)]">/</span> : null}
            {isCurrent ? (
              <span className="font-semibold text-[var(--foreground)]" aria-current="step">
                {t(step.labelKey)}
              </span>
            ) : (
              <Link href={step.href} className="twin-link whitespace-nowrap font-medium">
                {t(step.labelKey)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
