import { headers } from "next/headers";
import { Portal } from "./Portal";

// Implements: REQ-AUTH-01, REQ-PERF-01, REQ-AUTH-06
export default async function Home() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const isProductionDomain = host === "ceoubb.com" || host === "www.ceoubb.com";

  const isQuickAuthAvailable =
    !isProductionDomain ||
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_CEOUBB_ENVIRONMENT === "preview" ||
    process.env.NEXT_PUBLIC_CEOUBB_ENVIRONMENT === "staging" ||
    process.env.CEOUBB_ENVIRONMENT === "preview" ||
    process.env.CEOUBB_ENVIRONMENT === "staging";

  return <Portal isQuickAuthAvailable={isQuickAuthAvailable} />;
}
