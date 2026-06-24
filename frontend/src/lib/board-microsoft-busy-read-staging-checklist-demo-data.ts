/** Deterministic Microsoft busy-read staging checklist — read-only board data. */

export type BusyReadChecklistRow = {
  id: string;
  labelKey: string;
  detailKey: string;
  status: "done" | "ready" | "pending" | "blocked" | "staging_only";
};

export type BusyReadSmokeCommandRow = {
  id: string;
  labelKey: string;
  command: string;
  mode: "dry_run" | "safe_http" | "live_staging";
};

export type BoardMicrosoftBusyReadStagingChecklistRecord = {
  prodGatesOff: readonly BusyReadChecklistRow[];
  smokeCommands: readonly BusyReadSmokeCommandRow[];
  uiExpectations: readonly BusyReadChecklistRow[];
  hardBans: readonly string[];
};

export function getBoardMicrosoftBusyReadStagingChecklistDemo(): BoardMicrosoftBusyReadStagingChecklistRecord {
  return {
    prodGatesOff: [
      {
        id: "busy_read_gate",
        labelKey: "itemBusyReadGate",
        detailKey: "detailBusyReadGate",
        status: "done",
      },
      {
        id: "oauth_connect_gate",
        labelKey: "itemOAuthConnectGate",
        detailKey: "detailOAuthConnectGate",
        status: "done",
      },
      {
        id: "calendar_write_gate",
        labelKey: "itemCalendarWriteGate",
        detailKey: "detailCalendarWriteGate",
        status: "done",
      },
      {
        id: "readonly_scopes",
        labelKey: "itemReadonlyScopes",
        detailKey: "detailReadonlyScopes",
        status: "done",
      },
    ],
    smokeCommands: [
      {
        id: "dry_run",
        labelKey: "cmdDryRun",
        command: "TWIN_BUSY_READ_SMOKE_DRY_RUN=1 npm run verify:prod-microsoft-busy-read",
        mode: "dry_run",
      },
      {
        id: "safe_http",
        labelKey: "cmdSafeHttp",
        command: "TWIN_PROD_BASE_URL=https://twin-sooty.vercel.app npm run verify:prod-microsoft-busy-read",
        mode: "safe_http",
      },
      {
        id: "live_staging",
        labelKey: "cmdLiveStaging",
        command:
          "TWIN_PROD_BASE_URL=<staging-url> TWIN_BUSY_READ_SMOKE_ALLOW_LIVE=1 TWIN_PROD_TEST_JWT=<vault> npm run verify:prod-microsoft-busy-read",
        mode: "live_staging",
      },
    ],
    uiExpectations: [
      {
        id: "staging_banner",
        labelKey: "itemStagingBanner",
        detailKey: "detailStagingBanner",
        status: "staging_only",
      },
      {
        id: "demo_slots",
        labelKey: "itemDemoSlots",
        detailKey: "detailDemoSlots",
        status: "staging_only",
      },
      {
        id: "oauth_disabled",
        labelKey: "itemOAuthDisabled",
        detailKey: "detailOAuthDisabled",
        status: "staging_only",
      },
      {
        id: "no_token_display",
        labelKey: "itemNoTokenDisplay",
        detailKey: "detailNoTokenDisplay",
        status: "done",
      },
    ],
    hardBans: [
      "no_graph_writes",
      "no_oauth_connect_prod",
      "no_token_display",
      "no_phase3b",
    ],
  };
}
