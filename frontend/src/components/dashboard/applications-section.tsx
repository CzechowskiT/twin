"use client";

import {
  ApplicationsPanel,
  type ApplicationRow,
  type FeedbackBusy,
  type PlacementEventRow,
  type PlacementFlowBusy,
} from "@/components/applications-panel";
import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";

type Props = {
  applications: ApplicationRow[];
  applicationsTotal: number;
  applicationsCsvBusy: boolean;
  applicationsXlsxBusy: boolean;
  feedbackBusy: FeedbackBusy;
  placementFlowBusy: PlacementFlowBusy;
  placementEventsInvalidateKey: number;
  onDownloadCsv: () => void;
  onDownloadXlsx: () => void;
  onStatusChange: (id: number, status: string) => void;
  onRemove: (id: number) => void;
  onSaveFeedback: (id: number, raw: string) => Promise<void>;
  onParseFeedback: (id: number) => Promise<void>;
  onPlacementDeclare: (applicationId: number, note: string) => Promise<void>;
  onPlacementVerifyStart: (applicationId: number, workEmail: string) => Promise<void>;
  onPlacementEmployerAttest: (applicationId: number, employerEmail?: string) => Promise<string>;
  onPlacementDispute: (applicationId: number, reason: string) => Promise<void>;
  onPlacementEventsLoad: (applicationId: number) => Promise<PlacementEventRow[]>;
  onOpenAutoApplyPackage: (applicationId: number) => Promise<void>;
  onOptimizeCv: (id: number, title: string) => void;
  onNegotiateSalary: (id: number, title: string) => void;
};

/**
 * Applications card: count summary, CSV/XLSX export, and the existing
 * ApplicationsPanel verbatim. All callbacks are pass-through to preserve
 * placement / feedback flow behavior.
 */
export function ApplicationsSection({
  applications,
  applicationsTotal,
  applicationsCsvBusy,
  applicationsXlsxBusy,
  feedbackBusy,
  placementFlowBusy,
  placementEventsInvalidateKey,
  onDownloadCsv,
  onDownloadXlsx,
  onStatusChange,
  onRemove,
  onSaveFeedback,
  onParseFeedback,
  onPlacementDeclare,
  onPlacementVerifyStart,
  onPlacementEmployerAttest,
  onPlacementDispute,
  onPlacementEventsLoad,
  onOpenAutoApplyPackage,
  onOptimizeCv,
  onNegotiateSalary,
}: Props) {
  const { t } = useTranslation();

  return (
    <Card id="dashboard-applications" variant="soft">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="twin-section-title">
          {t("dashboard.applications")}{" "}
          <span className="twin-muted text-base font-normal">
            {applications.length >= applicationsTotal
              ? t("dashboard.applicationsSummaryAll").replace("{total}", String(applicationsTotal))
              : t("dashboard.applicationsSummaryPartial")
                  .replace("{shown}", String(applications.length))
                  .replace("{total}", String(applicationsTotal))}
          </span>
        </h2>
        <div className="flex flex-wrap gap-2 self-start sm:justify-end">
          <button
            type="button"
            aria-label={t("dashboard.applicationsExportCsv")}
            disabled={applicationsCsvBusy || applicationsXlsxBusy}
            onClick={onDownloadCsv}
            className="twin-btn-secondary twin-touch-target text-sm"
          >
            {applicationsCsvBusy ? "…" : t("dashboard.applicationsExportCsv")}
          </button>
          <button
            type="button"
            aria-label={t("dashboard.applicationsExportXlsx")}
            disabled={applicationsCsvBusy || applicationsXlsxBusy}
            onClick={onDownloadXlsx}
            className="twin-btn-secondary twin-touch-target text-sm"
          >
            {applicationsXlsxBusy ? "…" : t("dashboard.applicationsExportXlsx")}
          </button>
        </div>
      </div>
      {applicationsTotal === 0 ? (
        <GuidedEmptyState
          title={t("ux.guidedEmptyApplicationsTitle")}
          message={t("ux.guidedEmptyApplicationsMessage")}
          steps={[
            t("ux.guidedEmptyApplicationsStep1"),
            t("ux.guidedEmptyApplicationsStep2"),
            t("ux.guidedEmptyApplicationsStep3"),
          ]}
          actionLabel={t("ux.guidedEmptyApplicationsCta")}
          actionHref="#dashboard-matches"
        />
      ) : (
      <ApplicationsPanel
        items={applications}
        onStatusChange={onStatusChange}
        onRemove={onRemove}
        onSaveFeedback={onSaveFeedback}
        onParseFeedback={onParseFeedback}
        feedbackBusy={feedbackBusy}
        onPlacementDeclare={onPlacementDeclare}
        onPlacementVerifyStart={onPlacementVerifyStart}
        onPlacementEmployerAttest={onPlacementEmployerAttest}
        onPlacementDispute={onPlacementDispute}
        placementFlowBusy={placementFlowBusy}
        onPlacementEventsLoad={onPlacementEventsLoad}
        placementEventsInvalidateKey={placementEventsInvalidateKey}
        onOpenAutoApplyPackage={onOpenAutoApplyPackage}
        onOptimizeCv={onOptimizeCv}
        onNegotiateSalary={onNegotiateSalary}
      />
      )}
    </Card>
  );
}
