"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { RecruiterAccessFields } from "@/components/recruiter/recruiter-access-fields";
import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { GuidedEmptyState } from "@/components/ux/guided-empty-state";
import {
  mergeCompanyOptions,
  readRecruiterInboxSession,
  recruiterInboxQuery,
  resolveCompanySlugFromRaw,
  writeRecruiterInboxSession,
} from "@/lib/recruiter-inbox";

type JobRow = {
  id: number;
  title: string;
  company: string;
  location: string | null;
  url: string;
};

export default function RecruiterJobsPage() {
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [companyRaw, setCompanyRaw] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [busy, setBusy] = useState(false);

  const companyOptions = useMemo(
    () => mergeCompanyOptions(readRecruiterInboxSession().companySlug, companyRaw),
    [companyRaw],
  );
  const knownSlugs = useMemo(() => new Set(companyOptions.map((o) => o.slug)), [companyOptions]);
  const companySlug = useMemo(
    () => resolveCompanySlugFromRaw(companyRaw, knownSlugs),
    [companyRaw, knownSlugs],
  );

  useEffect(() => {
    const session = readRecruiterInboxSession();
    queueMicrotask(() => {
      setToken(session.token);
      setCompanyRaw(session.companySlug);
    });
  }, []);

  const load = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug) return;
    const q = recruiterInboxQuery(tkn, slug);
    const res = await fetch(`/api/recruiter/jobs?${q}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { items: JobRow[] };
    setJobs(data.items ?? []);
  }, [token, companySlug]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    const tkn = token.trim();
    const slug = companySlug;
    if (!tkn || !slug || !title.trim()) {
      toast.error(t("recruiterInbox.missingAuth"));
      return;
    }
    setBusy(true);
    try {
      writeRecruiterInboxSession(tkn, slug);
      setCompanyRaw(slug);
      const q = recruiterInboxQuery(tkn, slug);
      const res = await fetch(`/api/recruiter/jobs?${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          location: location.trim() || null,
          description: description.trim() || null,
          url: url.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(t("recruiterJobs.success"));
      setTitle("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("recruiterJobs.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell wide>
      <RecruiterWorkspaceNav />
      <Card data-seven-day-recruiter-jobs>
        <h1 className="mb-2 text-2xl font-semibold">{t("recruiterJobs.title")}</h1>
        <p className="twin-muted mb-6 text-sm">{t("recruiterJobs.lead")}</p>
        <RecruiterAccessFields
          idPrefix="recruiter-jobs"
          token={token}
          onTokenChange={setToken}
          companySlug={companyRaw}
          onCompanySlugChange={setCompanyRaw}
          companyOptions={companyOptions}
        />
        <form onSubmit={(e) => void publish(e)} className="mt-6 space-y-3">
          <input
            id="recruiter-job-title"
            className="twin-input w-full border-2"
            placeholder={t("recruiterJobs.fieldTitle")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className="twin-input w-full border-2"
            placeholder={t("recruiterJobs.fieldLocation")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <textarea
            className="twin-input min-h-[6rem] w-full border-2"
            placeholder={t("recruiterJobs.fieldDescription")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            className="twin-input w-full border-2"
            placeholder={t("recruiterJobs.fieldUrl")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" className="twin-btn-solid twin-touch-target" disabled={busy}>
            {busy ? t("common.loading") : t("recruiterJobs.submit")}
          </button>
        </form>
        <h2 className="mt-8 text-lg font-semibold">{t("recruiterJobs.listTitle")}</h2>
        {jobs.length === 0 ? (
          <div className="mt-3">
            <GuidedEmptyState
              title={t("ux.guidedEmptyRecruiterJobsTitle")}
              message={t("ux.guidedEmptyRecruiterJobsMessage")}
              steps={[
                t("ux.guidedEmptyRecruiterJobsStep1"),
                t("ux.guidedEmptyRecruiterJobsStep2"),
                t("ux.guidedEmptyRecruiterJobsStep3"),
              ]}
              actionLabel={t("ux.guidedEmptyRecruiterJobsCta")}
              onAction={() => {
                document.getElementById("recruiter-job-title")?.focus();
              }}
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {jobs.map((j) => (
              <li key={j.id} className="rounded border border-[var(--twin-border)] px-3 py-2 text-sm">
                <span className="font-medium">{j.title}</span>
                {j.location ? <span className="twin-muted"> · {j.location}</span> : null}
              </li>
            ))}
          </ul>
        )}
        <Link href="/recruiter/inbox" className="twin-link mt-6 inline-block text-sm">
          {t("recruiterJobs.inboxLink")}
        </Link>
        <p className="twin-muted mt-4 text-sm leading-relaxed">
          <Link href="/recruiter/pipeline" className="twin-link font-medium">
            {t("jobPipeline.openPipeline")}
          </Link>
        </p>
      </Card>
    </Shell>
  );
}
