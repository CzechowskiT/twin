"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type CashOutRequest = {
  id: number;
  amount_cents: number;
  payout_method: string;
  payout_details: string | null;
  status: string;
  created_at: string;
};

type ReferralMe = {
  pending_earnings_cents: number;
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "PLN" }).format(cents / 100);
}

export function ReferralCashOutForm() {
  const { t } = useTranslation();
  const [me, setMe] = useState<ReferralMe | null>(null);
  const [open, setOpen] = useState<CashOutRequest | null>(null);
  const [method, setMethod] = useState<"bank_transfer" | "paypal">("bank_transfer");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setErr(null);
    try {
      const [meRes, latest] = await Promise.all([
        apiFetch<ReferralMe>("/api/v1/referrals/me", {}, token),
        apiFetch<CashOutRequest | null>("/api/v1/referrals/cash-out/latest", {}, token),
      ]);
      setMe(meRes);
      setOpen(latest);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("referrals.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const submit = async () => {
    const token = getToken();
    if (!token || !me) return;
    setBusy(true);
    setErr(null);
    try {
      const row = await apiFetch<CashOutRequest>(
        "/api/v1/referrals/cash-out",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payout_method: method,
            payout_details: details.trim() || null,
          }),
        },
        token,
      );
      setOpen(row);
      toast.success(t("referrals.cashOutSubmitted"));
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("referrals.loadFailed");
      if (msg.includes("409") || msg.toLowerCase().includes("open cash-out")) {
        setErr(t("referrals.cashOutConflict"));
      } else if (msg.toLowerCase().includes("pending")) {
        setErr(t("referrals.cashOutNoPending"));
      } else {
        setErr(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  if (err && !me) {
    return <p className="twin-muted text-sm">{err}</p>;
  }
  if (!me) {
    return <p className="twin-muted text-sm">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
          {t("referrals.cashOutPending")}
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(me.pending_earnings_cents)}</p>
        <p className="twin-muted mt-3 text-xs leading-relaxed">{t("referrals.cashOutLead")}</p>
      </Card>

      {open ? (
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold">{t("referrals.cashOutOpenRequest")}</h2>
          <p className="twin-muted mt-2 text-sm">
            {formatMoney(open.amount_cents)} · {open.payout_method} · {open.status}
          </p>
          <p className="twin-muted mt-2 text-xs leading-relaxed">{t("referrals.cashOutManualNote")}</p>
        </Card>
      ) : me.pending_earnings_cents <= 0 ? (
        <p className="twin-muted text-sm">{t("referrals.cashOutNoPending")}</p>
      ) : (
        <Card className="space-y-4 p-5 sm:p-6">
          <label className="block text-sm font-medium">
            {t("referrals.cashOutMethod")}
            <select
              className="mt-2 w-full rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 py-2 text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value as "bank_transfer" | "paypal")}
            >
              <option value="bank_transfer">{t("referrals.cashOutMethodBank")}</option>
              <option value="paypal">{t("referrals.cashOutMethodPaypal")}</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            {t("referrals.cashOutDetails")}
            <input
              type="text"
              className="mt-2 w-full rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 py-2 text-sm"
              placeholder={t("referrals.cashOutDetailsPlaceholder")}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
            />
          </label>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <Button type="button" disabled={busy} onClick={() => void submit()}>
            {busy ? "…" : t("referrals.cashOutSubmit")}
          </Button>
        </Card>
      )}

      <Link href="/dashboard/referrals" className="twin-link text-sm font-medium">
        ← {t("referrals.cashOutBackReferrals")}
      </Link>
    </div>
  );
}
