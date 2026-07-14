"use client";

import { useTranslation } from "@/components/language-provider";

const PROOF_ITEMS = [
  { valueKey: "proofCalendarValue", labelKey: "proofCalendarLabel" },
  { valueKey: "proofMatchValue", labelKey: "proofMatchLabel" },
  { valueKey: "proofHumanValue", labelKey: "proofHumanLabel" },
] as const;

export function ProofSection() {
  const { t } = useTranslation();
  return (
    <section className="demo-proof-section space-y-4" data-demo-proof>
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-[var(--twin-fg)] sm:text-xl">{t("demoExperience.proofHeading")}</h2>
        <p className="text-sm text-[var(--twin-muted-strong)]">{t("demoExperience.proofLead")}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {PROOF_ITEMS.map((item) => (
          <div
            key={item.valueKey}
            className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-elevated)] p-4"
          >
            <p className="text-2xl font-bold text-[var(--twin-accent)]">{t(`demoExperience.${item.valueKey}`)}</p>
            <p className="mt-1 text-sm text-[var(--twin-muted-strong)]">{t(`demoExperience.${item.labelKey}`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
