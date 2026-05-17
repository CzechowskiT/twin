"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { renderTermsMarkdown } from "@/app/terms/render-terms-markdown";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";
import { getJurisdictionHintCached, normalizeLegalRegion, type JurisdictionHint } from "@/lib/jurisdiction-hint";
import { resolvePrivacyMarkdown, type ResolvedLegalMarkdown } from "@/lib/legal-documents";

function PrivacyInner() {
  const searchParams = useSearchParams();
  const langQuery = searchParams.get("lang");
  const { locale, t } = useTranslation();
  const [hint, setHint] = useState<JurisdictionHint | null>(null);
  const [resolved, setResolved] = useState<ResolvedLegalMarkdown | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHint(null);
    setResolved(null);
    void getJurisdictionHintCached()
      .then((h) => {
        if (cancelled) return;
        setHint(h);
        setResolved(resolvePrivacyMarkdown(h, locale, langQuery));
      })
      .catch(() => {
        if (cancelled) return;
        const fallback: JurisdictionHint = {
          country_code: null,
          legal_region: "OTHER",
          source: "fallback",
        };
        setHint(fallback);
        setResolved(resolvePrivacyMarkdown(fallback, locale, langQuery));
      });
    return () => {
      cancelled = true;
    };
  }, [locale, langQuery]);

  useEffect(() => {
    if (!resolved) return;
    let cancelled = false;
    setBody(null);
    setErr(null);
    void fetch(resolved.path, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setBody(text);
      })
      .catch(() => {
        if (!cancelled) setErr(t("privacy.loadMarkdownError"));
      });
    return () => {
      cancelled = true;
    };
  }, [resolved, t]);

  useEffect(() => {
    if (body === null || typeof window === "undefined") return;
    if (window.location.hash !== "#cookies") return;
    queueMicrotask(() => {
      document.getElementById("cookies")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [body]);

  const region = hint ? normalizeLegalRegion(hint.legal_region) : null;
  const cc = hint?.country_code ?? "—";

  return (
    <Shell rail>
      <article className="twin-prose max-w-none">
        <p className="twin-muted mb-4 text-sm leading-relaxed">{t("legalDoc.notLegalAdvice")}</p>

        {!hint || !resolved ? (
          <p className="twin-muted text-sm leading-relaxed">{t("legalDoc.detectingRegion")}</p>
        ) : (
          <>
            <p className="twin-muted mb-4 text-sm leading-relaxed">
              {t("legalDoc.privacyBannerPrefix")}{" "}
              <strong>{cc}</strong> {t("legalDoc.privacyBannerMiddle")}{" "}
              <strong>{region}</strong>
              {t("legalDoc.privacyBannerSuffix")}
            </p>
            {resolved.alternatePath ? (
              <p className="mb-6 text-sm">
                <Link
                  href={
                    resolved.docLabel === "ar-AE"
                      ? "/privacy?lang=en"
                      : "/privacy?lang=ar"
                  }
                  className="twin-link font-medium"
                >
                  {resolved.docLabel === "ar-AE" ? t("legalDoc.openAeEnglish") : t("legalDoc.openAeArabic")}
                </Link>
              </p>
            ) : null}
          </>
        )}

        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        {!err && body === null && resolved ? (
          <p className="twin-muted text-sm leading-relaxed">{t("privacy.loadingMarkdown")}</p>
        ) : null}
        {body && resolved ? (
          <div dir={resolved.dir} lang={resolved.htmlLang} className={resolved.dir === "rtl" ? "text-right" : undefined}>
            {renderTermsMarkdown(body)}
          </div>
        ) : null}

        <p className="twin-muted mt-10 text-sm leading-relaxed">
          <Link href="/terms" className="twin-link font-medium">
            {t("privacy.termsFullLink")}
          </Link>
          {" · "}
          <Link href="/" className="twin-link font-medium">
            {t("terms.backHome")}
          </Link>
        </p>
      </article>
    </Shell>
  );
}

export default function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <Shell rail>
          <article className="twin-prose max-w-none">
            <p className="twin-muted text-sm leading-relaxed">{t("legalDoc.detectingRegion")}</p>
          </article>
        </Shell>
      }
    >
      <PrivacyInner />
    </Suspense>
  );
}
