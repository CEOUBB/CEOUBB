import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSessionUser } from "../../../lib/auth";

// Implements: REQ-SEC-11
export async function GET(request: Request) {
  // 1. Prohibir en producción
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 2. Requerir sesión de owner en preview / staging para evitar agotamiento de cuota
  const user = await getSessionUser(request);
  if (!user || user.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    throw new Error("Sentry Server-Side Test Error — CEOUBB API");
  } catch (error) {
    const eventId = Sentry.captureException(error);
    await Sentry.flush(2000);
    return NextResponse.json({
      success: true,
      eventId,
      message: "Error enviado a Sentry desde el Servidor",
    });
  }
}
