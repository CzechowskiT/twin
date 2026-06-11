"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import {
  CANDIDATE_TIMELINE_ROUTE,
  formatTimelinePhase,
  type CandidateTimelineItem,
} from "@/lib/candidate-application-timeline";
import { clearToken, getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

type ListOut = { items: CandidateTimelineItem[]; total: number };

export default function CandidateApplicationsClient() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<CandidateTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const loc = locale === "pl" ? "pl-PL" : "en-US";

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push("/login/candidate");
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<ListOut>("/api/v1/applications/me?limit=100", {}, token);
      setItems(data.items ?? []);
    } catch {
      clearToken();
      router.push("/login/candidate");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Shell wide>
      <header className="mb-8 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("candidateTimeline.eyebrow")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("candidateTimeline.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("candidateTimeline.lead")}</p>
      </header>

      {loading ? <p className="twin-muted text-sm">{t("candidateTimeline.loading")}</p> : null}

      {!loading && items.length === 0 ? (
        <p className="twin-muted text-sm">{t("candidateTimeline.empty")}</p>
      ) : null}

      <ol className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-[var(--twin-border)]/80 bg-[var(--twin-surface)]/60 px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-[var(--foreground)]">{item.title}</p>
                <p className="text-sm text-[var(--twin-muted-strong)]">{item.company}</p>
              </div>
              <span className="rounded-full bg-[var(--twin-surface-soft)] px-2 py-0.5 text-xs font-medium">
                {formatTimelinePhase(item)}
              </span>
            </div>
            <p className="twin-muted mt-2 text-xs">
              {t("candidateTimeline.updated")}{" "}
              {new Date(item.updated_at).toLocaleString(loc)}
            </p>
          </li>
        ))}
      </ol>

      <p className="twin-muted mt-8 text-xs leading-relaxed">{t("candidateTimeline.scopeNote")}</p>
      <Link href="/dashboard" className="twin-link mt-4 inline-block text-sm font-medium">
        {t("candidateTimeline.backDashboard")}
      </Link>
    </Shell>
  );
}
