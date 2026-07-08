"use client";

import { InvestorDataRoomPanel } from "@/components/investor/investor-data-room-panel";
import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";
import { WorkspaceStatusBadge } from "@/components/workspace/workspace-status-badge";
import { DATA_ROOM_INVITE_ONLY_PREVIEW } from "@/lib/seven-day-d5-investor";

export default function InvestorDataRoomPage() {
  const { t } = useTranslation();

  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      <Shell wide>
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
              {t("investorDataRoom.eyebrow")}
            </p>
            <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">
              {t("investorDataRoom.title")}
            </h1>
            <p className="twin-muted max-w-2xl text-sm leading-relaxed">
              {DATA_ROOM_INVITE_ONLY_PREVIEW ? t("sevenDayD5.dataRoomInviteOnlyLead") : t("investorDataRoom.lead")}
            </p>
          </div>
          {DATA_ROOM_INVITE_ONLY_PREVIEW ? (
            <WorkspaceStatusBadge status="preview" labelKey="sevenDayD5.dataRoomInviteOnlyBadge" />
          ) : null}
        </header>
        <InvestorDataRoomPanel />
      </Shell>
    </PersonaWorkspaceGate>
  );
}
