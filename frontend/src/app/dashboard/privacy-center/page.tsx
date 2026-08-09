"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { IaActionableEmpty } from "@/components/dashboard/ia-actionable-empty";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Privacy = {
  orchestration_opt_in?: boolean;
  search_opt_in?: boolean;
  learning_opt_in?: boolean;
  reminders_opt_in?: boolean;
  export_include_module_notes?: boolean;
  paused?: boolean;
  version?: number;
};

export default function PrivacyCenterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [priv, setPriv] = useState<Privacy | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<{ privacy?: Privacy }>(
        "/api/v1/candidates/me/career-lifecycle",
        {},
        token,
      );
      setPriv(data.privacy || null);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerLifecycle.loadFailed"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function patch(partial: Privacy) {
    const token = getToken();
    if (!token) return;
    try {
      const data = await apiFetch<Privacy>(
        "/api/v1/candidates/me/career-lifecycle/privacy",
        { method: "PATCH", body: JSON.stringify(partial) },
        token,
      );
      setPriv(data);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerLifecycle.actionFailed"));
    }
  }

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("careerLifecycle.privacy")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <h1 className="text-3xl font-semibold">{t("careerLifecycle.privacyTitle")}</h1>
        <p className="text-sm text-[var(--twin-muted)]">{t("careerLifecycle.privacyLead")}</p>
        <IaActionableEmpty areaId="settings" show={!err} isLoading={priv === null && !err} isError={Boolean(err)} />
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        <Card>
          <div className="mb-4 flex flex-wrap gap-3 text-sm">
            <a href="/dashboard/data-trust" className="underline">
              {t("dataTrust.nav")}
            </a>
            <a href="/dashboard/career-pack" className="underline">
              {t("careerPack.nav")}
            </a>
            <a href="/dashboard/import" className="underline">
              {t("importCenter.nav")}
            </a>
          </div>
          <dl className="grid gap-2 text-sm">
            <div>
              <dt>{t("careerLifecycle.paused")}</dt>
              <dd>{String(!!priv?.paused)}</dd>
            </div>
            <div>
              <dt>{t("careerLifecycle.searchOptIn")}</dt>
              <dd>{String(!!priv?.search_opt_in)}</dd>
            </div>
            <div>
              <dt>{t("careerLifecycle.exportNotes")}</dt>
              <dd>{String(!!priv?.export_include_module_notes)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void patch({ paused: true })}>
              {t("careerLifecycle.pause")}
            </Button>
            <Button type="button" onClick={() => void patch({ paused: false })}>
              {t("careerLifecycle.resume")}
            </Button>
          </div>
        </Card>
      </main>
    </Shell>
  );
}
