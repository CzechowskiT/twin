import type { TranslationKey } from "@/lib/i18n";

const STATUS_KEYS: Record<string, TranslationKey> = {
  pending: "dashboard.appStatusPending",
  applied: "dashboard.appStatusApplied",
  interview: "dashboard.appStatusInterview",
  rejected: "dashboard.appStatusRejected",
  hired: "dashboard.appStatusHired",
};

export function applicationStatusKey(status: string): TranslationKey {
  return STATUS_KEYS[status] ?? "dashboard.appStatusPending";
}
