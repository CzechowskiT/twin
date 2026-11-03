import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicPreviewSurface } from "@/components/public-preview/public-preview-surface";
import {
  isAllowlistedPreviewScenario,
  isPublicPreviewEnabled,
} from "@/lib/public-preview-gate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{ scenario?: string | string[] }>;

export const metadata: Metadata = {
  title: "TWIN — Synthetic product preview",
  description: "Read-only synthetic product preview with fictional data only.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-image-preview": "none",
      "max-snippet": 0,
      "max-video-preview": 0,
    },
  },
};

export default async function PublicPreviewPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  if (!isPublicPreviewEnabled()) {
    notFound();
  }

  const params = searchParams ? await searchParams : {};
  const raw = params.scenario;
  const scenario = Array.isArray(raw) ? raw[0] : raw;
  if (scenario && !isAllowlistedPreviewScenario(scenario)) {
    notFound();
  }

  return <PublicPreviewSurface />;
}
