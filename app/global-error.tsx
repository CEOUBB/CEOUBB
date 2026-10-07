"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <head>
        <title>Error del sistema · Centro de Estudio UBB</title>
      </head>
      <body>
        <div className="public-page">
          <main className="public-status">
            <section aria-labelledby="global-error-title" className="public-status-sheet">
              <span aria-hidden="true" className="public-status-tab">
                Error del sistema
              </span>
              <h1 id="global-error-title">No pudimos abrir Centro de Estudio UBB</h1>
              <p>
                Ocurrió un error inesperado al cargar la plataforma. Vuelve a intentarlo y, si el
                problema continúa, escríbenos desde la página de contacto.
              </p>
              {error.digest && (
                <p className="public-status-code">
                  Código de referencia: <span className="num">{error.digest}</span>
                </p>
              )}
              <div className="public-status-actions">
                <button className="policy-submit" onClick={retry} type="button">
                  Reintentar
                </button>
                <a className="policy-back" href="/contacto">
                  Contacto
                </a>
              </div>
            </section>
          </main>
        </div>
      </body>
    </html>
  );
}
