"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

import {
  BETA_REFERRAL_STORAGE_KEY,
  betaDashboard,
  betaJoin,
  betaLinkedInShare,
  betaPatchProfile,
  betaUploadVoice,
  type BetaDashboard,
  type BetaJoinResult,
} from "@/lib/beta-api";

function JoinInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [voice, setVoice] = useState<File | null>(null);
  const [join, setJoin] = useState<BetaJoinResult | null>(null);
  const [dash, setDash] = useState<BetaDashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = sp.get("step");
    if (s === "2" || s === "3" || s === "4") {
      const n = Number(s);
      queueMicrotask(() => setStep(n));
    }
  }, [sp]);

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const ref = localStorage.getItem(BETA_REFERRAL_STORAGE_KEY);
      const res = await betaJoin({ email, name: name || undefined, referred_by: ref, source: "email" });
      setJoin(res);
      localStorage.setItem(BETA_REFERRAL_STORAGE_KEY, res.referral_code);
      setStep(2);
    } catch (x: unknown) {
      setErr(x instanceof Error ? x.message : "Join failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(skip: boolean) {
    if (!join) return;
    setBusy(true);
    setErr(null);
    try {
      if (!skip) {
        await betaPatchProfile(join.referral_code, {
          job_title: jobTitle || null,
          location: location || null,
          min_salary: minSalary ? Number(minSalary) : null,
        });
      }
      setStep(3);
    } catch (x: unknown) {
      setErr(x instanceof Error ? x.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveVoice(skip: boolean) {
    if (!join) return;
    setBusy(true);
    setErr(null);
    try {
      if (!skip && voice) await betaUploadVoice(join.referral_code, voice);
      setStep(4);
      setDash(await betaDashboard(join.referral_code));
    } catch (x: unknown) {
      setErr(x instanceof Error ? x.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function markLinkedIn() {
    if (!join) return;
    setBusy(true);
    setErr(null);
    try {
      await betaLinkedInShare(join.referral_code);
      setDash(await betaDashboard(join.referral_code));
    } catch (x: unknown) {
      setErr(x instanceof Error ? x.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const refLink = join ? `${origin}/beta?ref=${join.referral_code}` : "";

  return (
    <div className="beta-container max-w-lg">
      <h1 className="beta-hero-title text-3xl">Join TWIN beta</h1>
      <p className="mt-2 text-sm text-[var(--beta-muted)]">Step {step} of 4 · referral boosts are server-side</p>
      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      {step === 1 ? (
        <form className="beta-card mt-6 space-y-4" onSubmit={onJoin}>
          <div>
            <label className="text-sm font-semibold">Email</label>
            <input className="beta-input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold">Name (optional)</label>
            <input className="beta-input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button className="beta-cta beta-cta-primary w-full justify-center" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Join waitlist"}
          </button>
          <p className="text-xs text-[var(--beta-muted)]">
            By joining you accept we will email you about the beta. Full account + GDPR flow stays on{" "}
            <Link className="font-semibold text-[var(--beta-blue)] underline" href="/register">
              /register
            </Link>
            .
          </p>
        </form>
      ) : null}

      {step === 2 && join ? (
        <div className="beta-card mt-6 space-y-4">
          <p className="text-sm text-[var(--beta-muted)]">
            You are <strong>#{join.position}</strong> in line · spots left {join.spots_left}.
          </p>
          <div>
            <label className="text-sm font-semibold">Job title</label>
            <input className="beta-input mt-1" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold">Location</label>
            <input className="beta-input mt-1" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold">Min salary (optional)</label>
            <input
              className="beta-input mt-1"
              type="number"
              min={0}
              value={minSalary}
              onChange={(e) => setMinSalary(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" className="beta-cta beta-cta-ghost flex-1 justify-center" disabled={busy} onClick={() => saveProfile(true)}>
              Skip
            </button>
            <button type="button" className="beta-cta beta-cta-primary flex-1 justify-center" disabled={busy} onClick={() => saveProfile(false)}>
              Save
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 && join ? (
        <div className="beta-card mt-6 space-y-4">
          <h2 className="text-lg font-bold">Optional voice note (+50 priority)</h2>
          <input type="file" accept="audio/*" onChange={(e) => setVoice(e.target.files?.[0] ?? null)} />
          <div className="flex gap-2">
            <button type="button" className="beta-cta beta-cta-ghost flex-1 justify-center" disabled={busy} onClick={() => saveVoice(true)}>
              Skip
            </button>
            <button type="button" className="beta-cta beta-cta-primary flex-1 justify-center" disabled={busy} onClick={() => saveVoice(false)}>
              Upload
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 && join ? (
        <div className="beta-card mt-6 space-y-4">
          <h2 className="text-lg font-bold">You&apos;re in</h2>
          <p className="text-sm text-[var(--beta-muted)]">
            Position #{dash?.position ?? join.position} · referrals {dash?.referrals_count ?? 0}
          </p>
          <p className="break-all text-xs">{refLink}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="beta-cta beta-cta-secondary" disabled={busy} onClick={markLinkedIn}>
              Mark LinkedIn shared (+5)
            </button>
            <button
              type="button"
              className="beta-cta beta-cta-ghost"
              onClick={() => void navigator.clipboard.writeText(refLink)}
            >
              Copy
            </button>
            <button
              type="button"
              className="beta-cta beta-cta-primary"
              onClick={() => router.push(`/beta/dashboard?code=${encodeURIComponent(join.referral_code)}`)}
            >
              Dashboard
            </button>
          </div>
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm">
        <Link href="/beta" className="text-[var(--beta-blue)] underline">
          ← Beta landing
        </Link>
      </p>
    </div>
  );
}

export default function BetaJoinPage() {
  return (
    <Suspense fallback={<div className="beta-container p-8 text-sm text-[var(--beta-muted)]">Loading…</div>}>
      <JoinInner />
    </Suspense>
  );
}
