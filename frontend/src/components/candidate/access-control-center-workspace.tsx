"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken, logoutSession } from "@/lib/auth";
import { WorkspaceHandoffBanner } from "@/components/candidate/workspace-handoff-banner";

type AccessItem = {
  access_key: string;
  kind: string;
  group: string;
  title: string;
  scope: string;
  state: string;
  revocable: boolean;
  revision: string;
  expires_at?: string | null;
  consequence: string;
};

type Inventory = {
  items?: AccessItem[];
  groups?: Record<string, AccessItem[]>;
  unavailable_sources?: string[];
};

const GROUP_ORDER = [
  "connected_services",
  "private_links_and_feeds",
  "temporary_files",
] as const;

export function AccessControlCenterWorkspace() {
  const { t } = useTranslation();
  const router = useRouter();
  const [inv, setInv] = useState<Inventory | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<Inventory>(
        "/api/v1/candidates/me/access-inventory",
        {},
        token,
      );
      setInv(data);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("accessCenter.error"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function revoke(item: AccessItem) {
    const token = getToken();
    if (!token) return;
    if (!item.revocable) {
      setErr(t("accessCenter.notRevocable"));
      return;
    }
    if (confirmKey !== item.access_key) {
      setConfirmKey(item.access_key);
      return;
    }
    setBusyKey(item.access_key);
    try {
      await apiFetch(
        "/api/v1/candidates/me/access-inventory/revoke",
        {
          method: "POST",
          body: JSON.stringify({
            access_key: item.access_key,
            kind: item.kind,
            client_revision: item.revision,
            confirm: true,
          }),
        },
        token,
      );
      setConfirmKey(null);
      await load();
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : t("accessCenter.error");
      setErr(msg.includes("revision") ? t("accessCenter.revisionStale") : msg);
    } finally {
      setBusyKey(null);
    }
  }

  function groupLabel(g: string): string {
    if (g === "connected_services") return t("accessCenter.groupConnected");
    if (g === "private_links_and_feeds") return t("accessCenter.groupLinks");
    return t("accessCenter.groupTemp");
  }

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("accessCenter.nav")} />
      <main
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8"
        data-access-control-center
      >
        <div>
          <Link href="/dashboard/privacy-center" className="text-sm underline">
            {t("accessCenter.backPrivacy")}
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">{t("accessCenter.title")}</h1>
          <p className="mt-2 text-sm text-[var(--twin-muted)]">{t("accessCenter.lead")}</p>
          <p className="mt-1 text-xs text-[var(--twin-muted)]">{t("accessCenter.noTracking")}</p>
          <p className="text-xs text-[var(--twin-muted)]">{t("accessCenter.noSecrets")}</p>
          <p className="text-xs text-[var(--twin-muted)]">{t("accessCenter.notFirstValue")}</p>
          <p className="mt-2 text-xs text-[var(--twin-muted)]">{t("accessCenter.sessionsNote")}</p>
          <p className="mt-2 text-sm text-[var(--twin-muted)]">{t("accessCenter.recoveryLead")}</p>
          <Link href="/forgot-password" className="text-sm underline">
            {t("accessCenter.recoveryLink")}
          </Link>
          <div className="mt-3">
            <Button
              type="button"
              data-auth-sign-out-everywhere
              onClick={() => {
                void logoutSession({ everywhere: true }).then(() => {
                  router.replace("/login");
                });
              }}
            >
              {t("accessCenter.signOutEverywhere")}
            </Button>
          </div>
        </div>
        <WorkspaceHandoffBanner expectedDestRouteKey="access_center" />
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        {!inv && !err ? (
          <p className="text-sm text-[var(--twin-muted)]">{t("accessCenter.loading")}</p>
        ) : null}
        {inv?.unavailable_sources && inv.unavailable_sources.length > 0 ? (
          <p className="text-sm text-amber-800">{t("accessCenter.unavailable")}</p>
        ) : null}
        {GROUP_ORDER.map((g) => {
          const items = (inv?.groups?.[g] || []).filter((i) =>
            ["ACTIVE", "AVAILABLE", "OPEN", "PROCESSING"].includes(i.state),
          );
          return (
            <Card key={g} data-access-group={g}>
              <h2 className="mb-3 text-lg font-medium">{groupLabel(g)}</h2>
              {items.length === 0 ? (
                <p className="text-sm text-[var(--twin-muted)]">{t("accessCenter.empty")}</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {items.map((item) => (
                    <li
                      key={item.access_key}
                      className="border-t border-[var(--twin-border)] pt-3 first:border-0 first:pt-0"
                      data-access-key={item.access_key}
                    >
                      <div className="font-medium">{item.title}</div>
                      <dl className="mt-1 grid gap-1 text-sm text-[var(--twin-muted)]">
                        <div>
                          <dt className="inline">{t("accessCenter.scope")}: </dt>
                          <dd className="inline">{item.scope}</dd>
                        </div>
                        <div>
                          <dt className="inline">{t("accessCenter.state")}: </dt>
                          <dd className="inline">{item.state}</dd>
                        </div>
                        {item.expires_at ? (
                          <div>
                            <dt className="inline">{t("accessCenter.expires")}: </dt>
                            <dd className="inline">{item.expires_at}</dd>
                          </div>
                        ) : null}
                        <div>
                          <dt className="inline">{t("accessCenter.consequence")}: </dt>
                          <dd className="inline">{item.consequence}</dd>
                        </div>
                      </dl>
                      {item.revocable ? (
                        <Button
                          type="button"
                          className="mt-2"
                          disabled={busyKey === item.access_key}
                          onClick={() => void revoke(item)}
                        >
                          {confirmKey === item.access_key
                            ? t("accessCenter.confirmRevoke")
                            : t("accessCenter.revoke")}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </main>
    </Shell>
  );
}
