// Implements: REQ-QMD-05
import { NextResponse, type NextRequest } from "next/server";
import { resolveQaRuntime } from "./lib/qa-runtime";
import { SESSION_COOKIE } from "./lib/session-cookie";
export function proxy(request: NextRequest) {
  const configured = process.env.INTEROP_CONTENT_ORIGIN;
  let configuredHostname: string | null = null;
  if (configured) {
    try {
      configuredHostname = new URL(configured).hostname;
    } catch {
      configuredHostname = null;
    }
  }
  // Implements: REQ-QA-02 — NextURL normalizes both loopback hosts to localhost.
  const qaRuntime = resolveQaRuntime();
  const hostname = qaRuntime
    ? (request.headers.get("host") ?? "").split(":")[0]
    : request.nextUrl.hostname;
  if (
    configuredHostname &&
    hostname === configuredHostname &&
    !request.nextUrl.pathname.startsWith("/api/interop/content/")
  ) {
    return new NextResponse("No encontrado", {
      status: 404,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  // Implements: REQ-PERF-LOAD-02
  const privateRoot = request.nextUrl.pathname === "/" && request.cookies.has(SESSION_COOKIE);
  const target = request.nextUrl.clone();

  // Implements: REQ-QA-02
  if (privateRoot && qaRuntime && (hostname === "127.0.0.1" || hostname === "localhost")) {
    request.nextUrl.hostname = hostname;
    target.hostname = hostname;
  }

  if (privateRoot) target.pathname = "/campus";

  const response = privateRoot ? NextResponse.rewrite(target) : NextResponse.next();

  if (request.nextUrl.pathname === "/" || request.nextUrl.pathname === "/campus") {
    response.headers.set(
      "Vary",
      "Cookie, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch"
    );
  }

  if (
    privateRoot ||
    request.nextUrl.pathname === "/campus" ||
    request.nextUrl.pathname.startsWith("/api/auth/")
  ) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.append("Vary", "*");
  }

  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
