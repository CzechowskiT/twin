import { Shell } from "@/components/ui";

export default function PrivacyPage() {
  return (
    <Shell>
      <article className="prose prose-zinc dark:prose-invert max-w-none">
        <h1>Privacy Policy (MVP)</h1>
        <p className="text-sm text-zinc-500">Last updated: May 2026</p>
        <h2>What we collect</h2>
        <ul>
          <li>Account email and password (hashed)</li>
          <li>Career profile: skills, experience, salary expectations, location</li>
          <li>Application and match history within TWIN</li>
        </ul>
        <h2>Why we process data</h2>
        <p>
          To match you with job listings from pracuj.pl and rocketjobs.pl and to track application
          status. Legal basis: your explicit consent at registration (GDPR Art. 6(1)(a)).
        </p>
        <h2>Your rights</h2>
        <p>
          You may request access, correction, or deletion of your data by contacting the TWIN team.
          You may withdraw consent by deleting your account (feature coming in a later release).
        </p>
        <h2>Retention</h2>
        <p>Data is retained while your account is active and deleted on request.</p>
        <h2>Third parties</h2>
        <p>
          We use Anthropic Claude for job matching. Job data is sourced from public listings on the
          boards above.
        </p>
      </article>
    </Shell>
  );
}
