import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">Phase 1 MVP</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">
        Your career agent while you sleep
      </h1>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        TWIN scrapes pracuj.pl and rocketjobs.pl, matches roles to your profile, and tracks
        applications.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/register"
          className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium dark:border-zinc-700"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
