"use client";

import { useTranslation } from "@/components/language-provider";
import { RoleCta } from "@/components/marketing/demo/experience/role-cta";
import type { DemoRole } from "@/lib/demo/demo-scene-manifest";
import type { TranslationKey } from "@/lib/i18n";

type OutcomeScreenProps = {
  role: DemoRole;
  visible: boolean;
};

function outcomeKey(role: DemoRole, field: "Title" | "Lead"): TranslationKey {
  return `demoExperience.outcome${field}_${role}` as TranslationKey;
}

export function OutcomeScreen({ role, visible }: OutcomeScreenProps) {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <div
      className="demo-outcome-screen rounded-xl border border-[var(--twin-accent)]/30 bg-[var(--twin-accent-muted)]/10 p-4 sm:p-5"
      data-demo-outcome
      data-role={role}
      role="status"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
        {t("demoExperience.outcomeEyebrow")}
      </p>
      <h3 className="mt-1 text-base font-semibold text-[var(--twin-fg)] sm:text-lg">
        {t(outcomeKey(role, "Title"))}
      </h3>
      <p className="mt-2 text-sm text-[var(--twin-muted-strong)]">{t(outcomeKey(role, "Lead"))}</p>
      <p className="mt-3 text-xs text-[var(--twin-muted)]">{t("demoExperience.boundaryNote")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <RoleCta role={role} />
        {role === "overview" ? (
          <>
            <RoleCta role="candidate" />
            <RoleCta role="recruiter" />
            <RoleCta role="company" />
          </>
        ) : null}
      </div>
    </div>
  );
}
