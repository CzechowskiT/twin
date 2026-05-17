"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";
import type { Locale } from "@/lib/i18n";

import { renderTermsMarkdown } from "./render-terms-markdown";

function termsLocalePath(locale: Locale): string {
  return locale === "pl" ? "/legal/terms-pl.md" : "/legal/terms-en.md";
}

function TermsArticle({ locale }: { locale: Locale }) {
  const { t } = useTranslation();
  const [body, setBody] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const path = termsLocalePath(locale);
    void fetch(path, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setBody(text);
      })
      .catch(() => {
        if (!cancelled) setErr(t("terms.loadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [locale, t]);

  return (
    <>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {!err && body === null ? <p className="twin-muted text-sm">{t("terms.loading")}</p> : null}
      {body ? renderTermsMarkdown(body) : null}
    </>
  );
}

export default function TermsPage() {
  const { locale, t } = useTranslation();

  return (
    <Shell rail>
      <article className="twin-prose max-w-none">
        <p className="twin-muted mb-6 text-sm leading-relaxed">{t("terms.notLegalAdvice")}</p>
        <TermsArticle key={locale} locale={locale} />
        <p className="twin-muted mt-10 text-sm">
          <Link href="/" className="twin-link font-medium">
            {t("terms.backHome")}
          </Link>
          {" · "}
          <Link href="/privacy" className="twin-link font-medium">
            {t("terms.privacyLink")}
          </Link>
        </p>
      </article>
    </Shell>
  );
}
