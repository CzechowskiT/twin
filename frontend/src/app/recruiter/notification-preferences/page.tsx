import type { Metadata } from "next";

import { RecruiterNotificationPrefsClient } from "./recruiter-notification-prefs-client";

export const metadata: Metadata = {
  title: "Notification preferences",
};

export default function RecruiterNotificationPreferencesPage() {
  return <RecruiterNotificationPrefsClient />;
}
