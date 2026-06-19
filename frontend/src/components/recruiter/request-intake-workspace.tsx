"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import {
  LAUNCH_STANCE,
  REQUEST_INTAKE_MARKERS,
  REQUEST_INTAKE_PAGE_MARKER,
} from "@/lib/request-intake";
import { recruiterTrustReviewQueueHref } from "@/lib/recruiter-trust-review-queue";

const DEMO_ROWS = [
  { id: "ri-1", request_type: "correction_preview", status: "open" },
  { id: "ri-2", request_type: "trust_audit_review", status: "triage" },
] as const;

export function RequestIntakeWorkspace() {
  const { t } = useTranslation();
  return (
    <Shell wide>
      <div data-request-intake-page={REQUEST_INTAKE_PAGE_MARKER} data-testid={REQUEST_INTAKE_MARKERS.page} className="mx-auto max-w-5xl space-y-6">
        <header data-testid={REQUEST_INTAKE_MARKERS.header}>
          <h1 className="twin-section-title text-2xl">{t("requestIntake.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("requestIntake.headerLead")}</p>
          <span className="inline-block rounded-full border px-3 py-1 text-xs" data-launch-stance={LAUNCH_STANCE}>
            {t("requestIntake.pilotBadge")}
          </span>
          <Link href={recruiterTrustReviewQueueHref()} data-testid={REQUEST_INTAKE_MARKERS.trustReviewLink} className="twin-link block text-xs">
            {t("requestIntake.linkTrustReviewQueue")}
          </Link>
        </header>
        <Card className="p-4" data-testid={REQUEST_INTAKE_MARKERS.queue}>
          <ul className="space-y-2 text-xs">
            {DEMO_ROWS.map((row) => (
              <li key={row.id} className="rounded border px-3 py-2">
                {row.request_type} · {row.status}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4" data-testid={REQUEST_INTAKE_MARKERS.boundary}>
          <p className="text-xs">{t("requestIntake.boundaryLead")}</p>
        </Card>
      </div>
    </Shell>
  );
}
