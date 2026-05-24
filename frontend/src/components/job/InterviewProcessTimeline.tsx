"use client";

import { useTranslation } from "@/components/language-provider";

export function InterviewProcessTimeline({
  stages,
}: {
  stages: { stage: string; label: string; duration?: string | null }[];
}) {
  const { t } = useTranslation();
  if (!stages.length) return null;
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wide">{t("jobBoard.interviewProcess")}</h4>
      <ol className="mt-2 space-y-2 border-l border-[var(--twin-border)] pl-3">
        {stages.map((step, idx) => (
          <li key={`${step.stage}-${idx}`} className="relative text-sm">
            <span className="absolute -left-[calc(0.75rem+5px)] top-1.5 h-2 w-2 rounded-full bg-[var(--twin-accent)]" />
            <p className="font-medium">{step.label}</p>
            {step.duration ? <p className="twin-muted text-xs">{step.duration}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
