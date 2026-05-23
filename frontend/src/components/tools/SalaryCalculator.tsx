"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { useTranslation } from "@/components/language-provider";

function estimateNet(gross: number): number {
  return Math.round(gross * 0.72);
}

function estimateEmployerCost(gross: number): number {
  return Math.round(gross * 1.2);
}

export function SalaryCalculator({
  initialGross,
  jobMin,
  jobMax,
}: {
  initialGross?: number;
  jobMin?: number | null;
  jobMax?: number | null;
}) {
  const { t } = useTranslation();
  const seed = initialGross ?? jobMax ?? jobMin ?? 15000;
  const [gross, setGross] = useState(seed);

  const net = useMemo(() => estimateNet(gross), [gross]);
  const employer = useMemo(() => estimateEmployerCost(gross), [gross]);

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">{t("jobBoard.salaryCalculator")}</h3>
      <label className="mt-3 block text-xs twin-muted">
        {t("jobBoard.salaryGrossMonthly")}
        <input
          type="range"
          min={8000}
          max={40000}
          step={500}
          value={gross}
          onChange={(e) => setGross(Number(e.target.value))}
          className="mt-1 w-full accent-[var(--twin-accent)]"
        />
        <span className="mt-1 block text-sm font-medium text-[var(--twin-fg)]">
          {gross.toLocaleString()} PLN
        </span>
      </label>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="twin-muted text-xs">{t("jobBoard.salaryNetEstimate")}</dt>
          <dd className="font-medium">{net.toLocaleString()} PLN</dd>
        </div>
        <div>
          <dt className="twin-muted text-xs">{t("jobBoard.salaryEmployerCost")}</dt>
          <dd className="font-medium">{employer.toLocaleString()} PLN</dd>
        </div>
      </dl>
      <p className="twin-muted mt-2 text-[11px] leading-snug">{t("jobBoard.salaryHint")}</p>
    </Card>
  );
}
