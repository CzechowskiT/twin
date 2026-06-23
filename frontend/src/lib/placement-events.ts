/** Placement events timeline — shared markers and re-exports from live loader. */

export const PLACEMENT_EVENTS_TIMELINE_MARKERS = {
  widget: "placement-events-timeline",
  source: "placement-events-timeline-source",
  safety: "placement-events-timeline-safety",
  partial: "placement-events-timeline-partial",
  list: "placement-events-timeline-list",
  row: "placement-events-timeline-row",
} as const;

export {
  loadPlacementEventsTimeline,
  placementEventsTimelineSourceKey,
  resolvePlacementEventsDemo,
  PLACEMENT_EVENTS_API_PATH,
  PLACEMENT_EVENTS_TIMELINE_MAX,
  type PlacementEventTimelineRow,
  type PlacementEventTimelineSource,
} from "@/lib/placement-events-live";
