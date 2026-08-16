import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
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
