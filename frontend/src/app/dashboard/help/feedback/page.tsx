"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type FeedbackItem = {
  id: number;
  category: string;
  rating: number | null;
  message: string | null;
  status: string;
};

export default function PilotFeedbackPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [category, setCategory] = useState("ux");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const data = await apiFetch<{ items?: FeedbackItem[] }>(
      "/api/v1/candidates/me/pilot-operations/feedback",
      {},
      token,
    );
    setItems(data.items || []);
  }, [router]);

  useEffect(() => {
    void load().catch(() => setErr("load_failed"));
  }, [load]);

  async function submit() {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setErr(null);
    try {
      await apiFetch(
        "/api/v1/candidates/me/pilot-operations/feedback",
        {
          method: "POST",
          body: JSON.stringify({
            category,
            message,
            rating,
            page_path: "/dashboard/help/feedback",
          }),
        },
        token,
      );
      setMsg(t("pilotOps.successFeedback"));
      setMessage("");
      await load();
    } catch {
      setErr("submit_failed");
    }
  }

  async function withdraw(id: number) {
    const token = getToken();
    if (!token) return;
    await apiFetch(
      `/api/v1/candidates/me/pilot-operations/feedback/${id}/withdraw`,
      { method: "POST", body: "{}" },
      token,
    );
    setMsg(t("pilotOps.withdrawn"));
    await load();
  }

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("pilotOps.feedbackTitle")} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("pilotOps.feedbackTitle")}</h1>
        <p className="mt-2 text-sm opacity-80">{t("pilotOps.feedbackLead")}</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="block text-sm">
            <span>{t("pilotOps.category")}</span>
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label={t("pilotOps.category")}
            >
              {["ux", "clarity", "usefulness", "trust", "other"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span>{t("pilotOps.rating")}</span>
            <input
              type="number"
              min={1}
              max={5}
              className="mt-1 w-full rounded border px-3 py-2"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              aria-label={t("pilotOps.rating")}
            />
          </label>
          <label className="block text-sm">
            <span>{t("pilotOps.details")}</span>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={2000}
              aria-label={t("pilotOps.details")}
            />
          </label>
          <Button type="submit">{t("pilotOps.submit")}</Button>
        </form>
        {msg ? <p className="mt-4 text-sm">{msg}</p> : null}
        {err ? <p className="mt-4 text-sm text-red-700">{err}</p> : null}
        <ul className="mt-8 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded border p-3 text-sm">
              <p>
                {item.category} · {item.status} · {item.rating ?? "—"}
              </p>
              <p className="mt-1 opacity-80">{item.message}</p>
              {item.status === "SUBMITTED" ? (
                <Button type="button" className="mt-2" onClick={() => void withdraw(item.id)}>
                  {t("pilotOps.withdraw")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <Link className="twin-link mt-6 inline-flex min-h-[2.75rem] items-center text-sm" href="/dashboard/help">
          {t("pilotOps.title")}
        </Link>
      </main>
    </Shell>
  );
}
