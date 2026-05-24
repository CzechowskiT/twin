"use client";

import { useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { ButtonChip, Card } from "@/components/ui";
import { generateInterviewPrep } from "@/lib/career/interview-prep-service";

export function InterviewPrepPanel({
  jobTitle,
  company,
}: {
  jobTitle: string;
  company: string;
}) {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<string[]>([]);
  const [star, setStar] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const result = await generateInterviewPrep(jobTitle, company);
      setQuestions(result.questions);
      setStar(result.star);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium">{t("careerDiscovery.interviewPrepTitle")}</h3>
      <p className="twin-muted mt-1 text-xs">{t("careerDiscovery.interviewPrepLead")}</p>
      <ButtonChip type="button" className="mt-3" disabled={busy} onClick={() => void run()}>
        {busy ? "…" : t("careerDiscovery.interviewPrepRun")}
      </ButtonChip>
      {questions.length ? (
        <div className="mt-3 text-sm">
          <p className="font-medium">{t("careerDiscovery.interviewQuestions")}</p>
          <ul className="twin-muted mt-1 list-inside list-disc text-xs">
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <p className="mt-2 font-medium">{t("careerDiscovery.interviewStar")}</p>
          <ul className="twin-muted mt-1 list-inside list-disc text-xs">
            {star.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
