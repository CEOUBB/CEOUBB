export const LIVE_CLASS_INVALID_MESSAGE =
  "Usa un enlace HTTPS de Zoom o Microsoft Teams.";

// Implements: REQ-LIVE-01, REQ-LIVE-02
export type LiveClassProvider = "zoom" | "teams";

export type LiveClassLink = {
  url: string;
  provider: LiveClassProvider;
};

// Implements: REQ-LIVE-02
function providerForHostname(hostname: string): LiveClassProvider | null {
  if (hostname === "zoom.us" || hostname.endsWith(".zoom.us")) return "zoom";
  if (hostname === "teams.microsoft.com" || hostname === "teams.cloud.microsoft") {
    return "teams";
  }
  return null;
}

// Implements: REQ-LIVE-01, REQ-LIVE-02, REQ-LIVE-05
export function normalizeLiveClassUrl(value: string): LiveClassLink | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 2048) throw new Error(LIVE_CLASS_INVALID_MESSAGE);

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(LIVE_CLASS_INVALID_MESSAGE);
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error(LIVE_CLASS_INVALID_MESSAGE);
  }

  const provider = providerForHostname(parsed.hostname.toLowerCase());
  if (!provider) throw new Error(LIVE_CLASS_INVALID_MESSAGE);

  return { url: parsed.toString(), provider };
}
