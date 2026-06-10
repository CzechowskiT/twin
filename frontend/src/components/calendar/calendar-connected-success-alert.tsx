"use client";

import { useTranslation } from "@/components/language-provider";

function SuccessCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** High-contrast post-OAuth success banner for calendar_connected=1 return flow. */
export function CalendarConnectedSuccessAlert() {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/12 px-4 py-3 shadow-[inset_0_1px_0_0_rgba(16,185,129,0.12)] dark:border-emerald-400/45 dark:bg-emerald-500/18"
    >
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/20 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/20 dark:text-emerald-200"
        aria-hidden="true"
      >
        <SuccessCheckIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-emerald-950 dark:text-emerald-50">
          {t("dashboard.calendarConnectedSuccessTitle")}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-emerald-900/85 dark:text-emerald-100/90">
          {t("dashboard.calendarConnectedSuccessBody")}
        </p>
      </div>
    </div>
  );
}
