import type { TranslationKey } from "@/lib/i18n";

export const DEMO_SEQUENCE_STEPS = [
  "demo.stepScanJobs",
  "demo.stepMatch",
  "demo.stepTailor",
  "demo.stepSubmit",
  "demo.stepCalendar",
] as const satisfies readonly TranslationKey[];

/** Per-step dwell time (ms) — each beat ~1–2s. */
export const DEMO_STEP_MS = [1500, 1800, 1600, 1500, 1700] as const;

export type DemoStepState = "pending" | "active" | "done";
export type DemoPlayPhase = "idle" | "playing" | "done";

export const DEMO_MATCH_SCORE_START = 62;

export function createInitialDemoStepStates(): DemoStepState[] {
  return DEMO_SEQUENCE_STEPS.map(() => "pending");
}

export function jumpToDemoStepStates(idx: number): DemoStepState[] {
  return DEMO_SEQUENCE_STEPS.map((_, i) =>
    i < idx ? "done" : i === idx ? "active" : "pending",
  ) as DemoStepState[];
}

export type AdvanceDemoStepResult = {
  states: DemoStepState[];
  /** True when the final step was just completed. */
  completed: boolean;
};

/** Advance one step in manual mode; does not affect auto-play phase. */
export function advanceDemoStepStates(prev: DemoStepState[]): AdvanceDemoStepResult {
  const next = [...prev];
  const active = next.indexOf("active");
  if (active >= 0) {
    next[active] = "done";
    if (active + 1 < next.length) {
      next[active + 1] = "active";
      return { states: next, completed: false };
    }
    return { states: next, completed: true };
  }
  const firstP = next.indexOf("pending");
  if (firstP >= 0) {
    for (let j = 0; j < firstP; j += 1) next[j] = "done";
    next[firstP] = "active";
    return { states: next, completed: false };
  }
  return { states: next, completed: false };
}

export function activeDemoStepIndex(states: DemoStepState[]): number {
  return states.findIndex((s) => s === "active");
}

/** Run with: npm run test:demo-sequence */
export function verifyDemoStepSequenceLogic(): void {
  let states = createInitialDemoStepStates();
  const r1 = advanceDemoStepStates(states);
  states = r1.states;
  if (activeDemoStepIndex(states) !== 0) throw new Error("expected step 0 active");
  const r2 = advanceDemoStepStates(states);
  states = r2.states;
  if (activeDemoStepIndex(states) !== 1) throw new Error("expected step 1 active");
  states = jumpToDemoStepStates(3);
  if (activeDemoStepIndex(states) !== 3) throw new Error("expected jump to step 3");

  states = createInitialDemoStepStates();
  for (let i = 0; i < DEMO_SEQUENCE_STEPS.length; i += 1) {
    const r = advanceDemoStepStates(states);
    states = r.states;
    if (r.completed) throw new Error(`completed early at step ${i}`);
    if (activeDemoStepIndex(states) !== i) throw new Error(`expected active step ${i}`);
  }
  const final = advanceDemoStepStates(states);
  if (!final.completed) throw new Error("expected completed on final advance");
}
