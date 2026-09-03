import { NextResponse, type NextRequest } from "next/server";
export function proxy(request: NextRequest) {
  const configured = process.env.INTEROP_CONTENT_ORIGIN;
  if (
    configured &&
    request.nextUrl.hostname === new URL(configured).hostname &&
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
