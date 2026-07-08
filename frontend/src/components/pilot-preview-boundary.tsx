"use client";

import { usePathname } from "next/navigation";

import { useTranslation } from "@/components/language-provider";
import {
  isPilotPreviewChromePath,
  PILOT_PREVIEW_BOUNDARY_MARKER,
} from "@/lib/product-polish-p0";

/** Lightweight banner on founder-led demo deep links — routes stay reachable. */
export function PilotPreviewBoundary() {
  const pathname = usePathname() ?? "";
  const { t } = useTranslation();

  if (!isPilotPreviewChromePath(pathname)) return null;

  return (
    <div
      className="border-b border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-center text-xs font-medium leading-relaxed text-amber-100 sm:text-sm"
      role="status"
      data-testid={PILOT_PREVIEW_BOUNDARY_MARKER}
    >
      {t("productPolish.pilotPreviewBanner")}
    </div>
  );
}
