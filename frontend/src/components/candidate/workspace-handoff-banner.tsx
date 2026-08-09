"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/language-provider";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

const STORAGE_KEY = "twin_workspace_handoff_handle";

type Resolved = {
  label?: string;
  return_href?: string;
  safe_mode?: string;
  continuity?: { prefer_continuity?: boolean; session_key?: string };
  object_kind?: string;
  object_ref?: string;
};

/** Strip ?h= from URL and resolve opaque handoff handle for banner. */
export function WorkspaceHandoffBanner({
  expectedDestRouteKey,
}: {
  expectedDestRouteKey: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [ctx, setCtx] = useState<Resolved | null>(null);

  const clearHandle = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const token = getToken();
      if (!token) return;
      let handle = "";
      try {
        if (typeof window !== "undefined") {
          const sp = new URLSearchParams(window.location.search);
          handle = sp.get("h") || "";
          if (handle) {
            const clean = `${window.location.pathname}${window.location.hash || ""}`;
            window.history.replaceState(null, "", clean.split("#")[0] || window.location.pathname);
            sessionStorage.setItem(STORAGE_KEY, handle);
          } else {
            handle = sessionStorage.getItem(STORAGE_KEY) || "";
          }
        }
      } catch {
        handle = "";
      }
      if (!handle) return;
      try {
        const data = await apiFetch<Resolved>(
          "/api/v1/candidates/me/workspace-handoffs/resolve",
          {
            method: "POST",
            body: JSON.stringify({
              handle,
              expected_dest_route_key: expectedDestRouteKey,
            }),
          },
          token,
        );
        if (!cancelled) setCtx(data);
      } catch {
        clearHandle();
        if (!cancelled) setCtx(null);
      }
    }
    queueMicrotask(() => {
      void run();
    });
    return () => {
      cancelled = true;
    };
  }, [clearHandle, expectedDestRouteKey]);

  if (!ctx) return null;

  return (
    <aside
      className="rounded border border-[var(--twin-border)] bg-[var(--twin-surface)] p-3 text-sm"
      data-workspace-handoff-banner
      data-handoff-safe-mode={ctx.safe_mode || ""}
    >
      <div className="font-medium">{t("handoff.bannerTitle")}</div>
      <p className="mt-1 text-[var(--twin-muted)]">{t("handoff.bannerLead")}</p>
      {ctx.label ? <p className="mt-1">{ctx.label}</p> : null}
      {ctx.safe_mode === "SAFE_REVIEW" ? (
        <p className="mt-1 text-amber-800">{t("handoff.safeReview")}</p>
      ) : null}
      {ctx.continuity?.prefer_continuity ? (
        <p className="mt-1 text-xs text-[var(--twin-muted)]">{t("handoff.continuityHint")}</p>
      ) : null}
      <p className="mt-1 text-xs text-[var(--twin-muted)]">{t("handoff.notFirstValue")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ctx.return_href ? (
          <Button
            type="button"
            onClick={() => {
              clearHandle();
              router.push(ctx.return_href!);
            }}
          >
            {t("handoff.returnBtn")}
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={() => {
            clearHandle();
            setCtx(null);
          }}
        >
          {t("handoff.dismissBtn")}
        </Button>
      </div>
    </aside>
  );
}

export async function startWorkspaceHandoff(opts: {
  handoffId: string;
  objectRef: string;
  objectRevision?: string;
  parentHandle?: string;
}): Promise<string | null> {
  const token = getToken();
  if (!token) return null;
  const data = await apiFetch<{ handle_once?: string; dest_href?: string }>(
    "/api/v1/candidates/me/workspace-handoffs",
    {
      method: "POST",
      body: JSON.stringify({
        handoff_id: opts.handoffId,
        object_ref: opts.objectRef,
        object_revision: opts.objectRevision || null,
        parent_handle: opts.parentHandle || null,
      }),
    },
    token,
  );
  const handle = data.handle_once || "";
  const dest = data.dest_href || "";
  if (!handle || !dest) return null;
  try {
    sessionStorage.setItem(STORAGE_KEY, handle);
  } catch {
    /* ignore */
  }
  return `${dest}?h=${encodeURIComponent(handle)}`;
}
