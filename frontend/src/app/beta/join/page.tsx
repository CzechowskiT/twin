"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
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
import { safeStorage } from "@/lib/safe-storage";

function fillParams(s: string, params: Record<string, string>): string {
  let out = s;
  for (const [k, v] of Object.entries(params)) {
    out = out.split(`{${k}}`).join(v);
  }
  return out;
}

function JoinInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { t } = useTranslation();
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
  const [acceptPrivacyNotice, setAcceptPrivacyNotice] = useState(false);
  const [consentBetaEmailUpdates, setConsentBetaEmailUpdates] = useState(false);

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
    if (!acceptPrivacyNotice || !consentBetaEmailUpdates) {
      setErr(t("betaJoin.consentsRequired"));
      setBusy(false);
      return;
    }
    try {
      const ref = safeStorage.getItem(BETA_REFERRAL_STORAGE_KEY);
      const res = await betaJoin({
        email,
        name: name || undefined,
        referred_by: ref,
        source: "email",
        accept_privacy_notice: true,
        consent_beta_email_updates: true,
      });
      setJoin(res);
      safeStorage.setItem(BETA_REFERRAL_STORAGE_KEY, res.referral_code);
      setStep(2);
    } catch (x: unknown) {
      setErr(x instanceof Error ? x.message : t("betaJoin.joinFailed"));
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
      setErr(x instanceof Error ? x.message : t("betaJoin.saveFailed"));
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
      setErr(x instanceof Error ? x.message : t("betaJoin.uploadFailed"));
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
      setErr(x instanceof Error ? x.message : t("betaJoin.updateFailed"));
    } finally {
      setBusy(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const refLink = join ? `${origin}/beta?ref=${join.referral_code}` : "";

  const stepLabel = fillParams(t("betaJoin.stepOf"), { step: String(step) });

  return (
    <div className="beta-container max-w-lg">
      <h1 className="beta-hero-title text-3xl">{t("betaJoin.title")}</h1>
      <p className="mt-2 text-sm text-[var(--beta-muted)]">{stepLabel}</p>
      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      {step === 1 ? (
        <form className="beta-card mt-6 space-y-4" onSubmit={onJoin}>
          <div>
            <label className="text-sm font-semibold">{t("betaJoin.email")}</label>
            <input
              className="beta-input mt-1"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-semibold">{t("betaJoin.nameOptional")}</label>
            <input className="beta-input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-sm text-[var(--beta-muted)]">
            <input
              type="checkbox"
              className="mt-1"
              checked={acceptPrivacyNotice}
              onChange={(e) => setAcceptPrivacyNotice(e.target.checked)}
            />
            <span>
              {t("betaJoin.privacyCheckbox")}{" "}
              <Link className="font-semibold text-[var(--beta-blue)] underline" href="/privacy" target="_blank">
                {t("betaJoin.privacyLink")}
              </Link>
              {t("betaJoin.privacyCheckboxAfter")}
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-[var(--beta-muted)]">
            <input
              type="checkbox"
              className="mt-1"
              checked={consentBetaEmailUpdates}
              onChange={(e) => setConsentBetaEmailUpdates(e.target.checked)}
            />
            <span>{t("betaJoin.emailUpdatesCheckbox")}</span>
          </label>
          <button
            className="beta-cta beta-cta-primary w-full justify-center"
            type="submit"
            disabled={busy || !acceptPrivacyNotice || !consentBetaEmailUpdates}
          >
            {busy ? t("betaJoin.saving") : t("betaJoin.joinWaitlist")}
          </button>
          <p className="text-xs text-[var(--beta-muted)]">
            {t("betaJoin.joinFootnote")}{" "}
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
            {fillParams(t("betaJoin.positionLine"), {
              position: String(join.position),
              spots: String(join.spots_left),
            })}
          </p>
          <div>
            <label className="text-sm font-semibold">{t("betaJoin.jobTitle")}</label>
            <input className="beta-input mt-1" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold">{t("betaJoin.location")}</label>
            <input className="beta-input mt-1" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold">{t("betaJoin.minSalaryOptional")}</label>
            <input
              className="beta-input mt-1"
              type="number"
              min={0}
              value={minSalary}
              onChange={(e) => setMinSalary(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="beta-cta beta-cta-ghost flex-1 justify-center"
              disabled={busy}
              onClick={() => saveProfile(true)}
            >
              {t("betaJoin.skip")}
            </button>
            <button
              type="button"
              className="beta-cta beta-cta-primary flex-1 justify-center"
              disabled={busy}
              onClick={() => saveProfile(false)}
            >
              {t("betaJoin.save")}
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 && join ? (
        <div className="beta-card mt-6 space-y-4">
          <h2 className="text-lg font-bold">{t("betaJoin.voiceHeading")}</h2>
          <input type="file" accept="audio/*" onChange={(e) => setVoice(e.target.files?.[0] ?? null)} />
          <div className="flex gap-2">
            <button
              type="button"
              className="beta-cta beta-cta-ghost flex-1 justify-center"
              disabled={busy}
              onClick={() => saveVoice(true)}
            >
              {t("betaJoin.skip")}
            </button>
            <button
              type="button"
              className="beta-cta beta-cta-primary flex-1 justify-center"
              disabled={busy}
              onClick={() => saveVoice(false)}
            >
              {t("betaJoin.upload")}
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 && join ? (
        <div className="beta-card mt-6 space-y-4">
          <h2 className="text-lg font-bold">{t("betaJoin.youreIn")}</h2>
          <p className="text-sm text-[var(--beta-muted)]">
            {fillParams(t("betaJoin.positionDash"), {
              position: String(dash?.position ?? join.position),
              referrals: String(dash?.referrals_count ?? 0),
            })}
          </p>
          <p className="break-all text-xs">{refLink}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="beta-cta beta-cta-secondary" disabled={busy} onClick={markLinkedIn}>
              {t("betaJoin.markLinkedIn")}
            </button>
            <button
              type="button"
              className="beta-cta beta-cta-ghost"
              onClick={() => void navigator.clipboard.writeText(refLink)}
            >
              {t("betaJoin.copy")}
            </button>
            <button
              type="button"
              className="beta-cta beta-cta-primary"
              onClick={() => router.push(`/beta/dashboard?code=${encodeURIComponent(join.referral_code)}`)}
            >
              {t("betaJoin.dashboard")}
            </button>
          </div>
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm">
        <Link href="/beta" className="text-[var(--beta-blue)] underline">
          {t("betaJoin.backLanding")}
        </Link>
      </p>
    </div>
  );
}

export default function BetaJoinPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={<div className="beta-container p-8 text-sm text-[var(--beta-muted)]">{t("betaJoin.loading")}</div>}
    >
      <JoinInner />
    </Suspense>
  );
}
