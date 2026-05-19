import { redirect } from "next/navigation";

import BetaJoinClient from "./join-client";

type PageProps = {
  searchParams: Promise<{ classic?: string; ref?: string }>;
};

/** Default funnel sends users to the premium waitlist; `?classic=1` keeps the multi-step beta join. */
export default async function BetaJoinPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  if (sp.classic !== "1") {
    const ref = sp.ref?.trim();
    redirect(ref ? `/waitlist?ref=${encodeURIComponent(ref)}` : "/waitlist");
  }
  return <BetaJoinClient />;
}
