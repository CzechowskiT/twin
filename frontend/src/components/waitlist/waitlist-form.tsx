"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { trackEvent } from "@/lib/analytics";
import { fetchOpsHealth } from "@/lib/ops-health";
import { betaJoin, BETA_REFERRAL_STORAGE_KEY, type BetaJoinResult } from "@/lib/beta-api";
import { betaDashboardUrl } from "@/lib/waitlist/deep-links";
import { formatWaitlist } from "@/lib/waitlist-messages";
import { useTranslation } from "@/components/language-provider";
import { useWaitlistCopy } from "@/lib/waitlist/use-waitlist-copy";
import { safeStorage } from "@/lib/safe-storage";

type FormData = {
  email: string;
  acceptPrivacy: boolean;
  acceptEmail: boolean;
};

function WaitlistFormInner({
  spotsRemaining,
  signupsToday,
  cap,
  compact = false,
}: {
  spotsRemaining: number;
  signupsToday: number;
  cap: number;
  compact?: boolean;
}) {
  const copy = useWaitlistCopy();
  const { locale } = useTranslation();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [join, setJoin] = useState<BetaJoinResult | null>(null);
  const [mailConfigured, setMailConfigured] = useState<boolean | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(copy.validationEmail),
        acceptPrivacy: z.boolean().refine((v) => v === true, { message: copy.validationConsent }),
        acceptEmail: z.boolean().refine((v) => v === true, { message: copy.validationConsent }),
      }),
    [copy.validationEmail, copy.validationConsent],
  );

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) safeStorage.setItem(BETA_REFERRAL_STORAGE_KEY, ref.trim().toLowerCase());
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setBusy(true);
    try {
      const ref = safeStorage.getItem(BETA_REFERRAL_STORAGE_KEY);
      const res = await betaJoin({
        email: data.email,
        referred_by: ref,
        source: "waitlist",
        locale: locale === "pl" ? "pl" : "en",
        accept_privacy_notice: true,
        consent_beta_email_updates: true,
      });
      setJoin(res);
      void fetchOpsHealth().then((ops) => {
        if (ops) setMailConfigured(ops.mail_configured);
      });
      safeStorage.setItem(BETA_REFERRAL_STORAGE_KEY, res.referral_code);
      trackEvent("waitlist_signup", {
        source: "waitlist",
        position: res.position,
        spots_left: res.spots_left,
      });
      void confetti({ particleCount: 120, spread: 70, origin: { y: 0.65 } });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : copy.formErrorGeneric);
    } finally {
      setBusy(false);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = join ? `${origin}/waitlist?ref=${join.referral_code}` : "";

  if (join) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="wl-form-card">
        <p className="text-5xl">🎉</p>
        <h3 className="mt-3 text-2xl font-bold text-white">{copy.formSuccessTitle}</h3>
        <p className="mt-2 text-lg text-[var(--wl-text-secondary)]">
          {formatWaitlist(copy.formSuccessPosition, { position: join.position })}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <input readOnly value={referralLink} className="wl-input min-w-0 flex-1 text-sm" aria-label={copy.formCopy} />
          <button
            type="button"
            className="wl-btn-secondary shrink-0"
            onClick={() => void navigator.clipboard.writeText(referralLink)}
          >
            {copy.formCopy}
          </button>
          {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
            <button
              type="button"
              className="wl-btn-secondary shrink-0"
              onClick={() =>
                void navigator.share({
                  title: "TWIN Wishlist",
                  text: copy.formReferralHint,
                  url: referralLink,
                })
              }
            >
              {copy.formShare}
            </button>
          ) : null}
        </div>
        <p className="mt-4 text-sm text-[var(--wl-text-secondary)]">{copy.formReferralHint}</p>
        {join.welcome_email_sent ? (
          <p className="mt-3 text-sm text-emerald-300/95">{copy.formWelcomeMailSent}</p>
        ) : mailConfigured === false ? (
          <p className="mt-3 text-sm text-amber-300/90">{copy.formWelcomeMailDeferred}</p>
        ) : null}
        <Link
          href={betaDashboardUrl(origin, join.referral_code)}
          className="wl-btn-primary mt-6 inline-block text-center no-underline"
        >
          {copy.formOpenDashboard}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      className={compact ? "wl-form-card wl-form-card--compact" : "wl-form-card"}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      {!compact ? (
        <p className="text-center text-sm font-bold uppercase tracking-wider text-cyan-400">
          {formatWaitlist(copy.formJoinCap, { cap })}
        </p>
      ) : null}
      <label
        htmlFor={compact ? "wl-email-2" : "wl-email"}
        className="mt-4 block text-sm font-medium text-[var(--wl-text-secondary)]"
      >
        {copy.formEmailLabel}
      </label>
      <input
        {...register("email")}
        id={compact ? "wl-email-2" : "wl-email"}
        type="email"
        placeholder={copy.formEmailPlaceholder}
        className="wl-input mt-2"
        autoComplete="email"
      />
      {errors.email ? <p className="mt-1 text-sm text-red-400">{errors.email.message}</p> : null}
      <label className="mt-4 flex items-start gap-2 text-xs text-[var(--wl-text-muted)]">
        <input type="checkbox" {...register("acceptPrivacy")} className="mt-0.5" />
        <span>
          {copy.formPrivacyPrefix}{" "}
          <Link href="/privacy" className="text-cyan-400 underline">
            {copy.formPrivacyLink}
          </Link>
        </span>
      </label>
      <label className="mt-2 flex items-start gap-2 text-xs text-[var(--wl-text-muted)]">
        <input type="checkbox" {...register("acceptEmail")} className="mt-0.5" />
        <span>{copy.formEmailConsent}</span>
      </label>
      {(errors.acceptPrivacy || errors.acceptEmail) && (
        <p className="mt-1 text-sm text-red-400">{copy.formConsentsError}</p>
      )}
      <button type="submit" disabled={busy} className="wl-btn-primary wl-btn-pulse mt-6 w-full">
        {busy ? copy.formSubmitting : copy.formSubmit}
      </button>
      <div className="mt-5 flex flex-wrap justify-between gap-2 text-xs text-cyan-400">
        <span className="flex items-center gap-2">
          <span className="wl-live-dot" aria-hidden />
          {formatWaitlist(copy.formSpotsLine, { remaining: spotsRemaining, cap })}
        </span>
        <span>{formatWaitlist(copy.formTodayLine, { today: signupsToday })}</span>
      </div>
      {!compact ? (
        <ul className="mt-4 space-y-1 border-t border-white/10 pt-4 text-center text-xs text-[var(--wl-text-muted)]">
          <li>{copy.formBullet1}</li>
          <li>{copy.formBullet2}</li>
          <li>{copy.formBullet3}</li>
        </ul>
      ) : null}
    </motion.form>
  );
}

export function WaitlistForm(props: {
  spotsRemaining: number;
  signupsToday: number;
  cap: number;
  compact?: boolean;
}) {
  return (
    <Suspense fallback={<div className="wl-form-card h-48 animate-pulse" aria-hidden />}>
      <WaitlistFormInner {...props} />
    </Suspense>
  );
}
