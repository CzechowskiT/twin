"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/language-provider";
import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { Button, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

const CATEGORIES = ["access", "privacy", "invite", "onboarding", "daily_os", "bug", "data", "other"] as const;

export default function ReportProblemPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [category, setCategory] = useState<string>("bug");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadPreview() {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const data = await apiFetch<{ included?: Record<string, unknown>; rejected_fields?: string[] }>(
      "/api/v1/candidates/me/pilot-operations/diagnostic/preview",
      {
        method: "POST",
        body: JSON.stringify({
          diagnostic_opt_in: true,
          diagnostic: {
            surface: "report_problem",
            route: "/dashboard/help/report-problem",
            locale: locale || "en",
            journey_step: category,
            support_category: category,
            kpi_excluded: true,
            email: "should-be-stripped@example.com",
          },
        }),
      },
      token,
    );
    setPreview({ included: data.included, rejected: data.rejected_fields });
  }

  async function submit() {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      if (optIn) await loadPreview();
      await apiFetch(
        "/api/v1/candidates/me/pilot-operations/problems",
        {
          method: "POST",
          body: JSON.stringify({
            category,
            subject: subject || "Problem report",
            body_text: body,
            diagnostic_opt_in: optIn,
            locale: locale || "en",
            diagnostic: optIn
              ? {
                  surface: "report_problem",
                  route: "/dashboard/help/report-problem",
                  locale: locale || "en",
                  journey_step: category,
                  support_category: category,
                  kpi_excluded: true,
                }
              : {},
          }),
        },
        token,
      );
      setMsg(t("pilotOps.successProblem"));
      setSubject("");
      setBody("");
    } catch {
      setErr("submit_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <CandidateWorkspaceSubnav ariaLabel={t("pilotOps.reportTitle")} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("pilotOps.reportTitle")}</h1>
        <p className="mt-2 text-sm opacity-80">{t("pilotOps.reportLead")}</p>
        <p className="mt-2 text-sm opacity-70">{t("pilotOps.noAttachments")}</p>
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
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span>{t("pilotOps.subject")}</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              aria-label={t("pilotOps.subject")}
            />
          </label>
          <label className="block text-sm">
            <span>{t("pilotOps.details")}</span>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={5}
              aria-label={t("pilotOps.details")}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={optIn}
              onChange={(e) => setOptIn(e.target.checked)}
            />
            {t("pilotOps.diagnosticOptIn")}
          </label>
          {optIn ? (
            <div className="rounded border p-3 text-xs">
              <p className="font-medium">{t("pilotOps.diagnosticPreview")}</p>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap">
                {preview ? JSON.stringify(preview, null, 2) : "—"}
              </pre>
              <Button type="button" className="mt-2" onClick={() => void loadPreview()}>
                {t("pilotOps.diagnosticPreview")}
              </Button>
            </div>
          ) : null}
          <Button type="submit" disabled={busy}>
            {t("pilotOps.submit")}
          </Button>
        </form>
        {msg ? <p className="mt-4 text-sm">{msg}</p> : null}
        {err ? <p className="mt-4 text-sm text-red-700">{err}</p> : null}
        <Link className="twin-link mt-6 inline-flex min-h-[2.75rem] items-center text-sm" href="/dashboard/help">
          {t("pilotOps.title")}
        </Link>
      </main>
    </Shell>
  );
}
