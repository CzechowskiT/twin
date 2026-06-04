"use client";

import { useCallback, useState } from "react";

import {
  advanceLogoFallbackStep,
  companyInitials,
} from "@/lib/brand-logo-urls";

type SafeCompanyLogoProps = {
  name: string;
  urls: readonly string[];
  className?: string;
  imgClassName?: string;
  loading?: "eager" | "lazy";
};

const INITIALS_CLASS =
  "absolute inset-0 flex items-center justify-center text-sm font-bold tracking-tight text-zinc-700";

/**
 * External company marks without Next.js image optimizer — avoids noisy
 * `/_next/image` 400/404/502 when favicon CDNs fail. Initials only when every
 * URL fails (or none configured). On `onError`, unmount the broken `<img>`
 * immediately so the browser never shows the torn-photo glyph.
 */
export function SafeCompanyLogo({
  name,
  urls,
  className = "",
  imgClassName = "",
  loading = "eager",
}: SafeCompanyLogoProps) {
  const [step, setStep] = useState(0);
  const [exhausted, setExhausted] = useState(urls.length === 0);
  const [errorAtStep, setErrorAtStep] = useState(-1);

  const onError = useCallback(() => {
    setErrorAtStep(step);
    const next = advanceLogoFallbackStep(step, urls.length);
    if (next === null) {
      setExhausted(true);
      return;
    }
    setStep(next);
  }, [step, urls.length]);

  const initials = companyInitials(name);
  const src = exhausted ? undefined : urls[step];
  const imgBroken = errorAtStep === step;
  const showImg = Boolean(src) && !imgBroken;
  const showInitials = !showImg;

  return (
    <span
      className={`relative flex h-full w-full items-center justify-center ${className}`}
    >
      <span
        className={`${INITIALS_CLASS} ${showInitials ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-hidden
      >
        {initials}
      </span>
      {showImg && src ? (
        // eslint-disable-next-line @next/next/no-img-element -- external favicons; skip /_next/image proxy
        <img
          key={src}
          src={src}
          alt=""
          width={96}
          height={32}
          loading={loading}
          decoding="async"
          referrerPolicy="no-referrer"
          className={`relative z-10 max-h-full max-w-full object-contain object-center opacity-95 ${imgClassName}`}
          onError={onError}
        />
      ) : null}
    </span>
  );
}
