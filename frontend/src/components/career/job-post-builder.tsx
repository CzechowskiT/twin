"use client";

import { useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { ButtonChip, Card, Input, Label } from "@/components/ui";

export type JobPostDraft = {
  title: string;
  department: string;
  salaryMin: string;
  salaryMax: string;
  skills: string;
};

const emptyDraft = (): JobPostDraft => ({
  title: "",
  department: "",
  salaryMin: "",
  salaryMax: "",
  skills: "",
});

export function JobPostBuilder({
  onChange,
}: {
  onChange: (draft: JobPostDraft | null) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<JobPostDraft>(emptyDraft());

  function update<K extends keyof JobPostDraft>(key: K, value: JobPostDraft[K]) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onChange(next.title.trim() ? next : null);
  }

  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium">{t("careerDiscovery.jobPostTitle")}</h2>
      <p className="twin-muted mt-1 text-xs">{t("careerDiscovery.jobPostLead")}</p>
      <div className="mt-4 space-y-3">
        <div>
          <Label>{t("careerDiscovery.jobPostRoleTitle")}</Label>
          <Input value={draft.title} onChange={(e) => update("title", e.target.value)} />
        </div>
        <div>
          <Label>{t("careerDiscovery.jobPostDepartment")}</Label>
          <Input
            value={draft.department}
            onChange={(e) => update("department", e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("careerDiscovery.jobPostSalaryMin")}</Label>
            <Input
              value={draft.salaryMin}
              onChange={(e) => update("salaryMin", e.target.value)}
            />
          </div>
          <div>
            <Label>{t("careerDiscovery.jobPostSalaryMax")}</Label>
            <Input
              value={draft.salaryMax}
              onChange={(e) => update("salaryMax", e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>{t("careerDiscovery.jobPostSkills")}</Label>
          <Input value={draft.skills} onChange={(e) => update("skills", e.target.value)} />
        </div>
        <ButtonChip type="button">{t("careerDiscovery.jobPostSave")}</ButtonChip>
        {draft.title.trim() ? (
          <div className="rounded-lg border border-[var(--twin-border)] p-3 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--twin-muted-strong)]">
              {t("careerDiscovery.jobPostPreview")}
            </p>
            <p className="mt-2 font-semibold">{draft.title}</p>
            <p className="twin-muted text-xs">{draft.department}</p>
            <p className="twin-muted mt-2 text-xs">
              {draft.salaryMin}–{draft.salaryMax} PLN · {draft.skills}
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
