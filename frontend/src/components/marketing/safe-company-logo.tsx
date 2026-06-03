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

/**
 * External company marks without Next.js image optimizer — avoids noisy
 * `/_next/image` 400/404/502 when favicon CDNs fail. Falls back to initials.
 */
export function SafeCompanyLogo({
  name,
  urls,
  className = "",
  imgClassName = "",
  loading = "eager",
}: SafeCompanyLogoProps) {
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [exhausted, setExhausted] = useState(urls.length === 0);

  const onError = useCallback(() => {
    setLoaded(false);
    const next = advanceLogoFallbackStep(step, urls.length);
    if (next === null) {
      setExhausted(true);
      return;
    }
    setStep(next);
  }, [step, urls.length]);

  const onLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  if (exhausted) {
    return (
      <span
        className={`flex h-full w-full items-center justify-center text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-600 ${className}`}
        aria-hidden
      >
        {companyInitials(name)}
      </span>
    );
  }

  const src = urls[step];
  if (!src) {
    return (
      <span
        className={`flex h-full w-full items-center justify-center text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-600 ${className}`}
        aria-hidden
      >
        {companyInitials(name)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external favicons; skip /_next/image proxy
    <img
      src={src}
      alt=""
      width={96}
      height={32}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      className={`max-h-full max-w-full object-contain object-center transition-opacity ${loaded ? "opacity-95" : "opacity-0"} ${imgClassName}`}
      onError={onError}
      onLoad={onLoad}
    />
  );
}
