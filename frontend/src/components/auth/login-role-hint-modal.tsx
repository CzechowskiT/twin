"use client";

import { useCallback, useEffect, useId, useRef } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";

export function LoginRoleHintModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const dismissRef = useRef<HTMLButtonElement>(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    dismissRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, handleClose]);

  if (!open) return null;

  return (
    <div className="login-role-hint-overlay" role="presentation">
      <Card className="login-role-hint-card mb-0 scroll-mt-0 w-full max-w-md p-5 sm:p-6">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={messageId}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            TWIN
          </p>
          <h2 id={titleId} className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
            {t("login.selectRoleModalTitle")}
          </h2>
          <p id={messageId} className="twin-muted mt-3 text-sm leading-relaxed">
            {t("login.selectRoleModalMessage")}
          </p>
          <div className="mt-6">
            <button
              ref={dismissRef}
              type="button"
              className="twin-btn-solid twin-touch-target w-full text-sm sm:w-auto"
              onClick={handleClose}
            >
              {t("login.selectRoleModalDismiss")}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
