"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Article = { id: string; title: string; body: string; href: string };

export default function HelpCenterPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<{ articles?: Article[] }>(
        `/api/v1/candidates/me/pilot-operations/help?locale=${encodeURIComponent(locale || "en")}`,
        {},
        token,
      );
      setArticles(data.articles || []);
      setErr(null);
    } catch {
      setErr("load_failed");
    }
  }, [locale, router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("pilotOps.title")} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("pilotOps.title")}</h1>
        <p className="mt-2 text-sm opacity-80">{t("pilotOps.lead")}</p>
        <p className="text-sm opacity-80">{t("guidedFv.helpRecovery")}</p>
        <p className="mt-2 text-sm opacity-70">{t("pilotOps.noAttachments")}</p>
        {err ? <p className="mt-4 text-sm text-red-700">{err}</p> : null}
        <ul className="mt-6 space-y-4">
          {articles.map((a) => (
            <li key={a.id}>
              <h2 className="text-base font-medium">{a.title}</h2>
              <p className="mt-1 text-sm opacity-80">{a.body}</p>
              <Link className="twin-link mt-2 inline-flex min-h-[2.75rem] items-center text-sm" href={a.href}>
                {a.title}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link className="twin-link inline-flex min-h-[2.75rem] items-center" href="/dashboard/help/report-problem">
            {t("pilotOps.navReport")}
          </Link>
          <Link className="twin-link inline-flex min-h-[2.75rem] items-center" href="/dashboard/help/feedback">
            {t("pilotOps.navFeedback")}
          </Link>
          <Link className="twin-link inline-flex min-h-[2.75rem] items-center" href="/dashboard/privacy-center">
            {t("pilotOps.openPrivacy")}
          </Link>
        </div>
      </main>
    </Shell>
  );
}
