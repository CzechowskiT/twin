/** Derive active scene index from elapsed timeline position. */
export function indexForElapsed(
  scenes: readonly { durationMs: number }[],
  elapsedMs: number,
): number {
  let offset = 0;
  for (let i = 0; i < scenes.length; i++) {
    offset += scenes[i]?.durationMs ?? 0;
    if (elapsedMs < offset) return i;
  }
  return Math.max(0, scenes.length - 1);
}
