"use client";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";

export const COMPANY_FEEDBACK_ROUTE = "/company/feedback";
export const COMPANY_FEEDBACK_MARKERS = {
  header: "company-feedback-header",
  list: "company-feedback-list",
  draftForm: "company-feedback-draft-form",
  reviewStatus: "company-feedback-review-status",
  visibilityBoundary: "company-feedback-visibility-boundary",
  auditTrail: "company-feedback-audit-trail",
  boundary: "company-feedback-boundary",
} as const;

export function CompanyFeedbackWorkspace() {
  const { t } = useTranslation();
  return (
    <Shell wide>
      <div data-company-feedback-page="company-feedback-page" className="mx-auto max-w-4xl space-y-4">
        <header data-testid={COMPANY_FEEDBACK_MARKERS.header}><h1 className="twin-section-title text-2xl">{t("companyFeedback.pageTitle")}</h1></header>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.list}><p className="text-xs">{t("companyFeedback.listLead")}</p></Card>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.draftForm}><p className="text-xs">{t("companyFeedback.draftLead")}</p></Card>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.reviewStatus}><p className="text-xs">{t("companyFeedback.reviewLead")}</p></Card>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.visibilityBoundary}><p className="text-xs">{t("companyFeedback.visibilityLead")}</p></Card>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.auditTrail}><p className="text-xs">{t("companyFeedback.auditLead")}</p></Card>
        <Card className="p-4" data-testid={COMPANY_FEEDBACK_MARKERS.boundary}><p className="text-xs">{t("companyFeedback.boundaryLead")}</p></Card>
      </div>
    </Shell>
  );
}
