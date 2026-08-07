import { CanaryControlPanel } from "@/components/admin/canary-control-panel";

/** Epic 2.14 — private one-candidate canary control (ops/Founder). */
export default function AdminCanaryPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <CanaryControlPanel />
    </main>
  );
}
