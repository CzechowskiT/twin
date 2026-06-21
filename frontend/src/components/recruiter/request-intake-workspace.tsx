"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { OperationalCrossLinksPanel } from "@/components/shared/operational-cross-links-panel";
import { Card, Shell } from "@/components/ui";
import {
  LAUNCH_STANCE,
  REQUEST_INTAKE_MARKERS,
  REQUEST_INTAKE_PAGE_MARKER,
  loadRequestIntake,
  resolveRequestIntake,
  type RequestIntakeRow,
  type SafePersistenceSource,
} from "@/lib/request-intake";
import { recruiterTrustReviewQueueHref } from "@/lib/recruiter-trust-review-queue";

export function RequestIntakeWorkspace() {
  const { t } = useTranslation();
  const [items, setItems] = useState<RequestIntakeRow[]>(() => resolveRequestIntake());
  const [count, setCount] = useState(() => resolveRequestIntake().length);
  const [source, setSource] = useState<SafePersistenceSource>("demo");

  useEffect(() => {
    let active = true;
    void loadRequestIntake().then((res) => {
      if (!active) return;
      setItems(res.items);
      setCount(res.count);
      setSource(res.source);
    });
    return () => {
      active = false;
    };
  }, []);

  const sourceKey = source === "live" ? "safePersistence.liveApi" : "safePersistence.demoFallback";

  return (
    <Shell wide>
      <div data-request-intake-page={REQUEST_INTAKE_PAGE_MARKER} data-testid={REQUEST_INTAKE_MARKERS.page} className="mx-auto max-w-5xl space-y-6">
        <header data-testid={REQUEST_INTAKE_MARKERS.header}>
          <h1 className="twin-section-title text-2xl">{t("requestIntake.pageTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("requestIntake.headerLead")}</p>
          <p className="text-xs text-[var(--twin-muted)]" data-testid={REQUEST_INTAKE_MARKERS.dataSource}>
            {t(sourceKey)} · {count} {t("requestIntake.countLabel")}
          </p>
          <span className="inline-block rounded-full border px-3 py-1 text-xs" data-launch-stance={LAUNCH_STANCE}>
            {t("requestIntake.pilotBadge")}
          </span>
          <Link href={recruiterTrustReviewQueueHref()} data-testid={REQUEST_INTAKE_MARKERS.trustReviewLink} className="twin-link block text-xs">
            {t("requestIntake.linkTrustReviewQueue")}
          </Link>
        </header>
        <Card className="p-4" data-testid={REQUEST_INTAKE_MARKERS.queue}>
          <p className="mb-2 text-xs" data-testid={REQUEST_INTAKE_MARKERS.queueCount}>
            {t("requestIntake.queueCountLead").replace("{count}", String(count))}
          </p>
          <ul className="space-y-2 text-xs">
            {items.map((row) => (
              <li key={row.id} className="rounded border px-3 py-2">
                {row.request_type} · {row.status} · {row.subject_ref}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4" data-testid={REQUEST_INTAKE_MARKERS.boundary}>
          <p className="text-xs">{t("requestIntake.boundaryLead")}</p>
        </Card>
        <OperationalCrossLinksPanel />
      </div>
    </Shell>
  );
}
