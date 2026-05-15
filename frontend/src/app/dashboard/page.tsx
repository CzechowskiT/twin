"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

type User = { id: number; email: string };
type JobList = { items: { id: number; title: string; company: string; job_board: string }[]; total: number };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<JobList | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    Promise.all([
      apiFetch<User>("/api/v1/auth/me", {}, token),
      apiFetch<JobList>("/api/v1/jobs/?limit=10", {}, token),
    ])
      .then(([u, j]) => {
        setUser(u);
        setJobs(j);
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  async function triggerScrape(board: string) {
    const token = getToken();
    if (!token) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/jobs/scrape/${board}`, { method: "POST" }, token);
      alert(`Scrape queued for ${board}. Refresh in a minute.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scrape failed");
    }
  }

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button type="button" onClick={logout} className="!w-auto px-4">
          Log out
        </Button>
      </div>
      {user && (
        <Card>
          <p className="text-sm text-zinc-500">Signed in as</p>
          <p className="font-medium">{user.email}</p>
        </Card>
      )}
      <Card>
        <h2 className="mb-4 font-medium">Scrape jobs</h2>
        <div className="flex gap-3">
          <Button type="button" onClick={() => triggerScrape("pracuj")} className="!w-auto flex-1">
            pracuj.pl
          </Button>
          <Button type="button" onClick={() => triggerScrape("rocketjobs")} className="!w-auto flex-1">
            rocketjobs.pl
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>
      <Card>
        <h2 className="mb-4 font-medium">Validated jobs ({jobs?.total ?? 0})</h2>
        <ul className="space-y-3 text-sm">
          {jobs?.items.map((job) => (
            <li key={job.id} className="border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <span className="font-medium">{job.title}</span>
              <span className="text-zinc-500"> — {job.company} ({job.job_board})</span>
            </li>
          ))}
          {!jobs?.items.length && <li className="text-zinc-500">No jobs yet. Run a scrape.</li>}
        </ul>
      </Card>
    </Shell>
  );
}
