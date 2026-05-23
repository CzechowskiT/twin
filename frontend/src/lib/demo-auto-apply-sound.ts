/** Optional UI ticks for demo beats — off by default; respects reduced motion. */

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

export function playDemoStepChime(enabled: boolean): void {
  if (!enabled) return;
  const ac = ctx();
  if (!ac) return;
  void ac.resume().then(() => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = 520;
    gain.gain.value = 0.04;
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.14);
  });
}

export function playDemoSuccessChime(enabled: boolean): void {
  if (!enabled) return;
  const ac = ctx();
  if (!ac) return;
  void ac.resume().then(() => {
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.035;
      const t0 = ac.currentTime + i * 0.08;
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 0.22);
    });
  });
}
