"use client";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { CANDIDATE_ROLE_STATUS_MARKERS, CANDIDATE_ROLE_STATUS_PAGE_MARKER, SAFE_STATUSES } from "@/lib/candidate-role-status";

export function CandidateRoleStatusWorkspace({ readOnly = false }: { readOnly?: boolean }) {
  const { t } = useTranslation();
  return (
    <Shell wide>
      <div data-candidate-role-status-page={CANDIDATE_ROLE_STATUS_PAGE_MARKER} data-read-only={readOnly} className="mx-auto max-w-4xl space-y-4">
        <header data-testid={CANDIDATE_ROLE_STATUS_MARKERS.header}>
          <h1 className="twin-section-title text-2xl">{t("candidateRoleStatus.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("candidateRoleStatus.headerLead")}</p>
        </header>
        <Card variant="soft" className="p-4" data-testid={CANDIDATE_ROLE_STATUS_MARKERS.board}>
          <ul className="text-xs">{SAFE_STATUSES.map((s) => <li key={s}>{s}</li>)}</ul>
        </Card>
        <Card variant="soft" className="p-4" data-testid={CANDIDATE_ROLE_STATUS_MARKERS.boundary}>
          <p className="text-xs">{t("candidateRoleStatus.boundaryLead")}</p>
        </Card>
      </div>
    </Shell>
  );
}
