"use client";

import type { PermissionState } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { getAuth, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { firebaseApp } from "./firebase-client";
import { isNativeShell } from "./mobile-bridge";

/*
  Registro de push del contenedor Android. Dos reglas mandan aquí:

  1. Nada de esto puede romper la sesión. Push es accesorio: si el plugin falla,
     si el usuario dice que no o si Firestore rechaza la escritura, la app sigue
     exactamente igual de usable. Por eso ninguna ruta lanza hacia el llamador.
  2. El SDK de Firestore entra por `import()` perezoso, igual que en
     `lib/firebase-classroom-client.ts`. Si se importara arriba, los chunks
     iniciales cargarían `firestore.googleapis.com` y `tests/rendered-html.test.mjs`
     falla — el presupuesto de arranque es parte del contrato, no una opinión.
*/

/** Una sola suscripción por proceso: en React los efectos pueden correr dos veces. */
let registrationStarted = false;

/**
 * Espera a que Firebase resuelva la sesión. Copia deliberada del helper
 * `currentUser()` del cliente de aula: el token puede llegar antes de que
 * `onAuthStateChanged` emita, y sin uid no hay documento donde escribir.
 */
function currentUser() {
  const auth = getAuth(firebaseApp);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise<FirebaseUser>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Tu sesión de Google expiró. Cierra sesión y vuelve a ingresar."));
    }, 10000);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Deja el token en `users/{uid}.fcmToken` y nada más. El `merge` con un único
 * campo es lo que la regla de Firestore permite (REQ-CAP-18): cualquier campo
 * extra en el mismo write haría que `hasOnly` rechace la operación completa.
 */
async function persistToken(fcmToken: string): Promise<void> {
  if (!fcmToken) return;
  const [sdk, user] = await Promise.all([import("firebase/firestore"), currentUser()]);
  const db = sdk.getFirestore(firebaseApp);
  await sdk.setDoc(sdk.doc(db, "users", user.uid), { fcmToken }, { merge: true });
}

/**
 * Borra el token guardado. Se usa cuando la cuenta apagó todos sus canales de
 * push: sin token no queda destino al que enviar desde el servidor.
 */
// Implements: REQ-CFG-04
async function clearToken(): Promise<void> {
  const [sdk, user] = await Promise.all([import("firebase/firestore"), currentUser()]);
  const db = sdk.getFirestore(firebaseApp);
  await sdk.setDoc(sdk.doc(db, "users", user.uid), { fcmToken: "" }, { merge: true });
}

/*
  La preferencia de la cuenta manda sobre el registro del dispositivo. Si el
  usuario apagó todos sus canales de push, no se pide permiso, no se registra
  y se limpia el token existente. Un fallo de lectura no apaga push: se
  conservan los valores por defecto para no silenciar avisos por un error de
  red pasajero.
*/
// Implements: REQ-CFG-04
async function pushIsWanted(): Promise<boolean> {
  try {
    const { loadPreferences } = await import("./user-preferences.ts");
    const preferences = await loadPreferences();
    return Object.values(preferences.channels).some((channel) => channel.push);
  } catch {
    return true;
  }
}

/**
 * Pide el permiso de notificaciones sólo cuando el sistema aún no tiene una
 * respuesta guardada, registra el dispositivo en FCM y persiste el token.
 * Fuera del contenedor nativo no hace absolutamente nada.
 */
// Implements: REQ-CAP-10, REQ-CAP-10b, REQ-CFG-04
export async function registerPushNotifications(): Promise<void> {
  if (!isNativeShell()) return;
  if (registrationStarted) return;
  registrationStarted = true;

  if (!(await pushIsWanted())) {
    await clearToken().catch(() => undefined);
    return;
  }

  try {
    const current = await PushNotifications.checkPermissions();
    let receive: PermissionState = current.receive;

    // Sólo se pregunta desde un estado de "todavía no respondió". Si el usuario
    // ya negó POST_NOTIFICATIONS (Android 13+), volver a pedirlo en cada arranque
    // sería exactamente el comportamiento que REQ-CAP-10b prohíbe.
    if (receive === "prompt" || receive === "prompt-with-rationale") {
      receive = (await PushNotifications.requestPermissions()).receive;
    }

    // Permiso denegado: se sale en silencio. Sin push, sin diálogos, sin bloquear
    // la navegación; la app queda plenamente utilizable.
    if (receive !== "granted") return;

    // El token llega por evento, no por el retorno de `register()`.
    await PushNotifications.addListener("registration", (token) => {
      void persistToken(token.value).catch(() => undefined);
    });
    // Un fallo de FCM (sin Play Services, sin red) se traga: no hay nada que el
    // estudiante pueda hacer al respecto y no justifica un error en pantalla.
    await PushNotifications.addListener("registrationError", () => undefined);

    await PushNotifications.register();
  } catch {
    // Plugin ausente o rechazo del sistema: push queda apagado y ya.
  }
}
