"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Button, ButtonCta, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

type Me = {
  id: number;
  email: string;
  plan_tier: string;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
};

type PlanRow = {
  id: string;
  name: string;
  description: string;
  max_tracked_applications: number | null;
  stripe_price_configured: boolean;
};

type PlansPayload = {
  plans: PlanRow[];
  checkout_configured: boolean;
  payment_methods_note: string;
};

type UrlPayload = { url: string };

const PAID = new Set(["active", "trialing", "past_due"]);

export default function BillingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [plans, setPlans] = useState<PlansPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [checkoutBanner, setCheckoutBanner] = useState<"success" | "cancel" | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setError(null);
    try {
      const [u, p] = await Promise.all([
        apiFetch<Me>("/api/v1/auth/me", {}, token),
        apiFetch<PlansPayload>("/api/v1/billing/plans", { method: "GET" }),
      ]);
      setMe(u);
      setPlans(p);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("401") || msg.toLowerCase().includes("invalid token")) {
        clearToken();
        router.replace("/login");
        return;
      }
      setError(msg);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = p.get("checkout");
    if (c === "success") setCheckoutBanner("success");
    else if (c === "cancel") setCheckoutBanner("cancel");
  }, []);

  async function startCheckout(plan: "premium" | "pro") {
    const token = getToken();
    if (!token) return;
    setBusy(`checkout-${plan}`);
    setError(null);
    try {
      const res = await apiFetch<UrlPayload>(
        "/api/v1/billing/checkout-session",
        { method: "POST", body: JSON.stringify({ plan }) },
        token,
      );
      window.location.href = res.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    const token = getToken();
    if (!token) return;
    setBusy("portal");
    setError(null);
    try {
      const res = await apiFetch<UrlPayload>("/api/v1/billing/portal-session", { method: "POST" }, token);
      window.location.href = res.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const paid = me?.subscription_status != null && PAID.has(me.subscription_status);
  const showPortal = paid;

  return (
    <Shell>
      <div className="twin-app-read-pane mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">{t("dashboard.billingPageTitle")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base sm:leading-relaxed">
            {t("dashboard.billingPageLead")}
          </p>
        </div>
        <Link href="/dashboard" className="twin-btn-secondary twin-touch-target inline-block shrink-0 text-center sm:!w-auto">
          ← {t("dashboard.title")}
        </Link>
      </div>

      {checkoutBanner === "success" ? (
        <Card variant="soft" className="mb-4 border-[var(--twin-accent-muted)]">
          <p className="text-sm font-medium text-[var(--twin-accent-hover)]">{t("dashboard.billingCheckoutSuccess")}</p>
        </Card>
      ) : null}
      {checkoutBanner === "cancel" ? (
        <Card variant="soft" className="mb-4">
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.billingCheckoutCancelled")}</p>
        </Card>
      ) : null}

      {plans && !plans.checkout_configured ? (
        <Card variant="soft" className="mb-4">
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.billingNotConfigured")}</p>
        </Card>
      ) : null}

      {error ? (
        <Card variant="soft" className="mb-4 border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      ) : null}

      {me ? (
        <Card className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
            {t("dashboard.billingCurrentPlan")}
          </p>
          <p className="mt-2 text-lg font-semibold capitalize text-[var(--foreground)]">{me.plan_tier}</p>
          <p className="twin-muted mt-1 text-sm">
            {t("dashboard.billingSubscriptionStatus")}:{" "}
            <span className="font-medium text-[var(--foreground)]">
              {me.subscription_status ?? t("dashboard.billingNotActive")}
            </span>
          </p>
          {me.subscription_current_period_end ? (
            <p className="twin-muted mt-1 text-sm">
              {t("dashboard.billingPeriodEnds")}:{" "}
              {new Date(me.subscription_current_period_end).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          ) : null}
          {showPortal ? (
            <div className="mt-4 border-t border-[var(--twin-border)] pt-4">
              <p className="twin-muted mb-3 text-sm">{t("dashboard.billingPortalHint")}</p>
              <Button
                type="button"
                className="!w-auto sm:!min-w-[12rem]"
                disabled={busy !== null}
                onClick={() => void openPortal()}
              >
                {busy === "portal" ? "…" : t("dashboard.billingManagePortal")}
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      {plans ? (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
            {t("dashboard.billingPlansTitle")}
          </p>
          <p className="twin-muted mt-2 text-xs leading-relaxed">{plans.payment_methods_note}</p>
          <ul className="mt-6 space-y-5">
            {plans.plans.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-4 sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-[var(--foreground)]">{p.name}</p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{p.description}</p>
                    <p className="mt-2 text-xs text-[var(--twin-muted)]">
                      {p.max_tracked_applications != null
                        ? t("dashboard.billingTrackedCap").replace("{n}", String(p.max_tracked_applications))
                        : t("dashboard.billingTrackedUnlimited")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    {p.id === "premium" && plans.checkout_configured && !paid ? (
                      <ButtonCta
                        type="button"
                        className="!w-full sm:!w-auto"
                        disabled={busy !== null}
                        onClick={() => void startCheckout("premium")}
                      >
                        {busy === "checkout-premium" ? "…" : t("dashboard.billingUpgradePremium")}
                      </ButtonCta>
                    ) : null}
                    {p.id === "pro" && plans.checkout_configured && p.stripe_price_configured && !paid ? (
                      <ButtonCta
                        type="button"
                        className="!w-full sm:!w-auto"
                        disabled={busy !== null}
                        onClick={() => void startCheckout("pro")}
                      >
                        {busy === "checkout-pro" ? "…" : t("dashboard.billingUpgradePro")}
                      </ButtonCta>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </Shell>
  );
}
