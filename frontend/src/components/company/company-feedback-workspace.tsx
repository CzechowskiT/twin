"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import {
  COMPANY_FEEDBACK_MARKERS,
  COMPANY_FEEDBACK_ROUTE,
  loadCompanyFeedback,
  resolveCompanyFeedback,
  type CompanyFeedbackRow,
  type SafePersistenceSource,
} from "@/lib/company-feedback";

export { COMPANY_FEEDBACK_ROUTE, COMPANY_FEEDBACK_MARKERS };

export function CompanyFeedbackWorkspace() {
  const { t } = useTranslation();
  const [record, setRecord] = useState(() => resolveCompanyFeedback());
  const [source, setSource] = useState<SafePersistenceSource>("demo");

  useEffect(() => {
    let active = true;
    void loadCompanyFeedback().then((res) => {
      if (!active) return;
      setRecord(res.record);
      setSource(res.source);
    });
    return () => {
      active = false;
    };
  }, []);

  const sourceKey = source === "live" ? "safePersistence.liveApi" : "safePersistence.demoFallback";

  return (
    <Shell wide>
      <div data-company-feedback-page="company-feedback-page" className="mx-auto max-w-4xl space-y-4">
        <header data-testid={COMPANY_FEEDBACK_MARKERS.header}>
          <h1 className="twin-section-title text-2xl">{t("companyFeedback.pageTitle")}</h1>
          <p className="text-xs text-[var(--twin-muted)]" data-testid="company-feedback-data-source">
            {t(sourceKey)}
          </p>
        </header>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.list}>
          <p className="mb-2 text-xs">{t("companyFeedback.listLead")}</p>
          <ul className="space-y-1 text-xs">
            {record.items.map((row: CompanyFeedbackRow) => (
              <li key={row.id} className="rounded border px-2 py-1">
                {row.candidate_ref} · {row.role_ref} · {row.status}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.draftForm}>
          <p className="text-xs">{t("companyFeedback.draftLead")}</p>
          <p className="mt-1 text-[10px] text-[var(--twin-muted)]">{t("companyFeedback.draftInternalNote")}</p>
        </Card>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.reviewStatus}>
          <p className="text-xs">{t("companyFeedback.reviewLead")}</p>
        </Card>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.visibilityBoundary}>
          <p className="text-xs">{t("companyFeedback.visibilityLead")}</p>
        </Card>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.auditTrail}>
          <p className="text-xs">{t("companyFeedback.auditLead")}</p>
        </Card>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.boundary}>
          <p className="text-xs">{t("companyFeedback.boundaryLead")}</p>
        </Card>
      </div>
    </Shell>
  );
}
