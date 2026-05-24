export type ApplicationStatus = "pending"|"applied"|"interview"|"rejected"|"hired"|"saved";
export type TrackerApplication = { id: number; jobId: number; title: string; company: string; status: ApplicationStatus; url: string; };
