export type NatureVariant =
  | "canopy"
  | "meadow"
  | "stream"
  | "garden"
  | "dawn"
  | "sprout"
  | "growth"
  | "shade"
  | "trail";

/** Map URL → ambient “place” (soft nature motion stays on-brand across the app). */
export function resolveNatureVariant(pathname: string): NatureVariant {
  const p = pathname.split("?")[0] ?? "/";
  if (p === "/" || p === "") return "canopy";
  if (p.startsWith("/dashboard")) return "stream";
  if (p.startsWith("/profile")) return "garden";
  if (
    p.startsWith("/login") ||
    p.startsWith("/forgot-password") ||
    p.startsWith("/reset-password") ||
    p.startsWith("/auth/")
  ) {
    return "dawn";
  }
  if (p.startsWith("/register")) return "sprout";
  if (p.startsWith("/calculator")) return "growth";
  if (p.startsWith("/privacy")) return "shade";
  if (p.startsWith("/onboarding-assistant")) return "trail";
  return "meadow";
}

type NatureBackgroundProps = {
  variant: NatureVariant;
};

/**
 * Full-viewport soft green canvas + route-tinted mesh + slow organic blobs (CSS only).
 * Each variant nudges gradients and motion to match the screen’s intent.
 */
export function NatureBackground({ variant }: NatureBackgroundProps) {
  return (
    <div aria-hidden className={`twin-bg-root twin-nature twin-nature--${variant}`}>
      <div className="twin-nature-base" />
      <div className="twin-nature-mesh" />
      <div className="twin-nature-band" />
      <div className="twin-nature-orbs">
        <div className="twin-nature-orb twin-nature-orb--1" />
        <div className="twin-nature-orb twin-nature-orb--2" />
        <div className="twin-nature-orb twin-nature-orb--3" />
      </div>
    </div>
  );
}
