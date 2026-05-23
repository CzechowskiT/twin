"use client";

import { useTranslation } from "@/components/language-provider";

export function RequirementsSplit({
  mustHave,
  niceToHave,
}: {
  mustHave: string[];
  niceToHave: string[];
}) {
  const { t } = useTranslation();
  if (!mustHave.length && !niceToHave.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {mustHave.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--twin-accent)]">
            {t("jobBoard.mustHave")}
          </h4>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
            {mustHave.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      {niceToHave.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide twin-muted">{t("jobBoard.niceToHave")}</h4>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm twin-muted">
            {niceToHave.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
