"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in host logs (Vercel / Railway) without leaking to end users in UI.
    console.error(error);
  }, [error]);

  return (
    <div className="twin-container max-w-lg py-16 text-center">
      <h1 className="text-xl font-semibold text-[var(--foreground)]">Something went wrong</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--twin-muted)]">
        Please try again. If the problem persists, refresh the page.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="twin-btn-solid twin-touch-target mt-8 !w-auto min-w-[10rem] px-6"
      >
        Try again
      </button>
    </div>
  );
}
