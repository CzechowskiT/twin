"use client";

/** PP1 — root loading uses LanguageProvider; this segment stays translation-free and storage-free. */
export default function PublicPreviewLoading() {
  return (
    <div
      className="mx-auto flex min-h-[40vh] max-w-3xl flex-col items-center justify-center gap-3 px-4 py-16"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="public-preview-loading"
    >
      <span className="sr-only">Loading</span>
      <div
        className="h-10 w-10 shrink-0 animate-spin rounded-full border-2 border-[var(--twin-border)] border-t-[var(--foreground)] motion-reduce:animate-none"
        aria-hidden
      />
      <p className="text-sm text-[var(--twin-muted-strong)]">Loading…</p>
    </div>
  );
}
