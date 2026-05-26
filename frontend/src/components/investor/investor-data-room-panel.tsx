"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Button, Card } from "@/components/ui";
import { apiFetch, apiUpload } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { getPublicApiBase } from "@/lib/public-api-base";
import toast from "react-hot-toast";

const CONFIDENTIAL_KEYS = [
  "dataRoom.confidentialCap",
  "dataRoom.confidentialFin",
  "dataRoom.confidentialLegal",
] as const;

const NDA_STORAGE_KEY = "twin_investor_nda_v1";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
]);

type UploadSlot = {
  id: number;
  upload_url?: string | null;
  storage_mode?: string;
};

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function InvestorDataRoomPanel() {
  const { t } = useTranslation();
  const apiBase = getPublicApiBase();
  const statsUrl = apiBase ? `${apiBase}/api/v1/public/mvp-stats` : "/api/v1/public/mvp-stats";
  const openApiUrl = apiBase ? `${apiBase}/openapi.json` : "/api/v1/openapi.json";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [ndaChecked, setNdaChecked] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("financials");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [localDemo, setLocalDemo] = useState(false);
  const [s3Enabled, setS3Enabled] = useState(false);

  useEffect(() => {
    void fetch(statsUrl, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data_room_local_demo?: boolean; data_room_s3_enabled?: boolean } | null) => {
        setLocalDemo(Boolean(body?.data_room_local_demo));
        setS3Enabled(Boolean(body?.data_room_s3_enabled));
      })
      .catch(() => {
        setLocalDemo(false);
        setS3Enabled(false);
      });
  }, [statsUrl]);

  useEffect(() => {
    try {
      queueMicrotask(() => setNdaAccepted(sessionStorage.getItem(NDA_STORAGE_KEY) === "1"));
    } catch {
      queueMicrotask(() => setNdaAccepted(false));
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

  const uploadDocument = useCallback(async () => {
    const token = getToken();
    const file = selectedFile;
    if (!token) {
      toast.error(t("dataRoom.uploadFailed"));
      return;
    }
    if (!file) {
      toast.error(t("dataRoom.uploadNoFile"));
      return;
    }
    const contentType = file.type || "application/pdf";
    if (!ALLOWED_TYPES.has(contentType)) {
      toast.error(t("dataRoom.uploadFailed"));
      return;
    }

    setUploadBusy(true);
    try {
      const checksum = await sha256Hex(file);
      const slot = await apiFetch<UploadSlot>(
        "/api/v1/investor/data-room/uploads",
        {
          method: "POST",
          body: JSON.stringify({
            category: uploadCategory,
            filename: file.name,
            content_type: contentType,
            size_bytes: file.size,
            checksum_sha256: checksum,
          }),
        },
        token,
      );

      if (slot.upload_url) {
        const putRes = await fetch(slot.upload_url, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: file,
        });
        if (!putRes.ok) {
          throw new Error("presigned_put_failed");
        }
        toast.success(t("dataRoom.uploadStored"));
      } else if (localDemo && slot.id) {
        await apiUpload<UploadSlot>(
          `/api/v1/investor/data-room/uploads/${slot.id}/file`,
          file,
          token,
        );
        toast.success(t("dataRoom.uploadStored"));
      } else {
        toast.success(t("dataRoom.uploadSuccess"));
        toast(t("dataRoom.uploadEnterpriseToast"), { icon: "ℹ️", duration: 6000 });
      }

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      toast.error(t("dataRoom.uploadPutFailed"));
    } finally {
      setUploadBusy(false);
    }
  }, [localDemo, selectedFile, t, uploadCategory]);

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
          {s3Enabled ? (
            <Card variant="soft" className="mt-4 p-4">
              <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("dataRoom.s3ModeBanner")}</p>
            </Card>
          ) : localDemo ? (
            <Card variant="soft" className="mt-4 p-4">
              <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("dataRoom.demoModeBanner")}</p>
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
            {!s3Enabled && localDemo ? (
              <p className="twin-muted mt-2 text-xs leading-relaxed">{t("dataRoom.uploadEnterpriseComing")}</p>
            ) : null}
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
                <span className="twin-muted text-xs">{t("dataRoom.uploadChooseFile")}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls,application/pdf,text/csv"
                  className="twin-input mt-1 w-full text-sm"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            {selectedFile ? (
              <p className="twin-muted mt-2 text-xs">
                {selectedFile.name} · {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            ) : null}
            <Button
              type="button"
              className="mt-4"
              disabled={uploadBusy || !selectedFile}
              onClick={() => void uploadDocument()}
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
