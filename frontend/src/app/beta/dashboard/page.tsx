"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import {
  BETA_REFERRAL_STORAGE_KEY,
  betaDashboard,
  betaLinkedInShare,
  betaMatchPreview,
  betaTestimonial,
  betaUploadCv,
  type BetaDashboard,
  type BetaMatchItem,
} from "@/lib/beta-api";

function DashboardInner() {
  const sp = useSearchParams();
  const [code, setCode] = useState("");
  const [dash, setDash] = useState<BetaDashboard | null>(null);
  const [matches, setMatches] = useState<BetaMatchItem[] | null>(null);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = sp.get("code") || localStorage.getItem(BETA_REFERRAL_STORAGE_KEY) || "";
    setCode(c);
  }, [sp]);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    void betaDashboard(code)
      .then((d) => {
        if (alive) {
          setDash(d);
          setTitle(d.job_title || "Product Manager");
        }
      })
      .catch((e: unknown) => {
        if (alive) setErr(e instanceof Error ? e.message : "Load failed");
      });
    return () => {
      alive = false;
    };
  }, [code]);

  async function refresh() {
    if (!code) return;
    setDash(await betaDashboard(code));
  }

  async function onCv(f: File | null) {
    if (!code || !f) return;
    setBusy(true);
    setErr(null);
    try {
      const out = await betaUploadCv(code, f);
      if (out.matches) setMatches(out.matches);
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "CV failed");
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    if (!code) return;
    setBusy(true);
    try {
      await betaLinkedInShare(code);
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Share flag failed");
    } finally {
      setBusy(false);
    }
  }

  async function onTestimonial() {
    if (!code) return;
    setBusy(true);
    try {
      await betaTestimonial(code);
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function preview() {
    if (!code) return;
    setBusy(true);
    try {
      const out = await betaMatchPreview(title);
      setMatches(out.matches);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const refLink = code ? `${origin}/beta?ref=${encodeURIComponent(code)}` : "";

  if (!code) {
    return (
      <div className="beta-container max-w-lg">
        <p className="text-sm text-[var(--beta-muted)]">Missing referral code. Join from the landing page first.</p>
        <Link href="/beta/join" className="mt-4 inline-block text-[var(--beta-blue)] underline">
          Join
        </Link>
      </div>
    );
  }

  return (
    <div className="beta-container max-w-2xl space-y-6">
      <h1 className="beta-hero-title text-3xl">Your beta spot</h1>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {dash ? (
        <div className="beta-card space-y-2 text-sm">
          <p>
            Position <strong>#{dash.position}</strong> · priority {dash.priority_points} · referrals{" "}
            {dash.referrals_count}
          </p>
          <p className="text-[var(--beta-muted)]">Spots left: {dash.spots_left}</p>
          <ul className="list-inside list-disc text-[var(--beta-muted)]">
            <li>LinkedIn share bonus: {dash.linkedin_shared ? "claimed" : "open"}</li>
            <li>CV upload: {dash.cv_uploaded ? "yes" : "no"}</li>
            <li>Voice note: {dash.voice_recorded ? "yes" : "no"}</li>
            <li>Testimonial bonus: {dash.testimonial_posted ? "claimed" : "open"}</li>
          </ul>
        </div>
      ) : (
        <p className="text-sm text-[var(--beta-muted)]">Loading…</p>
      )}

      <div className="beta-card space-y-3">
        <h2 className="font-bold">Referral link</h2>
        <p className="break-all text-xs">{refLink}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="beta-cta beta-cta-secondary" disabled={busy} onClick={onShare}>
            Claim LinkedIn share (+5)
          </button>
          <button type="button" className="beta-cta beta-cta-ghost" disabled={busy} onClick={onTestimonial}>
            Claim testimonial post (+50)
          </button>
          <button type="button" className="beta-cta beta-cta-ghost" onClick={() => void navigator.clipboard.writeText(refLink)}>
            Copy
          </button>
        </div>
      </div>

      <div className="beta-card space-y-3">
        <h2 className="font-bold">Upload CV (+3, preview)</h2>
        <input type="file" accept=".pdf,.docx,.txt" disabled={busy} onChange={(e) => onCv(e.target.files?.[0] ?? null)} />
      </div>

      <div className="beta-card space-y-3">
        <h2 className="font-bold">Match preview</h2>
        <input className="beta-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button type="button" className="beta-cta beta-cta-primary" disabled={busy} onClick={preview}>
          Refresh preview
        </button>
        {matches?.length ? (
          <ul className="space-y-2 text-sm">
            {matches.map((m) => (
              <li key={m.url} className="rounded border border-[rgb(11_18_32/0.08)] px-2 py-1">
                {m.score}% — {m.title} ({m.company})
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Link href="/beta" className="text-sm text-[var(--beta-blue)] underline">
        ← Landing
      </Link>
    </div>
  );
}

export default function BetaDashboardPage() {
  return (
    <Suspense fallback={<div className="beta-container p-8 text-sm">Loading…</div>}>
      <DashboardInner />
    </Suspense>
  );
}
