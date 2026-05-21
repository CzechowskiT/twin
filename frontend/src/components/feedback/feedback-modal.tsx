"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
};

const CATEGORIES = [
  { id: "ux", labelKey: "feedback.catUx" },
  { id: "matching", labelKey: "feedback.catMatching" },
  { id: "calendar", labelKey: "feedback.catCalendar" },
  { id: "billing", labelKey: "feedback.catBilling" },
  { id: "other", labelKey: "feedback.catOther" },
] as const;

export function FeedbackModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("ux");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    try {
      await apiFetch("/api/v1/feedback", {
        method: "POST",
        body: JSON.stringify({
          category,
          rating,
          message: message.trim() || null,
          page_path: typeof window !== "undefined" ? window.location.pathname : null,
        }),
      });
      toast.success(t("feedback.sent"));
      onClose();
      setMessage("");
      setRating(5);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("feedback.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="feedback-modal-overlay" role="dialog" aria-modal="true">
      <div className="feedback-modal-card">
        <h2 className="mb-2 text-lg font-semibold">{t("feedback.title")}</h2>
        <p className="twin-muted mb-4 text-sm">{t("feedback.subtitle")}</p>
        <label className="mb-2 block text-sm font-medium">{t("feedback.category")}</label>
        <select
          className="twin-input mb-3 w-full"
          value={category}
          onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number]["id"])}
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {t(c.labelKey as TranslationKey)}
            </option>
          ))}
        </select>
        <label className="mb-2 block text-sm font-medium">{t("feedback.rating")}</label>
        <div className="mb-3 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`feedback-star ${n <= rating ? "is-on" : ""}`}
              aria-label={`${n}`}
              onClick={() => setRating(n)}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          className="twin-input mb-4 min-h-[88px] w-full"
          placeholder={t("feedback.placeholder")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="flex gap-2">
          <button type="button" className="twin-btn-solid text-sm" disabled={busy} onClick={() => void submit()}>
            {t("feedback.submit")}
          </button>
          <button type="button" className="twin-btn-secondary text-sm" onClick={onClose}>
            {t("feedback.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
