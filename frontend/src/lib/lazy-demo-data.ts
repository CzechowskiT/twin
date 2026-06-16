/** Route-scoped lazy demo loaders — capped payloads to limit multi-tab memory pressure. */

export const DEMO_ARRAY_CAP = 10;

export function capDemoArray<T>(items: readonly T[], cap = DEMO_ARRAY_CAP): T[] {
  return items.slice(0, cap);
}

let jobBriefDemoPromise: Promise<typeof import("@/lib/job-brief-demo-data")> | null = null;

export function loadJobBriefDemoModule() {
  jobBriefDemoPromise ??= import("@/lib/job-brief-demo-data");
  return jobBriefDemoPromise;
}

let employerPricingDemoPromise: Promise<typeof import("@/lib/employer-pricing-demo")> | null = null;

export function loadEmployerPricingDemoModule() {
  employerPricingDemoPromise ??= import("@/lib/employer-pricing-demo");
  return employerPricingDemoPromise;
}

let jobEmployerDemoPromise: Promise<typeof import("@/lib/job-employer-demo")> | null = null;

export function loadJobEmployerDemoModule() {
  jobEmployerDemoPromise ??= import("@/lib/job-employer-demo");
  return jobEmployerDemoPromise;
}
