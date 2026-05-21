"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";

const STORAGE_TOKEN = "twin_recruiter_inbox_token";
const STORAGE_COMPANY = "twin_recruiter_company_slug";

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
  const [companySlug, setCompanySlug] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setToken(sessionStorage.getItem(STORAGE_TOKEN) || "");
      setCompanySlug(sessionStorage.getItem(STORAGE_COMPANY) || "");
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    const tkn = token.trim();
    const slug = companySlug.trim();
    if (!tkn || !slug) return;
    const q = new URLSearchParams({ company_slug: slug, token: tkn });
    const res = await fetch(`/api/recruiter/jobs?${q}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { items: JobRow[] };
    setJobs(data.items ?? []);
  }, [token, companySlug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    const tkn = token.trim();
    const slug = companySlug.trim();
    if (!tkn || !slug || !title.trim()) {
      toast.error(t("recruiterInbox.missingAuth"));
      return;
    }
    setBusy(true);
    try {
      sessionStorage.setItem(STORAGE_TOKEN, tkn);
      sessionStorage.setItem(STORAGE_COMPANY, slug);
      const q = new URLSearchParams({ company_slug: slug, token: tkn });
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
      <Card>
        <h1 className="mb-2 text-2xl font-semibold">{t("recruiterJobs.title")}</h1>
        <p className="twin-muted mb-6 text-sm">{t("recruiterJobs.lead")}</p>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <input
            className="twin-input"
            placeholder={t("recruiterJobs.tokenPlaceholder")}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <input
            className="twin-input"
            placeholder={t("recruiterJobs.companyPlaceholder")}
            value={companySlug}
            onChange={(e) => setCompanySlug(e.target.value)}
          />
        </div>
        <form onSubmit={(e) => void publish(e)} className="space-y-3">
          <input
            className="twin-input w-full"
            placeholder={t("recruiterJobs.fieldTitle")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className="twin-input w-full"
            placeholder={t("recruiterJobs.fieldLocation")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <textarea
            className="twin-input min-h-[6rem] w-full"
            placeholder={t("recruiterJobs.fieldDescription")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            className="twin-input w-full"
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
          <p className="twin-muted mt-2 text-sm">{t("recruiterJobs.empty")}</p>
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
      </Card>
    </Shell>
  );
}
