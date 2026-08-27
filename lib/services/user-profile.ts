import { z } from "zod";
import {
  FIREBASE_PROJECT_ID,
  STORAGE_SCOPE,
  commitFirestoreWrites,
  googleAccessToken,
  isValidPathSegment,
  type FirestoreValue,
  type FirestoreWrite,
} from "./enrollment-projection.ts";

const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "centro-de-estudio-ubb.firebasestorage.app";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

const AVATAR_EXTENSIONS: Record<(typeof AVATAR_CONTENT_TYPES)[number], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const NOTIFICATION_CHANNELS = [
  "sectionPublications",
  "teacherAnnouncements",
  "gradeChanges",
  "assessmentReminders",
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export type ChannelPreference = { web: boolean; push: boolean };

export type UserPreferences = {
  channels: Record<NotificationChannel, ChannelPreference>;
  reducedMotion: boolean;
};

const channelPreferenceSchema = z.object({ web: z.boolean(), push: z.boolean() });

/*
  El esquema es cerrado en los dos ejes: `strict()` rechaza un canal que no
  exista y `z.boolean()` rechaza cualquier valor que no sea booleano. Una
  preferencia mal formada no puede escribir nada.
*/
// Implements: REQ-CFG-04
export const preferencesSchema = z
  .object({
    channels: z
      .object({
        sectionPublications: channelPreferenceSchema,
        teacherAnnouncements: channelPreferenceSchema,
        gradeChanges: channelPreferenceSchema,
        assessmentReminders: channelPreferenceSchema,
      })
      .strict(),
    reducedMotion: z.boolean(),
  })
  .strict();

/*
  Toda cuenta parte con cada canal activo. El valor por defecto vive aquí y no
  en la vista para que servidor y cliente coincidan sin escribir un documento
  antes de que el usuario cambie algo.
*/
// Implements: REQ-CFG-04
export function defaultPreferences(): UserPreferences {
  const channels = {} as Record<NotificationChannel, ChannelPreference>;
  for (const channel of NOTIFICATION_CHANNELS) {
    channels[channel] = { web: true, push: true };
  }
  return { channels, reducedMotion: false };
}

export function firebaseUid(value: string): string {
  return value.startsWith("firebase:") ? value.slice("firebase:".length) : value;
}

// Implements: REQ-CFG-02
export function avatarStoragePath(uid: string, contentType: string): string {
  if (!isValidPathSegment(uid)) throw new Error("Identificador de usuario inválido.");
  const extension = AVATAR_EXTENSIONS[contentType as (typeof AVATAR_CONTENT_TYPES)[number]];
  if (!extension) throw new Error("Tipo de imagen no admitido.");
  return `avatars/${uid}/profile.${extension}`;
}

export function avatarPublicUrl(storagePath: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media`;
}

/*
  El objeto se sube con la cuenta de servicio bajo el prefijo del propio
  usuario. Las reglas de Storage repiten la misma restricción para el cliente,
  de modo que ninguna vía permite escribir sobre el prefijo de otra persona.
*/
// Implements: REQ-CFG-02
export async function uploadAvatarObject(
  storagePath: string,
  bytes: ArrayBuffer,
  contentType: string
): Promise<void> {
  const token = await googleAccessToken(STORAGE_SCOPE);
  const response = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`,
    {
      method: "POST",
      headers: { "Content-Type": contentType, Authorization: `Bearer ${token}` },
      body: bytes,
    }
  );
  if (!response.ok) throw new Error("No se pudo guardar la imagen en el almacenamiento.");
}

// Implements: REQ-CFG-03
export async function deleteAvatarObject(storagePath: string): Promise<void> {
  const token = await googleAccessToken(STORAGE_SCOPE);
  const response = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${STORAGE_BUCKET}/o/${encodeURIComponent(storagePath)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  // 404 significa que ya no existe: el objetivo de borrar está cumplido igual.
  if (!response.ok && response.status !== 404) {
    throw new Error("No se pudo eliminar la imagen anterior.");
  }
}

// Implements: REQ-CFG-02 REQ-CFG-03
export async function projectUserPhotoToFirestore(
  userId: string,
  photoUrl: string | null
): Promise<void> {
  const uid = firebaseUid(userId);
  if (!isValidPathSegment(uid)) throw new Error("Identificador de usuario inválido.");
  const write: FirestoreWrite = {
    update: {
      name: `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`,
      fields: { photoUrl: photoUrl ? { stringValue: photoUrl } : { nullValue: null } },
    },
    updateMask: { fieldPaths: ["photoUrl"] },
  };
  await commitFirestoreWrites([write]);
}

// Implements: REQ-CFG-04 REQ-CFG-05
export async function writePreferencesToFirestore(
  userId: string,
  preferences: UserPreferences
): Promise<void> {
  const uid = firebaseUid(userId);
  if (!isValidPathSegment(uid)) throw new Error("Identificador de usuario inválido.");
  const channelFields: Record<string, FirestoreValue> = {};
  for (const channel of NOTIFICATION_CHANNELS) {
    channelFields[channel] = {
      mapValue: {
        fields: {
          web: { booleanValue: preferences.channels[channel].web },
          push: { booleanValue: preferences.channels[channel].push },
        },
      },
    };
  }
  const write: FirestoreWrite = {
    update: {
      name: `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}/settings/preferences`,
      fields: {
        channels: { mapValue: { fields: channelFields } },
        reducedMotion: { booleanValue: preferences.reducedMotion },
      },
    },
    updateMask: { fieldPaths: ["channels", "reducedMotion"] },
  };
  await commitFirestoreWrites([write]);
}

type FirestoreReadValue = {
  booleanValue?: boolean;
  mapValue?: { fields?: Record<string, FirestoreReadValue> };
};

function readBoolean(value: FirestoreReadValue | undefined, fallback: boolean): boolean {
  return typeof value?.booleanValue === "boolean" ? value.booleanValue : fallback;
}

/*
  Un documento ausente no es un error: significa que el usuario nunca abrió
  Configuración y le corresponden los valores por defecto.
*/
// Implements: REQ-CFG-04
export async function readPreferencesFromFirestore(userId: string): Promise<UserPreferences> {
  const uid = firebaseUid(userId);
  if (!isValidPathSegment(uid)) throw new Error("Identificador de usuario inválido.");
  const token = await googleAccessToken();
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}/settings/preferences`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const defaults = defaultPreferences();
  if (response.status === 404) return defaults;
  if (!response.ok) throw new Error("No se pudieron leer las preferencias.");
  const document = (await response.json()) as { fields?: Record<string, FirestoreReadValue> };
  const channelFields = document.fields?.channels?.mapValue?.fields ?? {};
  const channels = {} as Record<NotificationChannel, ChannelPreference>;
  for (const channel of NOTIFICATION_CHANNELS) {
    const stored = channelFields[channel]?.mapValue?.fields;
    channels[channel] = {
      web: readBoolean(stored?.web, true),
      push: readBoolean(stored?.push, true),
    };
  }
  return {
    channels,
    reducedMotion: readBoolean(document.fields?.reducedMotion, false),
  };
}

/*
  El emisor de push consulta esta función antes de enviar. Un canal apagado no
  produce mensaje; ante cualquier fallo de lectura se conserva el valor por
  defecto para no silenciar avisos por un error transitorio.
*/
// Implements: REQ-CFG-04
export async function pushChannelEnabled(
  userId: string,
  channel: NotificationChannel
): Promise<boolean> {
  try {
    const preferences = await readPreferencesFromFirestore(userId);
    return preferences.channels[channel].push;
  } catch {
    return defaultPreferences().channels[channel].push;
  }
}
