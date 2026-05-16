/** Full-viewport background: soft green-tint base + teal/amber mesh + top band (shared app + marketing). */
export function FuturisticBackground() {
  return (
    <div aria-hidden className="twin-bg-root pointer-events-none">
      <div className="twin-bg-base" />
      <div className="twin-bg-mesh" />
      <div className="twin-bg-band" />
    </div>
  );
}
