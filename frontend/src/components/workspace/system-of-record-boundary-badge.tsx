"use client";

import { useTranslation } from "@/components/language-provider";
import {
  SYSTEM_OF_RECORD_BOUNDARY_LABEL_KEYS,
  type SystemOfRecordBoundaryTag,
} from "@/lib/system-of-record-routes";

const TONE: Record<SystemOfRecordBoundaryTag, string> = {
  pilot: "border-amber-500/35 bg-amber-500/8 text-amber-100/90",
  draft_only: "border-sky-500/35 bg-sky-500/8 text-sky-100/90",
  not_live: "border-rose-500/35 bg-rose-500/8 text-rose-100/90",
  human_decision_required: "border-violet-500/35 bg-violet-500/8 text-violet-100/90",
  no_outreach: "border-orange-500/35 bg-orange-500/8 text-orange-100/90",
  no_ats_sync: "border-zinc-500/35 bg-zinc-500/8 text-zinc-100/90",
};

export function SystemOfRecordBoundaryBadge({ tag }: { tag: SystemOfRecordBoundaryTag }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${TONE[tag]}`}
      data-sor-boundary={tag}
    >
      {t(SYSTEM_OF_RECORD_BOUNDARY_LABEL_KEYS[tag])}
    </span>
  );
}
