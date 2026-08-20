import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  /*
    Las tres opciones coinciden hoy con el default del SDK, y van explícitas a
    propósito: /privacidad publica que las grabaciones enmascaran el contenido, y
    esa promesa no puede depender de un default que un upgrade cambie en silencio.
  */
  // Implements: REQ-PRIV-07
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
});
