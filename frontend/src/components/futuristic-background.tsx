/** Full-viewport page background: gray base + soft blue mesh + top band. */
export function FuturisticBackground() {
  return (
    <div aria-hidden className="twin-bg-root pointer-events-none">
      <div className="twin-bg-base" />
      <div className="twin-bg-mesh" />
      <div className="twin-bg-band" />
    </div>
  );
}
