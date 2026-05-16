/** Shown while the active route segment loads — keeps layout stable (header/footer stay put). */
export default function Loading() {
  return (
    <div
      className="twin-container flex min-h-[min(50vh,28rem)] flex-col items-center justify-center gap-4 py-16"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading</span>
      <div
        className="h-10 w-10 shrink-0 animate-spin rounded-full border-2 border-[var(--twin-border)] border-t-[var(--twin-accent)] motion-reduce:animate-none motion-reduce:border-[var(--twin-accent)] motion-reduce:opacity-70"
        aria-hidden
      />
      <p className="text-sm font-medium text-[var(--twin-muted-strong)]">Loading…</p>
    </div>
  );
}
