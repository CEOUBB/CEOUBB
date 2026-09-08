// Implements: REQ-QMD-05
import { NextResponse, type NextRequest } from "next/server";
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
  if (
    configuredHostname &&
    request.nextUrl.hostname === configuredHostname &&
    !request.nextUrl.pathname.startsWith("/api/interop/content/")
  ) {
    return new NextResponse("No encontrado", {
      status: 404,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
