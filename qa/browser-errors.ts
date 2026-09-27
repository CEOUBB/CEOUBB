export function isFirestoreNavigationCancellation(
  error: Error,
  browserName: string,
  navigating: boolean,
  emulatorHost: string | undefined
) {
  if (browserName !== "webkit" || !navigating || !emulatorHost) return false;
  const match = /^Fetch API cannot load (http:\/\/\S+) due to access control checks\.$/.exec(
    error.stack?.split("\n", 1)[0] ?? ""
  );
  if (!match || !URL.canParse(match[1])) return false;
  const url = new URL(match[1]);
  return (
    url.host === emulatorHost &&
    /^\/google\.firestore\.v1\.Firestore\/(Listen|Write)\/channel$/.test(url.pathname)
  );
}
