"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import {
  COMPACT_AUDIT_TRAIL_MARKERS,
  loadAuditEventRecords,
  type CompactAuditRecord,
} from "@/lib/compact-audit-trail";

export function CompactAuditTrailWidget(): ReactNode {
  const { t } = useTranslation();
  const [count, setCount] = useState<number | null>(null);
  const [records, setRecords] = useState<CompactAuditRecord[]>([]);
  const [sourceKey, setSourceKey] = useState<"safePersistence.liveApi" | "safePersistence.demoFallback">(
    "safePersistence.demoFallback",
  );

  useEffect(() => {
    let active = true;
    void loadAuditEventRecords().then((res) => {
      if (!active) return;
      setCount(res.count);
      setRecords(res.records);
      setSourceKey(res.source === "live" ? "safePersistence.liveApi" : "safePersistence.demoFallback");
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className="rounded-lg border border-[var(--twin-border)]/60 px-3 py-2 text-xs"
      data-testid={COMPACT_AUDIT_TRAIL_MARKERS.widget}
    >
      <p className="font-semibold uppercase text-[var(--twin-muted-strong)]">{t("liveOperatingState.auditWidgetTitle")}</p>
      <p className="mt-1 text-[var(--twin-muted)]">{t("liveOperatingState.auditWidgetLead")}</p>
      <p className="mt-2 text-lg font-semibold" data-testid={COMPACT_AUDIT_TRAIL_MARKERS.count}>
        {count ?? "—"}
      </p>
      <p className="text-[10px] uppercase text-[var(--twin-muted)]" data-testid={COMPACT_AUDIT_TRAIL_MARKERS.source}>
        {t(sourceKey)}
      </p>
      {records.length > 0 ? (
        <ul className="mt-3 space-y-2" data-testid={COMPACT_AUDIT_TRAIL_MARKERS.records}>
          {records.map((row) => (
            <li
              key={`${row.event_type}-${row.target_id}-${row.created_at}`}
              className="rounded border border-[var(--twin-border)]/50 px-2 py-1.5 font-mono text-[10px]"
              data-testid={COMPACT_AUDIT_TRAIL_MARKERS.recordRow}
            >
              <span className="block text-[var(--foreground)]">{row.event_type}</span>
              <span className="block text-[var(--twin-muted-strong)]">
                {row.actor_persona} → {row.target_type}:{row.target_id}
              </span>
              <span className="block text-[var(--twin-muted)]">{row.created_at}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
