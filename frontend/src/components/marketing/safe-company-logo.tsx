"use client";

import { useCallback, useEffect, useState } from "react";

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
 * `/_next/image` 400/404/502 when favicon CDNs fail. Initials stay visible
 * until a logo image loads; never an empty white plate.
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

  useEffect(() => {
    setLoaded(false);
  }, [step]);

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

  const initials = companyInitials(name);
  const src = exhausted ? undefined : urls[step];
  const showImage = Boolean(src) && loaded;

  return (
    <span
      className={`relative flex h-full w-full items-center justify-center ${className}`}
    >
      <span
        className={`${INITIALS_CLASS} ${showImage ? "opacity-0" : "opacity-100"}`}
        aria-hidden
      >
        {initials}
      </span>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- external favicons; skip /_next/image proxy
        <img
          src={src}
          alt=""
          width={96}
          height={32}
          loading={loading}
          decoding="async"
          referrerPolicy="no-referrer"
          className={`relative z-10 max-h-full max-w-full object-contain object-center transition-opacity ${showImage ? "opacity-95" : "opacity-0"} ${imgClassName}`}
          onError={onError}
          onLoad={onLoad}
        />
      ) : null}
    </span>
  );
}
