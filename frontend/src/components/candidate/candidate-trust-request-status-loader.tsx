"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { CandidateTrustRequestStatusPanel } from "@/components/candidate/candidate-trust-request-status-panel";
import { loadTrustRequestStatus, type TrustRequestStatus } from "@/lib/candidate-trust-request-status";

/** Loads live trust request counts and renders the shared status panel. */
export function CandidateTrustRequestStatusLoader(): ReactNode {
  const [status, setStatus] = useState<TrustRequestStatus | null>(null);

  useEffect(() => {
    let active = true;
    void loadTrustRequestStatus().then((res) => {
      if (active) setStatus(res);
    });
    return () => {
      active = false;
    };
  }, []);

  return <CandidateTrustRequestStatusPanel status={status} />;
}
