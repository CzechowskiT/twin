"use client";

import { useCallback, useState } from "react";

/**
 * Slugs from https://simpleicons.org/ (CDN: cdn.simpleicons.org).
 * Curated global employers + major tech/finance/consumer brands (~50).
 */
const BRANDS: { slug: string; name: string }[] = [
  { slug: "apple", name: "Apple" },
  { slug: "microsoft", name: "Microsoft" },
  { slug: "google", name: "Google" },
  { slug: "amazon", name: "Amazon" },
  { slug: "nvidia", name: "NVIDIA" },
  { slug: "meta", name: "Meta" },
  { slug: "tesla", name: "Tesla" },
  { slug: "broadcom", name: "Broadcom" },
  { slug: "visa", name: "Visa" },
  { slug: "mastercard", name: "Mastercard" },
  { slug: "jpmorganchase", name: "JPMorgan Chase" },
  { slug: "bankofamerica", name: "Bank of America" },
  { slug: "citibank", name: "Citi" },
  { slug: "goldmansachs", name: "Goldman Sachs" },
  { slug: "morganstanley", name: "Morgan Stanley" },
  { slug: "wellsfargo", name: "Wells Fargo" },
  { slug: "walmart", name: "Walmart" },
  { slug: "costco", name: "Costco" },
  { slug: "target", name: "Target" },
  { slug: "cocacola", name: "Coca-Cola" },
  { slug: "pepsi", name: "Pepsi" },
  { slug: "mcdonalds", name: "McDonald's" },
  { slug: "starbucks", name: "Starbucks" },
  { slug: "nike", name: "Nike" },
  { slug: "adidas", name: "Adidas" },
  { slug: "shell", name: "Shell" },
  { slug: "chevron", name: "Chevron" },
  { slug: "exxonmobil", name: "ExxonMobil" },
  { slug: "toyota", name: "Toyota" },
  { slug: "honda", name: "Honda" },
  { slug: "bmw", name: "BMW" },
  { slug: "mercedes", name: "Mercedes-Benz" },
  { slug: "volkswagen", name: "Volkswagen" },
  { slug: "samsung", name: "Samsung" },
  { slug: "intel", name: "Intel" },
  { slug: "amd", name: "AMD" },
  { slug: "cisco", name: "Cisco" },
  { slug: "oracle", name: "Oracle" },
  { slug: "ibm", name: "IBM" },
  { slug: "salesforce", name: "Salesforce" },
  { slug: "adobe", name: "Adobe" },
  { slug: "netflix", name: "Netflix" },
  { slug: "disney", name: "Disney" },
  { slug: "paypal", name: "PayPal" },
  { slug: "unitedparcelsservice", name: "UPS" },
  { slug: "fedex", name: "FedEx" },
  { slug: "pfizer", name: "Pfizer" },
  { slug: "johnsonandjohnson", name: "Johnson & Johnson" },
  { slug: "unitedhealthcare", name: "UnitedHealth" },
  { slug: "boeing", name: "Boeing" },
];

function logoUrl(slug: string) {
  return `https://cdn.simpleicons.org/${slug}`;
}

function LogoRow({ ariaHidden }: { ariaHidden?: boolean }) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  const onError = useCallback((slug: string) => {
    setFailed((prev) => ({ ...prev, [slug]: true }));
  }, []);

  return (
    <div
      className="inline-flex shrink-0 items-center gap-x-10 gap-y-3 px-8 sm:gap-x-14 sm:px-12"
      aria-hidden={ariaHidden}
    >
      {BRANDS.map(({ slug, name }) =>
        failed[slug] ? (
          <span
            key={slug}
            title={name}
            className="inline-flex h-7 min-w-[4.5rem] max-w-[5.5rem] items-center justify-center rounded border border-[var(--twin-border)] bg-[var(--twin-card)] px-1 text-center text-[10px] font-semibold uppercase leading-tight text-[var(--twin-muted-strong)]"
          >
            {name.slice(0, 12)}
          </span>
        ) : (
          <img
            key={slug}
            src={logoUrl(slug)}
            alt=""
            width={88}
            height={28}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-7 w-auto max-h-7 max-w-[5.5rem] object-contain opacity-[0.88] saturate-[0.85] contrast-[1.05] transition hover:opacity-100 sm:h-8 sm:max-h-8"
            onError={() => onError(slug)}
          />
        ),
      )}
    </div>
  );
}

/** Infinite marquee of global employer marks (decorative; Simple Icons CDN). */
export function CompanyLogoMarquee() {
  return (
    <div
      className="border-y border-[var(--twin-border)] bg-[var(--twin-surface)]/80 py-4 backdrop-blur-[2px]"
      role="presentation"
    >
      <div className="overflow-hidden" aria-hidden>
        <div className="marketing-marquee-track flex w-max items-center">
          <LogoRow />
          <LogoRow ariaHidden />
        </div>
      </div>
    </div>
  );
}
