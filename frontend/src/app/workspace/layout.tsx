"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getToken } from "@/lib/auth";

/** All /workspace routes require a session — persona is chosen inside. */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  return <>{children}</>;
}
