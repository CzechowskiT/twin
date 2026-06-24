"use client";

import { useEffect, useMemo, useState } from "react";

import { getToken } from "@/lib/auth";
import type { MicrosoftBusyReadCapabilityRecord } from "@/lib/microsoft-busy-read-demo-data";
import {
  fetchMicrosoftBusyReadBundle,
  resolveMicrosoftBusyReadWithFallback,
  type MicrosoftBusyReadApiSource,
} from "@/lib/microsoft-busy-read-api";

export type MicrosoftBusyReadLiveState = {
  record: MicrosoftBusyReadCapabilityRecord;
  apiSource: MicrosoftBusyReadApiSource;
  loading: boolean;
};

export function useMicrosoftBusyReadLive(candidateId?: string): MicrosoftBusyReadLiveState {
  const fallback = useMemo(() => resolveMicrosoftBusyReadWithFallback(candidateId), [candidateId]);
  const [record, setRecord] = useState<MicrosoftBusyReadCapabilityRecord>(fallback);
  const [apiSource, setApiSource] = useState<MicrosoftBusyReadApiSource>("demo");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const demo = resolveMicrosoftBusyReadWithFallback(candidateId);
    const token = getToken();

    if (!token) {
      setRecord(demo);
      setApiSource("demo");
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchMicrosoftBusyReadBundle(candidateId ?? demo.candidate_id, token)
      .then((bundle) => {
        if (cancelled) return;
        setRecord(bundle.record);
        setApiSource(bundle.apiSource);
      })
      .catch(() => {
        if (cancelled) return;
        setRecord(demo);
        setApiSource("demo");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [candidateId, fallback.candidate_id]);

  return { record, apiSource, loading };
}
