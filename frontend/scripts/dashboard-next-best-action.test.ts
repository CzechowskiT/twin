/**
 * Deterministic next-best-action priority — no invented analytics.
 */
import assert from "node:assert/strict";
import {
  buildMissionCards,
  conversationReadinessKey,
  isCalendarConnected,
  resolveNextBestAction,
  type DashboardTodayContext,
} from "../src/lib/dashboard-next-best-action";

function ctx(partial: Partial<DashboardTodayContext>): DashboardTodayContext {
  return {
    hasProfile: false,
    visibleMatchesCount: 0,
    pipelineActiveCount: 0,
    calendarConnected: false,
    ...partial,
  };
}

// Priority 1: no profile
{
  const nba = resolveNextBestAction(ctx({}));
  assert.equal(nba.primaryHref, "/profile");
  assert.equal(nba.primaryLabelKey, "dashboard.setupProfile");
}

// Priority 2: profile but no matches
{
  const nba = resolveNextBestAction(ctx({ hasProfile: true, visibleMatchesCount: 0 }));
  assert.equal(nba.primaryHref, "/profile");
  assert.equal(nba.primaryLabelKey, "dashboard.todayNbaRefineProfile");
}

// Priority 3: matches but no calendar
{
  const nba = resolveNextBestAction(
    ctx({ hasProfile: true, visibleMatchesCount: 5, calendarConnected: false }),
  );
  assert.equal(nba.primaryHref, "/dashboard/calendar");
  assert.equal(nba.primaryLabelKey, "dashboard.todayNbaConnectCalendar");
}

// Priority 4: pipeline active (calendar connected)
{
  const nba = resolveNextBestAction(
    ctx({
      hasProfile: true,
      visibleMatchesCount: 3,
      calendarConnected: true,
      pipelineActiveCount: 2,
    }),
  );
  assert.equal(nba.primaryHref, "#dashboard-applications");
  assert.equal(nba.primaryLabelKey, "dashboard.statApplicationsCta");
}

// Priority 5: default — review matches
{
  const nba = resolveNextBestAction(
    ctx({ hasProfile: true, visibleMatchesCount: 8, calendarConnected: true }),
  );
  assert.equal(nba.primaryHref, "#dashboard-matches");
  assert.equal(nba.primaryLabelKey, "dashboard.statMatchesCta");
}

// Mission cards reflect done state
{
  const cards = buildMissionCards(
    ctx({ hasProfile: true, visibleMatchesCount: 2, calendarConnected: true }),
  );
  assert.equal(cards.length, 3);
  assert.ok(cards.every((c) => c.done));
}

// Conversation readiness keys
{
  assert.equal(conversationReadinessKey(ctx({})), "dashboard.todayReadinessSetup");
  assert.equal(
    conversationReadinessKey(ctx({ hasProfile: true })),
    "dashboard.todayReadinessWaiting",
  );
  assert.equal(
    conversationReadinessKey(ctx({ hasProfile: true, visibleMatchesCount: 1 })),
    "dashboard.todayReadinessReady",
  );
}

// Calendar connected helper
{
  assert.equal(isCalendarConnected(false, false), false);
  assert.equal(isCalendarConnected(true, false), true);
  assert.equal(isCalendarConnected(false, true), true);
}

console.log("dashboard-next-best-action.test.ts: ok");
