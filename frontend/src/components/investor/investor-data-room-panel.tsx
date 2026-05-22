"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { getPublicApiBase } from "@/lib/public-api-base";
import toast from "react-hot-toast";

const CONFIDENTIAL_KEYS = [
  "dataRoom.confidentialCap",
  "dataRoom.confidentialFin",
  "dataRoom.confidentialLegal",
] as const;

const NDA_STORAGE_KEY = "twin_investor_nda_v1";

export function InvestorDataRoomPanel() {
  const { t } = useTranslation();
  const apiBase = getPublicApiBase();
  const statsUrl = apiBase ? `${apiBase}/api/v1/public/mvp-stats` : "/api/v1/public/mvp-stats";
  const openApiUrl = apiBase ? `${apiBase}/openapi.json` : "/api/v1/openapi.json";

  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [ndaChecked, setNdaChecked] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("financials");
  const [uploadFilename, setUploadFilename] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [localDemo, setLocalDemo] = useState(false);

  useEffect(() => {
    void fetch(statsUrl, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data_room_local_demo?: boolean } | null) => {
        setLocalDemo(Boolean(body?.data_room_local_demo));
      })
      .catch(() => setLocalDemo(false));
  }, [statsUrl]);

  useEffect(() => {
    try {
      setNdaAccepted(sessionStorage.getItem(NDA_STORAGE_KEY) === "1");
    } catch {
      setNdaAccepted(false);
    }
  }, []);

  const acceptNda = useCallback(() => {
    try {
      sessionStorage.setItem(NDA_STORAGE_KEY, "1");
    } catch {
      /* private mode */
    }
    setNdaAccepted(true);
  }, []);

  const packLinks = [
    { href: "/investor/metrics", label: t("dataRoom.packMetrics") },
    { href: statsUrl, label: t("dataRoom.packStatsJson"), external: true },
    { href: openApiUrl, label: t("dataRoom.packOpenApi"), external: true },
    { href: "/status", label: t("dataRoom.packStatus") },
    { href: "/investor/calculator", label: t("dataRoom.packCalculator") },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold">{t("dataRoom.packTitle")}</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {packLinks.map((item) =>
            item.external ? (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="twin-link block rounded-lg border border-[var(--twin-border)] px-4 py-3 text-sm font-medium hover:bg-[var(--twin-accent-muted)]/40"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.label} ↗
                </a>
              </li>
            ) : (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-lg border border-[var(--twin-border)] px-4 py-3 text-sm font-medium hover:bg-[var(--twin-accent-muted)]/40"
                >
                  {item.label}
                </Link>
              </li>
            ),
          )}
        </ul>
      </section>

      {!ndaAccepted ? (
        <Card variant="soft" className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold">{t("dataRoom.ndaTitle")}</h2>
          <p className="twin-muted mt-2 max-w-2xl text-sm leading-relaxed">{t("dataRoom.ndaLead")}</p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--twin-accent)]"
              checked={ndaChecked}
              onChange={(e) => setNdaChecked(e.target.checked)}
            />
            <span>{t("dataRoom.ndaCheckbox")}</span>
          </label>
          <Button type="button" className="mt-4" disabled={!ndaChecked} onClick={acceptNda}>
            {t("dataRoom.ndaAccept")}
          </Button>
        </Card>
      ) : (
        <section>
          <p className="twin-muted mb-4 text-xs">{t("dataRoom.ndaAcceptedNote")}</p>
          <h2 className="text-lg font-semibold">{t("dataRoom.confidentialTitle")}</h2>
          {localDemo ? (
            <Card variant="soft" className="mt-4 p-4">
              <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">{t("dataRoom.demoModeBanner")}</p>
              <a
                href="https://github.com/CzechowskiT/twin/blob/main/docs/RAILWAY_PROD_ENV_CHECKLIST.md"
                className="twin-link mt-2 inline-block text-xs font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("dataRoom.demoModeDocLink")} ↗
              </a>
            </Card>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {CONFIDENTIAL_KEYS.map((key) => (
              <Card key={key} variant="soft" className="p-4 opacity-90">
                <p className="text-sm font-medium">{t(key)}</p>
                <p className="twin-muted mt-2 text-xs">{t("dataRoom.accessNote")}</p>
              </Card>
            ))}
          </div>
          <Card variant="soft" className="mt-6 p-5">
            <h3 className="font-semibold">{t("dataRoom.uploadTitle")}</h3>
            <p className="twin-muted mt-2 text-sm leading-relaxed">{t("dataRoom.uploadLead")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="twin-muted text-xs">{t("dataRoom.uploadCategory")}</span>
                <select
                  className="twin-input mt-1 w-full"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                >
                  <option value="cap_table">cap_table</option>
                  <option value="financials">financials</option>
                  <option value="legal">legal</option>
                  <option value="other">other</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="twin-muted text-xs">{t("dataRoom.uploadFilename")}</span>
                <input
                  className="twin-input mt-1 w-full"
                  value={uploadFilename}
                  onChange={(e) => setUploadFilename(e.target.value)}
                  placeholder="Q1-2026.pdf"
                />
              </label>
            </div>
            <Button
              type="button"
              className="mt-4"
              disabled={uploadBusy || !uploadFilename.trim()}
              onClick={() => {
                const token = getToken();
                if (!token) {
                  toast.error(t("dataRoom.uploadFailed"));
                  return;
                }
                setUploadBusy(true);
                void apiFetch<{ storage_note?: string; upload_url?: string | null }>(
                  "/api/v1/investor/data-room/uploads",
                  {
                    method: "POST",
                    body: JSON.stringify({
                      category: uploadCategory,
                      filename: uploadFilename.trim(),
                      content_type: "application/pdf",
                      size_bytes: 1024,
                    }),
                  },
                  token,
                )
                  .then((res) => {
                    toast.success(t("dataRoom.uploadSuccess"));
                    if (res.upload_url) {
                      toast(t("dataRoom.uploadPresignHint"), { icon: "ℹ️", duration: 8000 });
                    } else if (res.storage_note) {
                      toast(res.storage_note, { icon: "ℹ️", duration: 6000 });
                    }
                    setUploadFilename("");
                  })
                  .catch(() => toast.error(t("dataRoom.uploadFailed")))
                  .finally(() => setUploadBusy(false));
              }}
            >
              {t("dataRoom.uploadSubmit")}
            </Button>
          </Card>
          <Link
            href="/contact"
            className="marketing-cta-filled-pill marketing-btn-primary-shadow twin-touch-target mt-6 inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-[var(--twin-cta)] px-5 text-sm font-semibold text-[var(--twin-on-cta)]"
          >
            {t("dataRoom.confidentialContact")}
          </Link>
        </section>
      )}

      <Link href="/workspace/investor" className="twin-link text-sm font-medium">
        ← {t("dataRoom.backInvestor")}
      </Link>
    </div>
  );
}
