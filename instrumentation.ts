export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV !== "production") {
    try {
      await import("./sentry.server.config");
    } catch {
      // Ignored in edge/worker environments
    }
  }
}

export async function onRequestError(
  err: { digest?: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware";
  }
) {
  if (process.env.NODE_ENV === "development") {
    console.error("Server Request Error:", err?.message ?? err, request?.path, context?.routePath);
  }
}
