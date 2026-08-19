import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

// Implements: REQ-SEC-11
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
