/** Abstract “product UI” blocks — no stock imagery. */
export function PipelinePreview() {
  return (
    <div className="flex flex-col gap-3">
      {[0.65, 0.45, 0.55].map((w, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/40 p-3 backdrop-blur-sm"
        >
          <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-violet-500/25 via-fuchsia-500/15 to-sky-500/25 ring-1 ring-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div
              className="h-2.5 max-w-full rounded-full bg-white/[0.12]"
              style={{ width: `${w * 100}%` }}
            />
            <div className="h-2 max-w-[8rem] w-[42%] rounded-full bg-white/[0.06]" />
          </div>
          <div className="hidden h-8 w-14 shrink-0 rounded-md border border-emerald-500/20 bg-emerald-500/10 sm:block" />
        </div>
      ))}
    </div>
  );
}
