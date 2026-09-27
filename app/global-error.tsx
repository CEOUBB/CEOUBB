"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <head>
        <title>Error del sistema — Centro de Estudio UBB</title>
      </head>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
