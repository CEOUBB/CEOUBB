import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Portal } from "../Portal";
import { getServerSessionState, SESSION_COOKIE } from "../../lib/auth";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Implements: REQ-PERF-LOAD-02
export default async function CampusPage() {
  const cookieStore = await cookies();
  const initialSession = await getServerSessionState(
    cookieStore.get(SESSION_COOKIE)?.value ?? null
  );

  return <Portal initialSession={initialSession} />;
}
