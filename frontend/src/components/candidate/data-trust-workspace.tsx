"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { WorkspaceHandoffBanner, startWorkspaceHandoff } from "@/components/candidate/workspace-handoff-banner";

type Question = {
  question_key: string;
  rule_family: string;
  domain: string;
  status: string;
  resolution_action?: string | null;
};

type Review = {
  review_key: string;
  status: string;
  import_batch_key?: string | null;
  questions?: Question[];
  impact_preview?: { mutates_on_preview?: boolean };
  change_set?: { change_set_key: string; status: string };
  first_value_satisfied?: boolean;
};

const ACTIONS = [
  "KEEP_EXISTING",
  "REPLACE_WITH_INCOMING",
  "MERGE_DECLARED",
  "DEFER",
  "DISMISS",
] as const;

export function DataTrustWorkspace() {
  const { t } = useTranslation();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [active, setActive] = useState<Review | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      const data = await apiFetch<{ reviews?: Review[] }>(
        "/api/v1/candidates/me/data-trust/reviews",
        {},
        token,
      );
      setReviews(data.reviews || []);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("dataTrust.error"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function openReview(key: string) {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const data = await apiFetch<Review>(
        `/api/v1/candidates/me/data-trust/reviews/${encodeURIComponent(key)}`,
        {},
        token,
      );
      setActive(data);
      setErr(null);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("dataTrust.error"));
    } finally {
      setBusy(false);
    }
  }

  async function resolveQ(qKey: string, action: string) {
    if (!active) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const data = await apiFetch<Review>(
        `/api/v1/candidates/me/data-trust/reviews/${encodeURIComponent(active.review_key)}/questions/${encodeURIComponent(qKey)}/resolve`,
        { method: "POST", body: JSON.stringify({ resolution_action: action }) },
        token,
      );
      setActive(data);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("dataTrust.error"));
    } finally {
      setBusy(false);
    }
  }

  async function run(path: string, body?: Record<string, string>) {
    if (!active) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const data = await apiFetch<Review & { review?: Review; change_set?: { change_set_key: string } }>(
        `/api/v1/candidates/me/data-trust/reviews/${encodeURIComponent(active.review_key)}${path}`,
        {
          method: "POST",
          body: body ? JSON.stringify(body) : undefined,
        },
        token,
      );
      setActive(data.review || data);
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("dataTrust.error"));
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    const key = active?.change_set?.change_set_key;
    if (!key) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/candidates/me/data-trust/change-sets/${encodeURIComponent(key)}/undo`,
        { method: "POST" },
        token,
      );
      await openReview(active.review_key);
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("dataTrust.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("dataTrust.nav")} />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <h1 className="text-3xl font-semibold">{t("dataTrust.title")}</h1>
        <p className="text-sm text-[var(--twin-muted)]">{t("dataTrust.lead")}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--twin-muted)]">
          <li>{t("dataTrust.markerPostCommit")}</li>
          <li>{t("dataTrust.markerNoAuto")}</li>
          <li>{t("dataTrust.markerNoScores")}</li>
          <li>{t("dataTrust.notFirstValue")}</li>
        </ul>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/dashboard/privacy-center">{t("dataTrust.backSettings")}</Link>
          <Link href="/dashboard/import">{t("dataTrust.backImport")}</Link>
        </div>
        <WorkspaceHandoffBanner expectedDestRouteKey="data_trust" />
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        <Card>
          <h2 className="mb-3 text-lg font-medium">{t("dataTrust.coverage")}</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-[var(--twin-muted)]">{t("dataTrust.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {reviews.map((r) => (
                <li key={r.review_key} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {r.review_key.slice(0, 18)}… — {t("dataTrust.status")}: {r.status}
                  </span>
                  <Button type="button" disabled={busy} onClick={() => void openReview(r.review_key)}>
                    {t("dataTrust.openReview")}
                  </Button>
                  <Button
                    type="button"
                    disabled={busy}
                    data-workspace-handoff-cta="data_trust_to_path_home"
                    onClick={() => {
                      void (async () => {
                        const url = await startWorkspaceHandoff({
                          handoffId: "data_trust_to_path_home",
                          objectRef: r.review_key,
                        });
                        if (url) router.push(url);
                      })();
                    }}
                  >
                    {t("handoff.startHandoff")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {active ? (
          <Card>
            <h2 className="mb-2 text-lg font-medium">
              {t("dataTrust.questions")} ({active.status})
            </h2>
            <ul className="space-y-4">
              {(active.questions || []).map((q) => (
                <li key={q.question_key} className="border-t border-[var(--twin-border)] pt-3 text-sm">
                  <p>
                    {q.rule_family} · {q.domain} · {q.status}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ACTIONS.map((a) => (
                      <Button
                        key={a}
                        type="button"
                        disabled={busy}
                        onClick={() => void resolveQ(q.question_key, a)}
                      >
                        {a === "KEEP_EXISTING"
                          ? t("dataTrust.actionKeep")
                          : a === "REPLACE_WITH_INCOMING"
                            ? t("dataTrust.actionReplace")
                            : a === "MERGE_DECLARED"
                              ? t("dataTrust.actionMerge")
                              : a === "DEFER"
                                ? t("dataTrust.actionDefer")
                                : t("dataTrust.actionDismiss")}
                      </Button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void run("/impact-preview")}>
                {t("dataTrust.preview")}
              </Button>
              <Button type="button" disabled={busy} onClick={() => void run("/propose")}>
                {t("dataTrust.propose")}
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => void run("/resolve", { action: "approve" })}
              >
                {t("dataTrust.approve")}
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => void run("/resolve", { action: "reject" })}
              >
                {t("dataTrust.reject")}
              </Button>
              <Button type="button" disabled={busy || !active.change_set} onClick={() => void undo()}>
                {t("dataTrust.undo")}
              </Button>
            </div>
            {busy ? <p className="mt-2 text-sm">{t("dataTrust.loading")}</p> : null}
          </Card>
        ) : null}
      </main>
    </Shell>
  );
}
