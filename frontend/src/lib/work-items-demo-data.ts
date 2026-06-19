/** Demo work items for recruiter/company scopes. */

export type WorkItemRow = {
  id: string;
  item_type: "note" | "task" | "follow_up" | "feedback_request";
  title: string;
  description: string;
  status: string;
  owner_label: string;
  backend_write: true;
  external_side_effect: false;
};

export type WorkItemRecord = {
  scope: "recruiter" | "company";
  items: WorkItemRow[];
  disabled_actions: string[];
  audit_preview: string[];
};

export function getWorkItemsDemo(scope: "recruiter" | "company"): WorkItemRecord {
  const items: WorkItemRow[] = [
    {
      id: "wi-demo-1",
      item_type: "note",
      title: scope === "recruiter" ? "Review trust bundle" : "Panel feedback draft",
      description: "Internal note — safe persistence preview only.",
      status: "open",
      owner_label: scope === "recruiter" ? "Recruiter desk" : "Hiring panel",
      backend_write: true,
      external_side_effect: false,
    },
    {
      id: "wi-demo-2",
      item_type: "task",
      title: "Prepare follow-up checklist",
      description: "Task with owner — no auto-completion.",
      status: "in_progress",
      owner_label: "Ops",
      backend_write: true,
      external_side_effect: false,
    },
  ];
  return {
    scope,
    items,
    disabled_actions: [
      "workItems.disabledEmail",
      "workItems.disabledSchedule",
      "workItems.disabledAts",
    ],
    audit_preview: ["record_created · work_item", "note_appended · work_item"],
  };
}
