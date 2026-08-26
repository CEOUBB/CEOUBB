import { Portal } from "./Portal";

// Implements: REQ-AUTH-01, REQ-PERF-01, REQ-AUTH-06
export default function Home() {
  const isQuickAuthAvailable =
    process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";

  return <Portal isQuickAuthAvailable={isQuickAuthAvailable} />;
}
