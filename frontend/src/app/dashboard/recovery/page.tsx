"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function LifecycleRecoveryPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<Record<string, unknown>>(
        "/api/v1/candidates/me/career-lifecycle/recovery",
        {},
        token,
      );
      setStatus(data);
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

  async function reopen() {
    const token = getToken();
    if (!token) return;
    await apiFetch("/api/v1/candidates/me/career-lifecycle/reopen", { method: "POST", body: "{}" }, token);
    await load();
  }

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("careerLifecycle.recovery")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <h1 className="text-3xl font-semibold">{t("careerLifecycle.recoveryTitle")}</h1>
        <p className="text-sm text-[var(--twin-muted)]">{t("careerLifecycle.recoveryLead")}</p>
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        <Card>
          <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(status, null, 2)}</pre>
        </Card>
        <Button type="button" onClick={() => void reopen()}>
          {t("careerLifecycle.reopen")}
        </Button>
      </main>
    </Shell>
  );
}
