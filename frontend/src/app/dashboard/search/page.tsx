"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Hit = { type: string; id: number; title: string; deep_link?: string };

export default function LifecycleSearchPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<{ results?: Hit[]; leaks_other_candidates?: boolean }>(
        "/api/v1/candidates/me/career-lifecycle/search",
        { method: "POST", body: JSON.stringify({ q }) },
        token,
      );
      setHits(data.results || []);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("careerLifecycle.actionFailed"));
    }
  }

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("careerLifecycle.search")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <h1 className="text-3xl font-semibold">{t("careerLifecycle.searchTitle")}</h1>
        <p className="text-sm text-[var(--twin-muted)]">{t("careerLifecycle.searchLead")}</p>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-h-[2.75rem] flex-1 rounded-md border border-[var(--twin-border)] bg-transparent px-3"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t("careerLifecycle.search")}
          />
          <Button type="button" onClick={() => void run()}>
            {t("careerLifecycle.search")}
          </Button>
        </div>
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        <Card>
          <ul className="flex flex-col gap-2 text-sm">
            {hits.map((h) => (
              <li key={`${h.type}-${h.id}`}>
                <Link className="twin-link" href={h.deep_link || "/dashboard"}>
                  {h.type}: {h.title}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </Shell>
  );
}
