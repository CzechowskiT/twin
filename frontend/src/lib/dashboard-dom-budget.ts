/**
 * Gate E Phase 3B — home `/dashboard` DOM caps.
 *
 * The home dashboard composes matches, applications, and jobs on one page.
 * Full feeds (up to 200 rows each) exceed PHASE3B_DOM_FAIL (15000 nodes).
 * Dedicated workspaces (`/dashboard/jobs`, `/dashboard/matches`, `/dashboard/applications`)
 * render full lists without these preview caps.
 */
export const DASHBOARD_HOME_MATCHES_PREVIEW = 12;
export const DASHBOARD_HOME_JOBS_PREVIEW = 10;
export const DASHBOARD_HOME_APPLICATIONS_PREVIEW = 5;
