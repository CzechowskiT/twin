"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { deleteCandidateAccount } from "@/lib/candidate-account-delete-api";
import { getToken, clearToken } from "@/lib/auth";
import {
  CANDIDATE_REVOKE_DELETE_MARKERS,
  CANDIDATE_REVOKE_DELETE_PAGE_MARKER,
  CANDIDATE_REVOKE_DELETE_SAFE_LINKS,
} from "@/lib/candidate-revoke-delete";
import Link from "next/link";

const CONFIRMATION_PHRASE = "DELETE";

export function CandidateAccountDeleteLivePanel() {
  const { t } = useTranslation();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = getToken();
    if (!token) {
      router.replace("/login/candidate");
      return;
    }
    if (confirmation.trim() !== CONFIRMATION_PHRASE) {
      setError(t("candidateRevokeDelete.liveConfirmMismatch"));
      return;
    }
    setBusy(true);
    try {
      await deleteCandidateAccount(CONFIRMATION_PHRASE, token);
      clearToken();
      setDone(true);
    } catch {
      setError(t("candidateRevokeDelete.liveDeleteFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Shell wide rail>
        <Card variant="soft" className="border-[var(--twin-border)]/80 p-6" data-testid="candidate-account-delete-success">
          <h1 className="twin-section-title text-xl">{t("candidateRevokeDelete.liveSuccessTitle")}</h1>
          <p className="mt-3 text-sm text-[var(--twin-muted-strong)]">{t("candidateRevokeDelete.liveSuccessBody")}</p>
          <Link href="/" className="twin-btn-primary twin-touch-target mt-6 inline-block">
            {t("candidateRevokeDelete.liveSuccessCta")}
          </Link>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell wide rail>
      <div data-candidate-revoke-delete-page={CANDIDATE_REVOKE_DELETE_PAGE_MARKER} className="space-y-6">
        <header className="space-y-4 border-b border-[var(--twin-border)]/60 pb-6" data-testid={CANDIDATE_REVOKE_DELETE_MARKERS.header}>
          <CandidateWorkspaceSubnav ariaLabel={t("candidateRevokeDelete.pageTitle")} />
          <h1 className="twin-section-title text-2xl">{t("candidateRevokeDelete.liveTitle")}</h1>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("candidateRevokeDelete.liveLead")}</p>
        </header>

        <Card variant="soft" className="border-amber-500/30 bg-amber-500/5 p-5" data-testid={CANDIDATE_REVOKE_DELETE_MARKERS.boundary}>
          <p className="text-sm">{t("candidateRevokeDelete.liveWarning")}</p>
        </Card>

        <Card variant="soft" className="border-[var(--twin-border)]/80 p-5" data-testid="candidate-account-delete-form">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium" htmlFor="delete-confirmation">
              {t("candidateRevokeDelete.liveConfirmLabel")}
            </label>
            <input
              id="delete-confirmation"
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
              className="twin-input w-full max-w-md"
              placeholder={CONFIRMATION_PHRASE}
              data-testid="candidate-account-delete-confirmation"
            />
            <p className="text-xs text-[var(--twin-muted-strong)]">{t("candidateRevokeDelete.liveConfirmHint")}</p>
            {error ? (
              <p className="text-sm text-red-600" role="alert" data-testid="candidate-account-delete-error">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={busy || confirmation.trim() !== CONFIRMATION_PHRASE}
                className="twin-btn-secondary twin-touch-target disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="candidate-account-delete-submit"
              >
                {busy ? t("candidateRevokeDelete.liveDeleting") : t("candidateRevokeDelete.liveDeleteCta")}
              </button>
              <Link href={CANDIDATE_REVOKE_DELETE_SAFE_LINKS.trustCenter} className="twin-link text-sm font-medium">
                {t("candidateRevokeDelete.linkTrustCenter")}
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
