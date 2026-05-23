"use client";

import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { EmployerMediaHub } from "@/components/marketing/employer-media-hub";
import { Shell } from "@/components/ui";

export default function MediaPage() {
  return (
    <Shell wide>
      <MarketingPageSurface wide withCard={false}>
        <EmployerMediaHub initialTab="media" />
      </MarketingPageSurface>
    </Shell>
  );
}
