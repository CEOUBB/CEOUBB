import type { CapacitorConfig } from "@capacitor/cli";

/*
  Runtime remote-first: Next.js 16 con App Router, rutas API y Turso no admite
  `output: 'export'`, así que la WebView carga el portal desplegado y `webDir`
  sólo sirve la pantalla de respaldo cuando el dispositivo está sin conexión.
*/
/*
  Esta misma configuración alimenta los dos targets. `ios/` existe como andamiaje
  versionado y no compilado: en Windows no hay CocoaPods, Xcode ni firma, y no
  existe `GoogleService-Info.plist` en el repositorio (§2.3 de la especificación).
*/
const serverUrl = process.env.CAPACITOR_SERVER_URL || "https://ceoubb.com";
const isCleartext = Boolean(process.env.CAPACITOR_SERVER_URL?.startsWith("http://"));

// Implements: REQ-CAP-01, REQ-CAP-03
const config: CapacitorConfig = {
  appId: "cl.ubb.centroestudio",
  appName: "CEOUBB",
  webDir: "capacitor/www",
  server: {
    // url: "https://ceoubb.com"
    // cleartext: false
    url: serverUrl,
    androidScheme: "https",
    cleartext: isCleartext,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    // Implements: REQ-CAP-12 — hoja nativa de Google, nunca un popup dentro de la WebView.
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    },
  },
};

export default config;
