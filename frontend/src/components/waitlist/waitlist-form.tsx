"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { betaJoin, type BetaJoinResult } from "@/lib/beta-api";
import { BETA_REFERRAL_STORAGE_KEY } from "@/lib/beta-api";
import { safeStorage } from "@/lib/safe-storage";

const schema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
  acceptPrivacy: z.boolean().refine((v) => v === true, { message: "Wymagana zgoda" }),
  acceptEmail: z.boolean().refine((v) => v === true, { message: "Wymagana zgoda" }),
});

type FormData = z.infer<typeof schema>;

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
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [join, setJoin] = useState<BetaJoinResult | null>(null);

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
        accept_privacy_notice: true,
        consent_beta_email_updates: true,
      });
      setJoin(res);
      safeStorage.setItem(BETA_REFERRAL_STORAGE_KEY, res.referral_code);
      void confetti({ particleCount: 120, spread: 70, origin: { y: 0.65 } });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Wystąpił błąd. Spróbuj ponownie.");
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
        <h3 className="mt-3 text-2xl font-bold text-white">Jesteś na liście!</h3>
        <p className="mt-2 text-lg text-[var(--wl-text-secondary)]">
          Pozycja: <span className="font-bold text-cyan-400">#{join.position}</span>
        </p>
        <motion.div className="mt-6 flex gap-2" layout>
          <input readOnly value={referralLink} className="wl-input flex-1 text-sm" aria-label="Link referralny" />
          <button type="button" className="wl-btn-secondary shrink-0" onClick={() => void navigator.clipboard.writeText(referralLink)}>
            Kopiuj
          </button>
        </motion.div>
        <p className="mt-4 text-sm text-[var(--wl-text-secondary)]">
          Zaproś znajomych — każda osoba = wyższa pozycja na liście.
        </p>
        <Link href="/beta/dashboard" className="wl-btn-primary mt-6 inline-block text-center no-underline">
          Otwórz panel waitlisty
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
        <p className="text-center text-sm font-bold uppercase tracking-wider text-cyan-400">🎯 Dołącz do pierwszych {cap}</p>
      ) : null}
      <label htmlFor={compact ? "wl-email-2" : "wl-email"} className="mt-4 block text-sm font-medium text-[var(--wl-text-secondary)]">
        Twój email (developer)
      </label>
      <input
        {...register("email")}
        id={compact ? "wl-email-2" : "wl-email"}
        type="email"
        placeholder="jan.kowalski@gmail.com"
        className="wl-input mt-2"
        autoComplete="email"
      />
      {errors.email ? <p className="mt-1 text-sm text-red-400">{errors.email.message}</p> : null}
      <label className="mt-4 flex items-start gap-2 text-xs text-[var(--wl-text-muted)]">
        <input type="checkbox" {...register("acceptPrivacy")} className="mt-0.5" />
        <span>
          Akceptuję{" "}
          <Link href="/privacy" className="text-cyan-400 underline">
            politykę prywatności
          </Link>
        </span>
      </label>
      <label className="mt-2 flex items-start gap-2 text-xs text-[var(--wl-text-muted)]">
        <input type="checkbox" {...register("acceptEmail")} className="mt-0.5" />
        <span>Zgoda na email o kolejce i beta (wymagane)</span>
      </label>
      {(errors.acceptPrivacy || errors.acceptEmail) && (
        <p className="mt-1 text-sm text-red-400">Zaznacz obie zgody, aby dołączyć.</p>
      )}
      <button type="submit" disabled={busy} className="wl-btn-primary wl-btn-pulse mt-6 w-full">
        {busy ? "Zapisuję…" : "Zdobądź darmowy dostęp na zawsze ✨"}
      </button>
      <motion.div className="mt-5 flex flex-wrap justify-between gap-2 text-xs text-cyan-400" layout>
        <span className="flex items-center gap-2">
          <span className="wl-live-dot" aria-hidden />
          Pozostało: <strong>{spotsRemaining}</strong>/{cap}
        </span>
        <span>⚡ Dziś: <strong>{signupsToday}</strong> zapisów</span>
      </motion.div>
      {!compact ? (
        <ul className="mt-4 space-y-1 border-t border-white/10 pt-4 text-center text-xs text-[var(--wl-text-muted)]">
          <li>✓ Dożywotni darmowy dostęp dla Early Adopters</li>
          <li>✓ Zero kart kredytowych</li>
          <li>✓ Dostęp w ciągu 14 dni od rejestracji</li>
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
    <Suspense fallback={<motion.div className="wl-form-card h-48 animate-pulse" aria-hidden />}>
      <WaitlistFormInner {...props} />
    </Suspense>
  );
}
