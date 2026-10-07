"use client";

import { useEffect, useState } from "react";
import {
  defaultPreferences,
  preferencesSchema,
  type NotificationChannel,
  type UserPreferences,
} from "./services/user-profile.ts";

export type {
  ChannelPreference,
  NotificationChannel,
  UserPreferences,
} from "./services/user-profile.ts";
export { NOTIFICATION_CHANNELS, defaultPreferences } from "./services/user-profile.ts";

const CACHE_KEY = "ceoubb:preferences";
const CHANGE_EVENT = "ceoubb:preferences-changed";

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  sectionPublications: "Publicaciones de mis secciones",
  teacherAnnouncements: "Anuncios del equipo docente",
  gradeChanges: "Cambios en mis calificaciones",
  assessmentReminders: "Recordatorios de evaluaciones próximas",
};

/*
  Los canales sin emisor propio todavía se persisten, pero nada los envía. Se
  marcan aquí para que la interfaz lo diga en vez de prometer un aviso que no
  existe.
*/
// Implements: REQ-CFG-04
export const CHANNELS_WITHOUT_SENDER: readonly NotificationChannel[] = [
  "gradeChanges",
  "assessmentReminders",
];

function readCache(): UserPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const validation = preferencesSchema.safeParse(parsed);
    if (validation.success) {
      return validation.data;
    }
    // Si la caché tiene un esquema viejo o datos corruptos, limpiar para no romper la UI
    window.localStorage.removeItem(CACHE_KEY);
    return defaultPreferences();
  } catch {
    return null;
  }
}

function writeCache(preferences: UserPreferences) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(preferences));
  } catch {
    // Sin almacenamiento local la preferencia se vuelve a pedir al servidor.
  }
  window.dispatchEvent(new CustomEvent<UserPreferences>(CHANGE_EVENT, { detail: preferences }));
}

export function forgetPreferences() {
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // Nada que limpiar.
  }
  window.dispatchEvent(
    new CustomEvent<UserPreferences>(CHANGE_EVENT, { detail: defaultPreferences() })
  );
}

// Implements: REQ-CFG-04, REQ-QMD-02
export async function loadPreferences(signal?: AbortSignal): Promise<UserPreferences> {
  const response = await fetch("/api/profile/preferences", { signal });
  if (!response.ok) throw new Error("No se pudieron leer las preferencias.");
  const data = (await response.json()) as { preferences: UserPreferences };
  writeCache(data.preferences);
  return data.preferences;
}

// Implements: REQ-CFG-04 REQ-CFG-05
export async function savePreferences(preferences: UserPreferences): Promise<UserPreferences> {
  const response = await fetch("/api/profile/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "No se pudieron guardar las preferencias.");
  }
  const data = (await response.json()) as { preferences: UserPreferences };
  writeCache(data.preferences);
  return data.preferences;
}

/*
  La preferencia del sistema nunca se puede anular desde la aplicación: quien
  la activó en su dispositivo no debe perderla por un ajuste del producto. Por
  eso este valor sólo puede añadir supresión de movimiento, jamás quitarla.
*/
// Implements: REQ-CFG-05, REQ-QMD-02
export function useReducedMotionPreference(enabled: boolean): boolean {
  const [reduced, setReduced] = useState(() => readCache()?.reducedMotion ?? false);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<UserPreferences>).detail;
      setReduced(detail?.reducedMotion ?? false);
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  // react-doctor-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    loadPreferences(controller.signal)
      .then((preferences) => {
        setReduced(preferences.reducedMotion);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        // Sin respuesta se conserva el valor en caché; el sistema sigue mandando.
      });
    return () => {
      controller.abort();
    };
  }, [enabled]);

  return reduced;
}
