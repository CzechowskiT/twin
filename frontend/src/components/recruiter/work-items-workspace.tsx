"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { OperationalCrossLinksPanel } from "@/components/shared/operational-cross-links-panel";
import { Card, Shell } from "@/components/ui";
import {
  LAUNCH_STANCE,
  WORK_ITEMS_MARKERS,
  WORK_ITEMS_PAGE_MARKER,
  createWorkItem,
  loadWorkItems,
  patchWorkItemStatus,
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
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState<"note" | "task">("note");
  const [writeStatus, setWriteStatus] = useState<"idle" | "live" | "demo">("idle");
  const [statusWrite, setStatusWrite] = useState<"idle" | "live" | "demo">("idle");
  const [saving, setSaving] = useState(false);

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
  const sourceKey = source === "live" ? "safePersistence.liveApi" : "safePersistence.demoFallback";
  const writeKey =
    writeStatus === "live" ? "safePersistence.internalWriteLive" : writeStatus === "demo" ? "safePersistence.internalWriteDemo" : null;
  const statusKey =
    statusWrite === "live" ? "safePersistence.internalWriteLive" : statusWrite === "demo" ? "safePersistence.internalWriteDemo" : null;
  const firstItem = record.items[0];

  async function onCreate(): Promise<void> {
    if (!title.trim()) return;
    setSaving(true);
    setWriteStatus("idle");
    const result = await createWorkItem(scope, { title: title.trim(), item_type: itemType });
    if (result.wrote && result.data) {
      setRecord((prev) => ({
        ...prev,
        items: [
          {
            id: String(result.data!.id),
            item_type: result.data!.item_type as WorkItemRow["item_type"],
            title: result.data!.title,
            description: result.data!.description ?? "",
            status: result.data!.status,
            owner_label: result.data!.owner_label ?? "—",
            backend_write: true,
            external_side_effect: false,
          },
          ...prev.items,
        ],
      }));
      setSource("live");
      setWriteStatus("live");
      setTitle("");
    } else {
      setWriteStatus("demo");
    }
    setSaving(false);
  }

  async function onPatchStatus(): Promise<void> {
    if (!firstItem) return;
    setSaving(true);
    setStatusWrite("idle");
    const result = await patchWorkItemStatus(firstItem.id, firstItem.status === "open" ? "in_progress" : "open");
    if (result.wrote && result.data) {
      setRecord((prev) => ({
        ...prev,
        items: prev.items.map((row) =>
          row.id === firstItem.id ? { ...row, status: result.data!.status } : row,
        ),
      }));
      setSource("live");
      setStatusWrite("live");
    } else {
      setStatusWrite("demo");
    }
    setSaving(false);
  }

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
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("workItems.createTitlePlaceholder")}
                className="min-w-[12rem] flex-1 rounded border bg-transparent px-2 py-1 text-xs"
              />
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as "note" | "task")}
                className="rounded border bg-transparent px-2 py-1 text-xs"
              >
                <option value="note">note</option>
                <option value="task">task</option>
              </select>
              <button
                type="button"
                className="rounded border px-3 py-1 text-xs disabled:opacity-50"
                onClick={() => void onCreate()}
                disabled={saving || !title.trim()}
              >
                {t("workItems.createAction")}
              </button>
            </div>
            {writeKey ? <p className="mt-2 text-[10px] text-[var(--twin-muted)]">{t(writeKey)}</p> : null}
          </>,
        )}

        {section(
          WORK_ITEMS_MARKERS.statusPreview,
          t("workItems.statusTitle"),
          <>
            <p className="text-xs">{t("workItems.statusLead")}</p>
            {firstItem ? (
              <button
                type="button"
                className="mt-2 rounded border px-3 py-1 text-xs disabled:opacity-50"
                onClick={() => void onPatchStatus()}
                disabled={saving}
              >
                {t("workItems.statusAction")}
              </button>
            ) : null}
            {statusKey ? <p className="mt-2 text-[10px] text-[var(--twin-muted)]">{t(statusKey)}</p> : null}
          </>,
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

        <OperationalCrossLinksPanel />
      </div>
    </Shell>
  );
}
