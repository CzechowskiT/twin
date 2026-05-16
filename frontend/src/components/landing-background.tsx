type LandingBackgroundProps = {
  /** Full-viewport layer behind the global header (home only). */
  fixed?: boolean;
};

/** Dark hero mesh (inspired by premium AI landing pages): soft orbs + subtle grid, no pointer events. */
export function LandingBackground({ fixed = false }: LandingBackgroundProps) {
  const position = fixed ? "fixed inset-0 z-[-10]" : "absolute inset-0";
  return (
    <div aria-hidden className={`pointer-events-none overflow-hidden ${position}`}>
      <div className="absolute inset-0 bg-[#030306]" />
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 15% -10%, rgb(59 130 246 / 0.35), transparent 55%), radial-gradient(ellipse 60% 45% at 85% 10%, rgb(168 85 247 / 0.2), transparent 50%), radial-gradient(ellipse 50% 40% at 50% 100%, rgb(14 165 233 / 0.12), transparent 55%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(255 255 255 / 0.06) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.06) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}
