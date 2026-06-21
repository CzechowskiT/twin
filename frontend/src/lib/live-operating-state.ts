/** Centralized live persistence operating state — multi-channel fetch with demo fallback. */

import { AUDIT_EVENT_API_PATH } from "@/lib/audit-event-foundation";
import { CANDIDATE_ROLE_STATUS_COMPANY_ROUTE, CANDIDATE_ROLE_STATUS_RECRUITER_ROUTE } from "@/lib/candidate-role-status";
import { COMPANY_FEEDBACK_API_PATH, COMPANY_FEEDBACK_ROUTE } from "@/lib/company-feedback";
import type { TranslationKey } from "@/lib/i18n";
import { REQUEST_INTAKE_API_PATH, REQUEST_INTAKE_RECRUITER_ROUTE } from "@/lib/request-intake";
import { REVIEW_QUEUE_API_PATH, RECRUITER_TRUST_REVIEW_QUEUE_ROUTE } from "@/lib/recruiter-trust-review-queue";
import { fetchSafePersistenceList, type SafePersistenceSource } from "@/lib/safe-persistence-api";
import { WORK_ITEMS_API_PATH, WORK_ITEMS_COMPANY_ROUTE, WORK_ITEMS_RECRUITER_ROUTE } from "@/lib/work-items";

export type OperatingStateAggregateSource = "live" | "demo" | "partial";

export type OperatingStateChannelId =
  | "work_items"
  | "review_queue"
  | "request_intake"
  | "candidate_role_status"
  | "company_feedback"
  | "audit_events";

export type OperatingStateChannel = {
  id: OperatingStateChannelId;
  source: SafePersistenceSource;
  count: number;
  href: string;
  labelKey: TranslationKey;
};

export type OperatingStateSummary = {
  aggregateSource: OperatingStateAggregateSource;
  sourceKey: TranslationKey;
  channels: OperatingStateChannel[];
};

type ListPayload = { items?: unknown[] };

type ChannelConfig = {
  id: OperatingStateChannelId;
  apiPath: string;
  href: string;
  labelKey: TranslationKey;
  demoCount: number;
};

const RECRUITER_CHANNELS: ChannelConfig[] = [
  {
    id: "work_items",
    apiPath: `${WORK_ITEMS_API_PATH}?persona_scope=recruiter`,
    href: WORK_ITEMS_RECRUITER_ROUTE,
    labelKey: "liveOperatingState.channelWorkItems",
    demoCount: 2,
  },
  {
    id: "review_queue",
    apiPath: REVIEW_QUEUE_API_PATH,
    href: RECRUITER_TRUST_REVIEW_QUEUE_ROUTE,
    labelKey: "liveOperatingState.channelReviewQueue",
    demoCount: 3,
  },
  {
    id: "request_intake",
    apiPath: REQUEST_INTAKE_API_PATH,
    href: REQUEST_INTAKE_RECRUITER_ROUTE,
    labelKey: "liveOperatingState.channelRequestIntake",
    demoCount: 2,
  },
  {
    id: "candidate_role_status",
    apiPath: "/api/v1/candidate-role-status",
    href: CANDIDATE_ROLE_STATUS_RECRUITER_ROUTE,
    labelKey: "liveOperatingState.channelCandidateRoleStatus",
    demoCount: 1,
  },
  {
    id: "company_feedback",
    apiPath: COMPANY_FEEDBACK_API_PATH,
    href: COMPANY_FEEDBACK_ROUTE,
    labelKey: "liveOperatingState.channelCompanyFeedback",
    demoCount: 1,
  },
  {
    id: "audit_events",
    apiPath: AUDIT_EVENT_API_PATH,
    href: "/board/audit-event-foundation",
    labelKey: "liveOperatingState.channelAuditEvents",
    demoCount: 2,
  },
];

const COMPANY_CHANNELS: ChannelConfig[] = [
  {
    id: "work_items",
    apiPath: `${WORK_ITEMS_API_PATH}?persona_scope=company`,
    href: WORK_ITEMS_COMPANY_ROUTE,
    labelKey: "liveOperatingState.channelWorkItems",
    demoCount: 2,
  },
  {
    id: "candidate_role_status",
    apiPath: "/api/v1/candidate-role-status",
    href: CANDIDATE_ROLE_STATUS_COMPANY_ROUTE,
    labelKey: "liveOperatingState.channelCandidateRoleStatus",
    demoCount: 1,
  },
  {
    id: "company_feedback",
    apiPath: COMPANY_FEEDBACK_API_PATH,
    href: COMPANY_FEEDBACK_ROUTE,
    labelKey: "liveOperatingState.channelCompanyFeedback",
    demoCount: 1,
  },
  {
    id: "audit_events",
    apiPath: AUDIT_EVENT_API_PATH,
    href: "/board/audit-event-foundation",
    labelKey: "liveOperatingState.channelAuditEvents",
    demoCount: 2,
  },
];

async function fetchChannel(config: ChannelConfig): Promise<OperatingStateChannel> {
  const result = await fetchSafePersistenceList<ListPayload>(config.apiPath, { items: [] });
  const count =
    result.source === "live" && Array.isArray(result.data.items)
      ? result.data.items.length
      : config.demoCount;
  return {
    id: config.id,
    source: result.source,
    count,
    href: config.href,
    labelKey: config.labelKey,
  };
}

function aggregateSource(channels: OperatingStateChannel[]): OperatingStateAggregateSource {
  const liveCount = channels.filter((c) => c.source === "live").length;
  if (liveCount === 0) return "demo";
  if (liveCount === channels.length) return "live";
  return "partial";
}

function sourceKeyForAggregate(aggregate: OperatingStateAggregateSource): TranslationKey {
  if (aggregate === "live") return "safePersistence.liveApi";
  if (aggregate === "partial") return "liveOperatingState.partialFallback";
  return "safePersistence.demoFallback";
}

export async function loadRecruiterOperatingState(): Promise<OperatingStateSummary> {
  const channels = await Promise.all(RECRUITER_CHANNELS.map(fetchChannel));
  const aggregateSource_ = aggregateSource(channels);
  return { aggregateSource: aggregateSource_, sourceKey: sourceKeyForAggregate(aggregateSource_), channels };
}

export async function loadCompanyOperatingState(): Promise<OperatingStateSummary> {
  const channels = await Promise.all(COMPANY_CHANNELS.map(fetchChannel));
  const aggregateSource_ = aggregateSource(channels);
  return { aggregateSource: aggregateSource_, sourceKey: sourceKeyForAggregate(aggregateSource_), channels };
}

export const LIVE_OPERATING_STATE_MARKERS = {
  panel: "live-operating-state-panel",
  sourceBadge: "live-operating-state-source-badge",
  channelGrid: "live-operating-state-channel-grid",
} as const;
