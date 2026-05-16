/** Abstract “product UI” blocks — no stock imagery. */
export function PipelinePreview() {
  return (
    <div className="flex flex-col gap-3">
      {[0.65, 0.45, 0.55].map((w, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-3 shadow-sm"
        >
          <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-teal-200/90 via-emerald-100 to-amber-100 ring-1 ring-teal-200/60" />
          <div className="min-w-0 flex-1 space-y-2">
            <div
              className="h-2.5 max-w-full rounded-full bg-teal-200/80"
              style={{ width: `${w * 100}%` }}
            />
            <div className="h-2 max-w-[8rem] w-[42%] rounded-full bg-[var(--twin-border)]/90" />
          </div>
          <div className="hidden h-8 w-14 shrink-0 rounded-md border border-teal-200 bg-teal-50 sm:block" />
        </div>
      ))}
    </div>
  );
}
