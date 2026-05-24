"use client";

import { useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { ButtonChip, Card } from "@/components/ui";
import { analyzeCvForJob } from "@/lib/career/cv-analyzer-service";

export function CvAnalyzerPanel({
  cvText,
  jobTitle,
}: {
  cvText: string | null | undefined;
  jobTitle: string;
}) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState("");
  const [gaps, setGaps] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!cvText?.trim()) return;
    setBusy(true);
    try {
      const result = await analyzeCvForJob(cvText, jobTitle);
      setSummary(result.summary);
      setGaps(result.gaps);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium">{t("careerDiscovery.cvAnalyzerTitle")}</h3>
      <p className="twin-muted mt-1 text-xs">{t("careerDiscovery.cvAnalyzerLead")}</p>
      {!cvText?.trim() ? (
        <p className="twin-muted mt-3 text-sm">{t("careerDiscovery.cvAnalyzerEmpty")}</p>
      ) : (
        <>
          <ButtonChip type="button" className="mt-3" disabled={busy} onClick={() => void run()}>
            {busy ? "…" : t("careerDiscovery.cvAnalyzerRun")}
          </ButtonChip>
          {summary ? (
            <div className="mt-3 text-sm">
              <p className="font-medium">{t("careerDiscovery.cvAnalyzerSummary")}</p>
              <p className="twin-muted mt-1">{summary}</p>
              {gaps.length ? (
                <>
                  <p className="mt-2 font-medium">{t("careerDiscovery.cvAnalyzerGaps")}</p>
                  <ul className="twin-muted mt-1 list-inside list-disc text-xs">
                    {gaps.map((gap) => (
                      <li key={gap}>{gap}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
