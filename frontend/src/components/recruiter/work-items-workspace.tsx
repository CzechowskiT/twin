"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import {
  LAUNCH_STANCE,
  WORK_ITEMS_MARKERS,
  WORK_ITEMS_PAGE_MARKER,
  loadWorkItems,
  resolveWorkItems,
  type SafePersistenceSource,
  type WorkItemRow,
} from "@/lib/work-items";
import type { TranslationKey } from "@/lib/i18n";

type Props = { scope: "recruiter" | "company" };

function section(marker: string, title: string, children: ReactNode): ReactNode {
  return (
    <Card variant="soft" className="border-[var(--twin-border)]/80 p-5">
      <div data-testid={marker}>
        <h2 className="text-sm font-semibold uppercase text-[var(--twin-muted-strong)]">{title}</h2>
        <div className="mt-3 space-y-2 text-sm">{children}</div>
      </div>
    </Card>
  );
}

export function WorkItemsWorkspace({ scope }: Props) {
  const { t } = useTranslation();
  const [record, setRecord] = useState(() => resolveWorkItems(scope));
  const [source, setSource] = useState<SafePersistenceSource>("demo");

  useEffect(() => {
    let active = true;
    void loadWorkItems(scope).then((res) => {
      if (!active) return;
      setRecord(res.record);
      setSource(res.source);
    });
    return () => {
      active = false;
    };
  }, [scope]);

  const titleKey = scope === "recruiter" ? "workItems.recruiterTitle" : "workItems.companyTitle";
  const sourceKey =
    source === "live" ? "safePersistence.liveApi" : "safePersistence.demoFallback";

  return (
    <Shell wide>
      <div
        data-work-items-page={WORK_ITEMS_PAGE_MARKER}
        data-work-items-scope={scope}
        data-testid={WORK_ITEMS_MARKERS.page}
        className="mx-auto max-w-5xl space-y-6"
      >
        <header data-testid={WORK_ITEMS_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("workItems.pageEyebrow")}
          </p>
          <h1 className="twin-section-title text-2xl">{t(titleKey as TranslationKey)}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("workItems.headerLead")}</p>
          <p className="text-xs text-[var(--twin-muted)]" data-testid="work-items-data-source">
            {t(sourceKey as "safePersistence.liveApi")}
          </p>
          <span data-testid={WORK_ITEMS_MARKERS.pilotBadge} className="inline-block rounded-full border px-3 py-1 text-xs" data-launch-stance={LAUNCH_STANCE}>
            {t("workItems.pilotBadge")}
          </span>
          {scope === "recruiter" ? (
            <Link href="/company/work-items" className="twin-link text-xs">{t("workItems.companyMirror")}</Link>
          ) : (
            <Link href="/recruiter/work-items" className="twin-link text-xs">{t("workItems.recruiterMirror")}</Link>
          )}
        </header>

        {section(
          WORK_ITEMS_MARKERS.list,
          t("workItems.listTitle"),
          <ul className="space-y-2">
            {record.items.map((row: WorkItemRow) => (
              <li key={row.id} className="rounded border px-3 py-2 text-xs">
                <span className="font-medium">{row.title}</span> · {row.item_type} · {row.status}
              </li>
            ))}
          </ul>,
        )}

        {section(
          WORK_ITEMS_MARKERS.createForm,
          t("workItems.createTitle"),
          <>
            <p>{t("workItems.createLead")}</p>
            <p className="text-xs text-[var(--twin-muted)]">{t("workItems.createNote")}</p>
          </>,
        )}

        {section(
          WORK_ITEMS_MARKERS.statusPreview,
          t("workItems.statusTitle"),
          <p className="text-xs">{t("workItems.statusLead")}</p>,
        )}

        {section(
          WORK_ITEMS_MARKERS.auditTrail,
          t("workItems.auditTitle"),
          <ul className="list-inside list-disc font-mono text-xs">
            {record.audit_preview.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>,
        )}

        {section(
          WORK_ITEMS_MARKERS.boundary,
          t("workItems.boundaryTitle"),
          <>
            <ul className="list-inside list-disc text-xs">
              {record.disabled_actions.map((key) => (
                <li key={key}>{t(key as TranslationKey)}</li>
              ))}
            </ul>
            <p className="text-xs">{t("workItems.boundaryLead")}</p>
          </>,
        )}
      </div>
    </Shell>
  );
}
