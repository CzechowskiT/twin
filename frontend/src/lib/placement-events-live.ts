/** Placement events live loader — safe persistence read path with demo/partial fallback. */

import {
  PLACEMENT_VERIFICATION_DEMO_CANDIDATE_ID,
  PLACEMENT_VERIFICATION_DEMO_ID,
} from "@/lib/placement-verification-demo-data";
import { fetchSafePersistenceList, type SafePersistenceSource } from "@/lib/safe-persistence-api";

export const PLACEMENT_EVENTS_API_PATH = "/api/v1/placement-events";

export type PlacementEventTimelineSource = SafePersistenceSource | "partial";

export type PlacementEventTimelineRow = {
  id: number | string;
  placement_id: string;
  candidate_id: string | null;
  event_type: string;
  event_status: string;
  actor_persona: string;
  created_at: string;
  source: string;
};

export const PLACEMENT_EVENTS_TIMELINE_MAX = 8;

const DEMO_EVENTS: PlacementEventTimelineRow[] = [
  {
    id: "pe-demo-1",
    placement_id: PLACEMENT_VERIFICATION_DEMO_ID,
    candidate_id: PLACEMENT_VERIFICATION_DEMO_CANDIDATE_ID,
    event_type: "placement_declared",
    event_status: "internal_only",
    actor_persona: "candidate",
    created_at: "2026-06-21T10:00:00Z",
    source: "twin_internal",
  },
  {
    id: "pe-demo-2",
    placement_id: PLACEMENT_VERIFICATION_DEMO_ID,
    candidate_id: PLACEMENT_VERIFICATION_DEMO_CANDIDATE_ID,
    event_type: "evidence_collected",
    event_status: "evidence_pending",
    actor_persona: "system",
    created_at: "2026-06-21T11:30:00Z",
    source: "twin_internal",
  },
  {
    id: "pe-demo-3",
    placement_id: PLACEMENT_VERIFICATION_DEMO_ID,
    candidate_id: PLACEMENT_VERIFICATION_DEMO_CANDIDATE_ID,
    event_type: "internal_review_opened",
    event_status: "ready_for_review",
    actor_persona: "recruiter",
    created_at: "2026-06-21T12:15:00Z",
    source: "twin_internal",
  },
];

type ApiListPayload = { items?: Record<string, unknown>[] };

function normalizeRow(raw: Record<string, unknown>): PlacementEventTimelineRow | null {
  const event_type = typeof raw.event_type === "string" ? raw.event_type : null;
  const event_status = typeof raw.event_status === "string" ? raw.event_status : null;
  const actor_persona = typeof raw.actor_persona === "string" ? raw.actor_persona : null;
  const placement_id = typeof raw.placement_id === "string" ? raw.placement_id : null;
  const created_at = typeof raw.created_at === "string" ? raw.created_at : null;
  if (!event_type || !event_status || !actor_persona || !placement_id || !created_at) return null;
  const id = typeof raw.id === "number" ? raw.id : String(raw.id ?? `${placement_id}-${created_at}`);
  const candidate_id = typeof raw.candidate_id === "string" ? raw.candidate_id : null;
  const source = typeof raw.source === "string" ? raw.source : "twin_internal";
  return { id, placement_id, candidate_id, event_type, event_status, actor_persona, created_at, source };
}

export function resolvePlacementEventsDemo(): PlacementEventTimelineRow[] {
  return DEMO_EVENTS;
}

export async function loadPlacementEventsTimeline(placementId?: string): Promise<{
  source: PlacementEventTimelineSource;
  items: PlacementEventTimelineRow[];
  count: number;
}> {
  const pid = (placementId ?? PLACEMENT_VERIFICATION_DEMO_ID).trim();
  const query = pid ? `${PLACEMENT_EVENTS_API_PATH}?placement_id=${encodeURIComponent(pid)}` : PLACEMENT_EVENTS_API_PATH;
  const result = await fetchSafePersistenceList<ApiListPayload>(query, { items: [] });

  if (result.source === "live" && Array.isArray(result.data.items)) {
    const items = result.data.items
      .map((item) => normalizeRow(item))
      .filter((row): row is PlacementEventTimelineRow => row !== null)
      .slice(0, PLACEMENT_EVENTS_TIMELINE_MAX);
    if (items.length > 0) {
      return { source: "live", items, count: items.length };
    }
    return {
      source: "partial",
      items: resolvePlacementEventsDemo(),
      count: resolvePlacementEventsDemo().length,
    };
  }

  const demo = resolvePlacementEventsDemo();
  return { source: "demo", items: demo, count: demo.length };
}

export function placementEventsTimelineSourceKey(
  source: PlacementEventTimelineSource,
): "safePersistence.liveApi" | "safePersistence.demoFallback" | "liveOperatingState.partialFallback" {
  if (source === "live") return "safePersistence.liveApi";
  if (source === "partial") return "liveOperatingState.partialFallback";
  return "safePersistence.demoFallback";
}
