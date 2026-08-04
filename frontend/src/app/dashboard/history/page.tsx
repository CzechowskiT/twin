"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Ev = {
  id: number;
  event_type: string;
  source_module: string;
  claim_kind?: string;
  created_at?: string | null;
};

export default function LifecycleHistoryPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [events, setEvents] = useState<Ev[]>([]);
  const [phase, setPhase] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<{ events?: Ev[]; context?: { active_phase?: string } }>(
        "/api/v1/candidates/me/career-lifecycle/history",
        {},
        token,
      );
      setEvents(data.events || []);
      setPhase(data.context?.active_phase || "");
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

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("careerLifecycle.history")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <header>
          <h1 className="text-3xl font-semibold">{t("careerLifecycle.historyTitle")}</h1>
          <p className="mt-2 text-sm text-[var(--twin-muted)]">{t("careerLifecycle.historyLead")}</p>
          <p className="mt-2 text-sm" role="status">
            {t("careerLifecycle.phase")}: {phase || "…"}
          </p>
        </header>
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        <Button type="button" onClick={() => void load()}>
          {t("careerLifecycle.refresh")}
        </Button>
        <Card>
          <ul className="flex flex-col gap-2 text-sm">
            {events.length ? (
              events.map((e) => (
                <li key={e.id} className="border-b border-[var(--twin-border)] py-2">
                  <strong>{e.event_type}</strong> · {e.source_module} · {e.claim_kind} ·{" "}
                  {e.created_at || ""}
                </li>
              ))
            ) : (
              <li className="text-[var(--twin-muted)]">{t("careerLifecycle.emptyHistory")}</li>
            )}
          </ul>
        </Card>
      </main>
    </Shell>
  );
}
