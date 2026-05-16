/** Deep-merge plain objects for locale overlays; arrays are replaced, not merged. */
export function mergeDeep<T extends Record<string, unknown>>(
  base: T,
  patch: Record<string, unknown>,
): T {
  const out = structuredClone(base) as T;
  for (const key of Object.keys(patch)) {
    const pk = patch[key];
    const existing = (out as Record<string, unknown>)[key];
    if (
      pk !== null &&
      typeof pk === "object" &&
      !Array.isArray(pk) &&
      existing !== null &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      (out as Record<string, unknown>)[key] = mergeDeep(
        existing as Record<string, unknown>,
        pk as Record<string, unknown>,
      );
    } else {
      (out as Record<string, unknown>)[key] = pk;
    }
  }
  return out;
}
