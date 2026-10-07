import { firebaseRestOrigins } from "../firebase-endpoints.ts";
import {
  AVATAR_CONTENT_TYPES,
  NOTIFICATION_CHANNELS,
  defaultPreferences,
  firebaseUid,
  type ChannelPreference,
  type NotificationChannel,
  type UserPreferences,
} from "../user-profile-contract.ts";
import {
  FIREBASE_PROJECT_ID,
  STORAGE_SCOPE,
  commitFirestoreWrites,
  googleAccessToken,
  isValidPathSegment,
  type FirestoreValue,
  type FirestoreWrite,
} from "./enrollment-projection.ts";

// Implements: REQ-PERF-LOAD-01
export {
  AVATAR_CONTENT_TYPES,
  AVATAR_MAX_BYTES,
  NOTIFICATION_CHANNELS,
  defaultPreferences,
  detectImageMagicBytes,
  firebaseUid,
  preferencesSchema,
  type ChannelPreference,
  type NotificationChannel,
  type UserPreferences,
} from "../user-profile-contract.ts";

const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "centro-de-estudio-ubb.firebasestorage.app";

const AVATAR_EXTENSIONS: Record<(typeof AVATAR_CONTENT_TYPES)[number], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

// Implements: REQ-CFG-02
export function avatarStoragePath(uid: string, contentType: string): string {
  if (!isValidPathSegment(uid)) throw new Error("Identificador de usuario inválido.");
  const extension = AVATAR_EXTENSIONS[contentType as (typeof AVATAR_CONTENT_TYPES)[number]];
  if (!extension) throw new Error("Tipo de imagen no admitido.");
  return `avatars/${uid}/profile.${extension}`;
}

export function avatarPublicUrl(storagePath: string): string {
  return `${firebaseRestOrigins().storageDownload}/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media`;
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
    `${firebaseRestOrigins().storage}/upload/storage/v1/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`,
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
    `${firebaseRestOrigins().storage}/storage/v1/b/${STORAGE_BUCKET}/o/${encodeURIComponent(storagePath)}`,
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

  /*
    Proyección para el emisor de push. La Cloud Function que avisa de una
    publicación necesita token y permiso del mismo documento: si tuviera que
    abrir además la subcolección de preferencias, cada publicación costaría dos
    lecturas por estudiante en vez de una. Las banderas viajan en el mismo
    commit que el documento canónico, así que no pueden quedar desfasadas.
  */
  const pushFields: Record<string, FirestoreValue> = {};
  for (const channel of NOTIFICATION_CHANNELS) {
    pushFields[channel] = { booleanValue: preferences.channels[channel].push };
  }
  const projection: FirestoreWrite = {
    update: {
      name: `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`,
      fields: { pushChannels: { mapValue: { fields: pushFields } } },
    },
    updateMask: { fieldPaths: ["pushChannels"] },
  };

  await commitFirestoreWrites([write, projection]);
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
  const defaults = defaultPreferences();
  const uid = firebaseUid(userId);
  if (!isValidPathSegment(uid)) throw new Error("Identificador de usuario inválido.");
  try {
    const token = await googleAccessToken();
    const response = await fetch(
      `${firebaseRestOrigins().firestore}/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}/settings/preferences`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (response.status === 404 || !response.ok) return defaults;
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
  } catch {
    return defaults;
  }
}
