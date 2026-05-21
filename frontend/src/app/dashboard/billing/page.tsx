"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { BillingPlanTierCard } from "@/components/billing/billing-plan-tier-card";
import { BillingUpgradeExperience } from "@/components/billing/billing-upgrade-experience";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";

type Me = {
  id: number;
  email: string;
  plan_tier: string;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  billing_company_name?: string | null;
  billing_tax_id?: string | null;
};

type PlanRow = {
  id: string;
  name: string;
  description: string;
  max_tracked_applications: number | null;
  stripe_price_configured: boolean;
  monthly_list_price_usd: number;
};

type PlansPayload = {
  plans: PlanRow[];
  checkout_configured: boolean;
  checkout_payment_methods: string[];
  payment_methods_note: string;
};

const PLAN_PRICE_FALLBACK_USD: Record<string, number> = {
  free: 0,
  premium: 4.99,
  pro: 9.99,
};

function planDisplayName(planId: string, fallback: string, t: (key: TranslationKey) => string): string {
  const names: Record<string, TranslationKey> = {
    free: "dashboard.billingPlanNameFree",
    premium: "dashboard.billingPlanNamePremium",
    pro: "dashboard.billingPlanNamePro",
  };
  const key = names[planId];
  return key ? t(key) : fallback;
}

function normalizePlansPayload(raw: unknown): PlansPayload {
  if (raw == null || typeof raw !== "object") {
    return {
      plans: [],
      checkout_configured: false,
      checkout_payment_methods: [],
      payment_methods_note: "",
    };
  }
  const o = raw as Record<string, unknown>;
  const rawPlans = Array.isArray(o.plans) ? o.plans : [];
  const plans: PlanRow[] = [];
  for (const row of rawPlans) {
    if (row == null || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id.trim() : "";
    if (!id) continue;
    let monthly = 0;
    if (typeof r.monthly_list_price_usd === "number" && Number.isFinite(r.monthly_list_price_usd)) {
      monthly = r.monthly_list_price_usd;
    } else if (PLAN_PRICE_FALLBACK_USD[id] != null) {
      monthly = PLAN_PRICE_FALLBACK_USD[id];
    }
    plans.push({
      id,
      name: typeof r.name === "string" && r.name.trim() ? r.name.trim() : id,
      description: typeof r.description === "string" ? r.description : "",
      max_tracked_applications:
        r.max_tracked_applications === null || r.max_tracked_applications === undefined
          ? null
          : typeof r.max_tracked_applications === "number"
            ? r.max_tracked_applications
            : null,
      stripe_price_configured: Boolean(r.stripe_price_configured),
      monthly_list_price_usd: monthly,
    });
  }
  const pm = o.checkout_payment_methods;
  const checkout_payment_methods = Array.isArray(pm)
    ? [...new Set(pm.map((x) => String(x).trim().toLowerCase()).filter(Boolean))]
    : [];
  return {
    plans,
    checkout_configured: Boolean(o.checkout_configured),
    checkout_payment_methods,
    payment_methods_note: typeof o.payment_methods_note === "string" ? o.payment_methods_note : "",
  };
}

function stripeCheckoutMethodLabel(method: string): TranslationKey | null {
  const slug = method.trim().toLowerCase();
  const map: Record<string, TranslationKey> = {
    card: "dashboard.billingPmCard",
    link: "dashboard.billingPmLink",
    paypal: "dashboard.billingPmPaypal",
    amazon_pay: "dashboard.billingPmAmazonPay",
    sepa_debit: "dashboard.billingPmSepa",
    ideal: "dashboard.billingPmIdeal",
    us_bank_account: "dashboard.billingPmUsBank",
    bancontact: "dashboard.billingPmBancontact",
    p24: "dashboard.billingPmP24",
    blik: "dashboard.billingPmBlik",
    cashapp: "dashboard.billingPmCashapp",
    klarna: "dashboard.billingPmKlarna",
    affirm: "dashboard.billingPmAffirm",
  };
  return map[slug] ?? null;
}

function formatSubscriptionPeriodEnd(iso: string | null | undefined): string | null {
  if (iso == null || typeof iso !== "string" || !iso.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatSubscriptionStatusLabel(
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  status: unknown,
): string {
  if (status == null) return t("dashboard.billingNotActive");
  const raw = typeof status === "string" ? status.trim() : String(status).trim();
  if (!raw.length) return t("dashboard.billingNotActive");
  const s = raw.toLowerCase();
  if (s === "unknown" || s === "none") return t("dashboard.billingNotActive");
  const map: Record<string, TranslationKey> = {
    active: "dashboard.billingSubActive",
    trialing: "dashboard.billingSubTrialing",
    past_due: "dashboard.billingSubPastDue",
    canceled: "dashboard.billingSubCanceled",
    unpaid: "dashboard.billingSubUnpaid",
    incomplete: "dashboard.billingSubIncomplete",
    incomplete_expired: "dashboard.billingSubIncompleteExpired",
    paused: "dashboard.billingSubPaused",
  };
  const key = map[s];
  if (key) return t(key);
  return raw
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

type UrlPayload = { url: string };

const PAID = new Set(["active", "trialing", "past_due"]);

export default function BillingPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [plans, setPlans] = useState<PlansPayload | null>(null);
  const [actionError, setActionError] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [checkoutBanner, setCheckoutBanner] = useState<"success" | "cancel" | null>(null);
  const [billingCompany, setBillingCompany] = useState("");
  const [billingTaxId, setBillingTaxId] = useState("");
  const [billingSaveBusy, setBillingSaveBusy] = useState(false);
  const [billingSaveOk, setBillingSaveOk] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setActionError(false);
    setLoadFailed(false);

    const [meRes, plansRes] = await Promise.allSettled([
      apiFetch<Me>("/api/v1/auth/me", {}, token),
      apiFetch<PlansPayload>("/api/v1/billing/plans", { method: "GET" }),
    ]);

    let anyLoadFailure = false;

    if (meRes.status === "fulfilled") {
      setMe(meRes.value);
    } else {
      setMe(null);
      const msg = meRes.reason instanceof Error ? meRes.reason.message : String(meRes.reason);
      const lower = msg.toLowerCase();
      const looksLikeAuthFailure =
        msg.includes("401") ||
        lower.includes("invalid token") ||
        lower.includes("could not validate credentials") ||
        lower.includes("not authenticated");
      if (looksLikeAuthFailure) {
        clearToken();
        router.replace("/login");
        setLoading(false);
        return;
      }
      anyLoadFailure = true;
      console.warn("[billing] /auth/me failed", msg);
    }

    if (plansRes.status === "fulfilled") {
      setPlans(normalizePlansPayload(plansRes.value));
    } else {
      setPlans(null);
      const msg = plansRes.reason instanceof Error ? plansRes.reason.message : String(plansRes.reason);
      anyLoadFailure = true;
      console.warn("[billing] /billing/plans failed", msg);
    }

    setLoadFailed(anyLoadFailure);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = p.get("checkout");
    queueMicrotask(() => {
      if (c === "success") setCheckoutBanner("success");
      else if (c === "cancel") setCheckoutBanner("cancel");
    });
  }, []);

  useEffect(() => {
    if (!me) return;
    setBillingCompany((me.billing_company_name ?? "").trim());
    setBillingTaxId((me.billing_tax_id ?? "").trim());
    setBillingSaveOk(false);
  }, [me]);

  async function startCheckout(plan: "premium" | "pro") {
    const token = getToken();
    if (!token) return;
    setBusy(`checkout-${plan}`);
    setActionError(false);
    try {
      const res = await apiFetch<UrlPayload>(
        "/api/v1/billing/checkout-session",
        { method: "POST", body: JSON.stringify({ plan }) },
        token,
      );
      window.location.href = res.url;
    } catch (e) {
      setActionError(true);
      console.warn("[billing] checkout-session failed", e);
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    const token = getToken();
    if (!token) return;
    setBusy("portal");
    setActionError(false);
    try {
      const res = await apiFetch<UrlPayload>("/api/v1/billing/portal-session", { method: "POST" }, token);
      window.location.href = res.url;
    } catch (e) {
      setActionError(true);
      console.warn("[billing] portal-session failed", e);
    } finally {
      setBusy(null);
    }
  }

  async function saveBillingProfile() {
    const token = getToken();
    if (!token) return;
    setBillingSaveBusy(true);
    setBillingSaveOk(false);
    setActionError(false);
    try {
      const updated = await apiFetch<Me>(
        "/api/v1/auth/me/billing-profile",
        {
          method: "PATCH",
          body: JSON.stringify({
            billing_company_name: billingCompany.trim() || null,
            billing_tax_id: billingTaxId.trim() || null,
          }),
        },
        token,
      );
      setMe(updated);
      setBillingSaveOk(true);
    } catch (e) {
      setActionError(true);
      console.warn("[billing] billing-profile save failed", e);
    } finally {
      setBillingSaveBusy(false);
    }
  }

  const subscriptionStatus =
    me?.subscription_status != null && typeof me.subscription_status === "string"
      ? me.subscription_status
      : null;
  const paid = subscriptionStatus != null && PAID.has(subscriptionStatus);
  const showPortal = paid;

  return (
    <Shell rail>
      <div className="twin-billing-surface">
        <div className="twin-app-read-pane mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <h1 className="twin-page-intro twin-section-title text-xl sm:text-2xl">{t("dashboard.billingPageTitle")}</h1>
            <p className="twin-muted mt-2 max-w-xl text-sm leading-relaxed">{t("dashboard.billingPageSubtitle")}</p>
          </div>
          <Link href="/dashboard" className="twin-btn-secondary twin-touch-target inline-block shrink-0 text-center sm:!w-auto">
            ← {t("dashboard.title")}
          </Link>
        </div>

        <BillingUpgradeExperience
          checkoutConfigured={plans?.checkout_configured ?? false}
          currentTier={me?.plan_tier ?? "free"}
        />

        <div className="space-y-4 sm:space-y-5">
          {checkoutBanner === "success" ? (
            <Card variant="soft" className="!mb-0 border-[var(--twin-accent-muted)]">
              <p className="text-sm font-medium text-[var(--twin-accent-hover)]">{t("dashboard.billingCheckoutSuccess")}</p>
            </Card>
          ) : null}
          {checkoutBanner === "cancel" ? (
            <Card variant="soft" className="!mb-0">
              <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.billingCheckoutCancelled")}</p>
            </Card>
          ) : null}
          {actionError ? (
            <Card variant="soft" className="!mb-0 border-red-200 dark:border-red-900/50">
              <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.billingCheckoutError")}</p>
            </Card>
          ) : null}
        </div>

        {loading ? (
          <Card className="mb-6">
            <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.billingLoading")}</p>
          </Card>
        ) : null}

        {!loading && loadFailed ? (
          <Card variant="soft" className="mb-6 border-[var(--twin-border)]">
            <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.billingLoadIssue")}</p>
            <button
              type="button"
              className="twin-link mt-3 text-sm font-semibold"
              onClick={() => void load()}
            >
              {t("dashboard.billingRetry")}
            </button>
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
              {formatSubscriptionStatusLabel(t, me.subscription_status)}
            </span>
          </p>
          {(() => {
            const periodEnd = formatSubscriptionPeriodEnd(me.subscription_current_period_end);
            if (!periodEnd) return null;
            return (
              <p className="twin-muted mt-1 text-sm">
                {t("dashboard.billingPeriodEnds")}:{" "}
                <span className="font-medium text-[var(--foreground)]">{periodEnd}</span>
              </p>
            );
          })()}
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

      {me && !loading ? (
        <Card variant="soft" className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
            {t("dashboard.billingInvoiceProfileTitle")}
          </p>
          <p className="twin-muted mt-1 text-sm leading-relaxed">{t("dashboard.billingInvoiceProfileLead")}</p>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="billing-company" className="block text-sm font-medium text-[var(--foreground)]">
                {t("dashboard.billingCompanyLabel")}
              </label>
              <input
                id="billing-company"
                type="text"
                autoComplete="organization"
                value={billingCompany}
                onChange={(e) => setBillingCompany(e.target.value)}
                className="mt-1 w-full max-w-md rounded-md border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
                maxLength={200}
              />
            </div>
            <div>
              <label htmlFor="billing-tax" className="block text-sm font-medium text-[var(--foreground)]">
                {t("dashboard.billingTaxIdLabel")}
              </label>
              <input
                id="billing-tax"
                type="text"
                autoComplete="off"
                value={billingTaxId}
                onChange={(e) => setBillingTaxId(e.target.value)}
                className="mt-1 w-full max-w-md rounded-md border border-[var(--twin-border)] bg-[var(--twin-input-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
                maxLength={64}
              />
            </div>
            <Button
              type="button"
              className="!w-auto"
              disabled={billingSaveBusy}
              onClick={() => void saveBillingProfile()}
            >
              {billingSaveBusy ? "…" : t("dashboard.billingSaveInvoiceProfile")}
            </Button>
            {billingSaveOk ? (
              <p className="text-sm font-medium text-[var(--twin-accent-hover)]">{t("dashboard.billingSavedInvoiceProfile")}</p>
            ) : null}
          </div>
          <p className="twin-muted mt-4 text-xs leading-relaxed">{t("dashboard.billingCheckoutPromoHint")}</p>
          <p className="twin-muted mt-2 text-xs leading-relaxed">{t("dashboard.billingPauseViaPortal")}</p>
        </Card>
      ) : null}

      {plans && !loading && !plans.checkout_configured ? (
        <Card variant="soft" className="mb-6 border-[var(--twin-accent-muted)]">
          <div className="marketing-hero-rail text-start">
            <p className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.billingStripeSoonTitle")}</p>
            <p className="twin-muted mt-2 text-sm leading-relaxed">{t("dashboard.billingStripeSoonLead")}</p>
            <div className="marketing-cta-stack mt-4">
              <Link href="/waitlist" className="twin-billing-engage__wishlist-cta twin-touch-target inline-flex w-full justify-center">
                {t("dashboard.billingCtaJoinWishlist")}
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      {plans && !loading ? (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
            {t("dashboard.billingPlansTitle")}
          </p>
          {plans.checkout_payment_methods.length > 0 ? (
            <div className="mt-4 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/50 p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
                {t("dashboard.billingCheckoutMethodsEyebrow")}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {plans.checkout_payment_methods.map((m) => {
                  const key = stripeCheckoutMethodLabel(m);
                  const label = key ? t(key) : `${t("dashboard.billingPmGeneric")} (${m})`;
                  return (
                    <li
                      key={m}
                      className="rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface)] px-3 py-1 text-xs font-medium text-[var(--foreground)]"
                    >
                      {label}
                    </li>
                  );
                })}
              </ul>
              {plans.checkout_payment_methods.includes("card") ? (
                <p className="twin-muted mt-2 text-xs leading-relaxed">{t("dashboard.billingWalletsHint")}</p>
              ) : null}
              {locale === "en" && plans.payment_methods_note ? (
                <p className="twin-muted mt-2 text-xs leading-relaxed">{plans.payment_methods_note}</p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-6 flex w-full min-w-0 flex-col gap-4 sm:gap-5">
            {plans.plans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/60 p-4 text-sm text-[var(--twin-muted-strong)]">
                {t("dashboard.billingPlansEmpty")}
              </div>
            ) : (
              plans.plans.map((p) => {
                const tier = (me?.plan_tier ?? "free").toLowerCase();
                const isCurrent = me != null && tier === p.id;
                const featured = !paid && p.id === "premium";
                const canOpenWorkspace = p.id === "free" && !isCurrent;
                const canJoinWishlist =
                  !paid && !plans.checkout_configured && (p.id === "premium" || p.id === "pro");
                const canCheckoutPremium = !paid && p.id === "premium" && plans.checkout_configured;
                const canCheckoutPro = !paid && p.id === "pro" && plans.checkout_configured && p.stripe_price_configured;
                const actionable = canOpenWorkspace || canJoinWishlist || canCheckoutPremium || canCheckoutPro;
                const disabled = busy !== null || isCurrent || !actionable;
                let footerKey: TranslationKey = "dashboard.billingPlanCurrent";
                let statusNote: string | undefined;
                if (!isCurrent) {
                  if (p.id === "free") footerKey = "dashboard.billingPlanOpenWorkspace";
                  else if (p.id === "premium") {
                    if (canJoinWishlist) footerKey = "dashboard.billingCtaJoinWishlist";
                    else if (plans.checkout_configured) footerKey = "dashboard.billingUpgradePremium";
                    else {
                      footerKey = "dashboard.billingCtaUnavailableShort";
                      statusNote = t("dashboard.billingNotConfigured");
                    }
                  } else if (p.id === "pro") {
                    if (canJoinWishlist) footerKey = "dashboard.billingCtaJoinWishlist";
                    else if (!plans.checkout_configured) {
                      footerKey = "dashboard.billingCtaUnavailableShort";
                      statusNote = t("dashboard.billingNotConfigured");
                    } else if (!p.stripe_price_configured) {
                      footerKey = "dashboard.billingCtaProPendingShort";
                      statusNote = t("dashboard.billingPlanProPending");
                    } else footerKey = "dashboard.billingUpgradePro";
                  }
                }

                return (
                  <BillingPlanTierCard
                    key={p.id}
                    plan={p}
                    displayName={planDisplayName(p.id, p.name, t)}
                    busy={busy}
                    footerLabel={t(footerKey)}
                    statusNote={statusNote}
                    buttonHint={statusNote}
                    t={t}
                    disabled={disabled}
                    isCurrent={isCurrent}
                    featured={featured}
                    onPrimary={() => {
                      if (busy !== null || isCurrent) return;
                      if (canOpenWorkspace) {
                        router.push("/dashboard");
                        return;
                      }
                      if (canJoinWishlist) {
                        router.push("/waitlist");
                        return;
                      }
                      if (canCheckoutPremium) void startCheckout("premium");
                      if (canCheckoutPro) void startCheckout("pro");
                    }}
                  />
                );
              })
            )}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-[var(--twin-muted)]">{t("dashboard.billingListPricesNote")}</p>
        </Card>
      ) : null}
      </div>
    </Shell>
  );
}
