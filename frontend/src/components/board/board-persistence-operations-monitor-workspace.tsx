"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { LiveOperatingStatePanel } from "@/components/shared/live-operating-state-panel";
import { Shell } from "@/components/ui";
import {
  BOARD_PERSISTENCE_OPERATIONS_MONITOR_LINKS,
  BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS,
  BOARD_PERSISTENCE_OPERATIONS_MONITOR_PAGE_MARKER,
  loadBoardOperatingState,
  type BoardOperatingState,
} from "@/lib/board-persistence-operations-monitor";

export function BoardPersistenceOperationsMonitorWorkspace() {
  const { t } = useTranslation();
  const [state, setState] = useState<BoardOperatingState | null>(null);

  useEffect(() => {
    let active = true;
    void loadBoardOperatingState().then((res) => {
      if (active) setState(res);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Shell wide>
      <div
        data-board-persistence-operations-monitor-page={BOARD_PERSISTENCE_OPERATIONS_MONITOR_PAGE_MARKER}
        data-testid={BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.page}
        className="mx-auto max-w-5xl space-y-6"
      >
        <header data-testid={BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.header} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("liveOperatingState.monitorTitle")}
          </p>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("liveOperatingState.monitorLead")}</p>
        </header>

        <LiveOperatingStatePanel
          titleKey="recruiterDailyCockpit.operatingStateTitle"
          leadKey="recruiterDailyCockpit.operatingStateLead"
          summary={state?.recruiter ?? null}
          testId={BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.recruiterPanel}
        />

        <LiveOperatingStatePanel
          titleKey="companyHiringCommandCenter.operatingStateTitle"
          leadKey="companyHiringCommandCenter.operatingStateLead"
          summary={state?.company ?? null}
          testId={BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.companyPanel}
        />

        <nav
          className="flex flex-wrap gap-2 text-xs"
          data-testid={BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS.crossLinks}
          aria-label={t("liveOperatingState.crossLinksTitle")}
        >
          {BOARD_PERSISTENCE_OPERATIONS_MONITOR_LINKS.map((link) => (
            <Link key={link.id} href={link.href} className="twin-link rounded-full border border-[var(--twin-border)] px-3 py-1">
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
    </Shell>
  );
}
