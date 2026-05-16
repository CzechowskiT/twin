type LandingBackgroundProps = {
  /** Full-viewport layer behind the global header (home only). */
  fixed?: boolean;
};

/** Aurora + dot grid on near-black (#09090B); pointer-events none. */
export function LandingBackground({ fixed = false }: LandingBackgroundProps) {
  const position = fixed ? "fixed inset-0 z-[-10]" : "absolute inset-0";
  return (
    <div aria-hidden className={`pointer-events-none overflow-hidden ${position}`}>
      <div className="absolute inset-0 bg-[#09090B]" />

      {/* Soft aurora blobs — heavy blur (Linear / Vercel style) */}
      <div
        className="absolute -left-[20%] top-[-25%] h-[min(100vw,720px)] w-[min(100vw,720px)] rounded-full bg-violet-600/[0.22] blur-[100px]"
        style={{ transform: "translateZ(0)" }}
      />
      <div
        className="absolute -right-[15%] top-[5%] h-[min(90vw,560px)] w-[min(90vw,560px)] rounded-full bg-sky-500/[0.18] blur-[100px]"
        style={{ transform: "translateZ(0)" }}
      />
      <div
        className="absolute bottom-[-20%] left-[25%] h-[min(85vw,520px)] w-[min(85vw,520px)] rounded-full bg-emerald-500/[0.08] blur-[110px]"
        style={{ transform: "translateZ(0)" }}
      />

      {/* Fine line grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.07) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      {/* Dot texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(rgb(255 255 255 / 0.5) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
    </div>
  );
}
