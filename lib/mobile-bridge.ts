"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { StatusBar, Style } from "@capacitor/status-bar";

/*
  Frontera entre el portal web y el contenedor nativo. Todo lo de aquí tiene que
  degradar en silencio: el mismo bundle se sirve en Chrome de escritorio, donde los
  plugins de Capacitor lanzan "not implemented". Un háptico que rompe la navegación
  sería peor que no tener háptico.
*/

const MOBILE_VIEWPORT = "(max-width: 767px)";
const APP_HOSTS = new Set(["ceoubb.com", "www.ceoubb.com", "localhost", "127.0.0.1"]);

/** Silencia cualquier fallo del puente: en web todos los plugins nativos rechazan. */
function quiet(run: () => Promise<unknown>) {
  void run().catch(() => undefined);
}

// Implements: REQ-CAP-04
export function isNativeShell() {
  return Capacitor.isNativePlatform();
}

/*
  El viewport es un sistema externo, no estado de React: se lee con
  `useSyncExternalStore` para que el primer render del cliente ya conozca el ancho
  real. Con `useState` + efecto habría un render de escritorio antes del móvil —
  la barra inferior entraría de golpe después de pintar.
*/
function subscribeViewport(onChange: () => void) {
  if (Capacitor.isNativePlatform()) return () => undefined;
  const query = window.matchMedia(MOBILE_VIEWPORT);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Verdadero en el contenedor nativo y en cualquier viewport móvil del navegador. */
// Implements: REQ-CAP-04
export function useIsMobileApp() {
  return useSyncExternalStore(
    subscribeViewport,
    () => Capacitor.isNativePlatform() || window.matchMedia(MOBILE_VIEWPORT).matches,
    // En el servidor no hay viewport: el HTML se emite con el shell de escritorio.
    () => false
  );
}

// Implements: REQ-CAP-06
export function hapticTap() {
  quiet(() => Haptics.impact({ style: ImpactStyle.Light }));
}

// Implements: REQ-CAP-06
export function hapticSuccess() {
  quiet(() => Haptics.notification({ type: NotificationType.Success }));
}

// Implements: REQ-CAP-06
export function hapticError() {
  quiet(() => Haptics.notification({ type: NotificationType.Error }));
}

/**
 * Franja de estado: navy institucional sobre las bandas heroicas, papel sobre el
 * resto del portal. Los dos valores son los tokens de `DESIGN.md`.
 */
// Implements: REQ-CAP-07
export function useStatusBar(tone: "hero" | "canvas") {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const hero = tone === "hero";
    quiet(async () => {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: hero ? "#002b5c" : "#f4f6f9" });
      await StatusBar.setStyle({ style: hero ? Style.Dark : Style.Light });
    });
  }, [tone]);
}

/** Un enlace es externo cuando su host no pertenece al portal. */
// Implements: REQ-CAP-15
export function isExternalUrl(href: string, origin = "https://ceoubb.com") {
  let url: URL;
  try {
    url = new URL(href, origin);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return !APP_HOSTS.has(url.hostname);
}

/** Abre fuera de la WebView; en navegador deja que el enlace siga su curso. */
// Implements: REQ-CAP-15
export function openExternal(href: string) {
  if (!Capacitor.isNativePlatform()) return false;
  quiet(() => Browser.open({ url: href }));
  return true;
}

/**
 * Delegación única sobre el documento: cualquier `<a>` a otro dominio sale al
 * navegador del sistema en vez de secuestrar la WebView.
 */
// Implements: REQ-CAP-15
export function useExternalLinks() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const intercept = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      const href = anchor?.getAttribute("href");
      if (!href || !isExternalUrl(href, window.location.origin)) return;
      event.preventDefault();
      openExternal(new URL(href, window.location.origin).toString());
    };
    document.addEventListener("click", intercept);
    return () => document.removeEventListener("click", intercept);
  }, []);
}

/**
 * Botón atrás de Android. `onBack` devuelve `true` cuando ya consumió el gesto;
 * desde una pestaña raíz nadie lo consume y la app se va al fondo — nunca se
 * deja la WebView en blanco navegando fuera del historial.
 *
 * El manejador vive en una ref y el listener se registra una sola vez. `onBack`
 * cambia en cada navegación, y `App.addListener` es asíncrono: volver a suscribir
 * en cada cambio deja una ventana —entre el `addListener` nuevo y el `remove()`
 * del anterior— con dos listeners vivos. Una pulsación ahí dentro retrocedería
 * dos niveles de una vez.
 */
// Implements: REQ-CAP-15
export function useHardwareBack(onBack: () => boolean) {
  const handler = useRef(onBack);

  useEffect(() => {
    handler.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = App.addListener("backButton", () => {
      if (handler.current()) return;
      quiet(() => App.minimizeApp());
    });
    return () => {
      void listener.then((handle) => handle.remove()).catch(() => undefined);
    };
  }, []);
}
