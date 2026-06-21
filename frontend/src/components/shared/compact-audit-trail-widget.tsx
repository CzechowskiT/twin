"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { COMPACT_AUDIT_TRAIL_MARKERS, loadAuditEventCount } from "@/lib/compact-audit-trail";
import { auditEventFoundationHref } from "@/lib/audit-event-foundation";

export function CompactAuditTrailWidget(): ReactNode {
  const { t } = useTranslation();
  const [count, setCount] = useState<number | null>(null);
  const [sourceKey, setSourceKey] = useState<"safePersistence.liveApi" | "safePersistence.demoFallback">(
    "safePersistence.demoFallback",
  );

  useEffect(() => {
    let active = true;
    void loadAuditEventCount().then((res) => {
      if (!active) return;
      setCount(res.count);
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
      <Link href={auditEventFoundationHref()} className="twin-link mt-1 inline-block">
        →
      </Link>
    </div>
  );
}
