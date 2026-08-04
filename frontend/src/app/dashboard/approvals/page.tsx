"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Approval = {
  id: number;
  approval_kind: string;
  status: string;
  bundled?: boolean;
  before?: { phase?: string };
  after?: { phase?: string };
};

export default function LifecycleApprovalsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<Approval[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<{ approvals?: Approval[] }>(
        "/api/v1/candidates/me/career-lifecycle",
        {},
        token,
      );
      setItems(data.approvals || []);
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

  async function resolve(id: number, approved: boolean) {
    const token = getToken();
    if (!token) return;
    try {
      await apiFetch(
        `/api/v1/candidates/me/career-lifecycle/approvals/${id}/resolve`,
        { method: "POST", body: JSON.stringify({ approved }) },
        token,
      );
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerLifecycle.actionFailed"));
    }
  }

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("careerLifecycle.approvals")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <h1 className="text-3xl font-semibold">{t("careerLifecycle.approvalsTitle")}</h1>
        <p className="text-sm text-[var(--twin-muted)]">{t("careerLifecycle.approvalsLead")}</p>
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        <Card>
          <ul className="flex flex-col gap-3 text-sm">
            {items.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--twin-border)] py-2">
                <span>
                  {a.approval_kind} · {a.status} · bundled={String(!!a.bundled)} ·{" "}
                  {a.before?.phase} → {a.after?.phase}
                </span>
                {a.status === "pending" ? (
                  <span className="flex gap-2">
                    <Button type="button" onClick={() => void resolve(a.id, true)}>
                      {t("careerLifecycle.approve")}
                    </Button>
                    <Button type="button" onClick={() => void resolve(a.id, false)}>
                      {t("careerLifecycle.reject")}
                    </Button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </Shell>
  );
}
