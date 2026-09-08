import { z } from "zod";
import {
  commitFirestoreWrites,
  FIREBASE_PROJECT_ID,
  googleAccessToken,
  isValidPathSegment,
  invalidateCourseDownloadTokens,
} from "./enrollment-projection.ts";

const documents = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const revocationSchema = z.object({
  fields: z.object({
    revokedAt: z.object({ integerValue: z.coerce.number().int().nonnegative() }),
    disabled: z.object({ booleanValue: z.boolean() }).default({ booleanValue: false }),
  }),
});
const tokenSchema = z.object({ sub: z.string(), auth_time: z.number().int().nonnegative() });

function firebaseUid(userId: string) {
  const uid = userId.replace(/^firebase:/, "");
  if (!isValidPathSegment(uid)) throw new Error("Identidad Firebase inválida.");
  return uid;
}

// Implements: REQ-SEC-01 — SEC-01: el corte se comprueba también en reglas y Callables.
export async function revokeFirebaseAccess(userId: string, disabled = false, owner = false) {
  if (userId.startsWith("dev:")) return;
  const uid = firebaseUid(userId);
  const revokedAt = Math.floor(Date.now() / 1000);
  await commitFirestoreWrites([
    {
      update: {
        name: `${documents}/authRevocations/${uid}`,
        fields: {
          ...(disabled ? { disabled: { booleanValue: true } } : {}),
        },
      },
      updateMask: { fieldPaths: disabled ? ["disabled"] : [] },
      updateTransforms: [{ fieldPath: "revokedAt", maximum: { integerValue: String(revokedAt) } }],
    },
  ]);
  const token = await googleAccessToken("https://www.googleapis.com/auth/identitytoolkit");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/accounts:update`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        localId: uid,
        validSince: String(revokedAt + 1),
        ...(disabled ? { disableUser: true } : {}),
      }),
    }
  );
  if (!response.ok) {
    const result = z
      .object({ error: z.object({ message: z.string() }) })
      .safeParse(await response.json());
    if (!(disabled && result.success && result.data.error.message === "USER_NOT_FOUND"))
      throw new Error("Firebase no confirmó la revocación de la identidad.");
  }
  if (owner) {
    await invalidateCourseDownloadTokens();
  } else {
    const firestoreToken = await googleAccessToken();
    const pageSchema = z.object({
      documents: z.array(z.object({ name: z.string() })).optional(),
      nextPageToken: z.string().optional(),
    });
    let pageToken = "";
    do {
      const query = new URLSearchParams({ pageSize: "100", ...(pageToken ? { pageToken } : {}) });
      const response = await fetch(
        `https://firestore.googleapis.com/v1/${documents}/enrollments/${encodeURIComponent(uid)}/sections?${query}`,
        { headers: { Authorization: `Bearer ${firestoreToken}` } }
      );
      if (!response.ok) throw new Error("No se pudieron revocar los enlaces de esta cuenta.");
      const page = pageSchema.parse(await response.json());
      const prefix = `${documents}/enrollments/${uid}/sections/`;
      for (const entry of page.documents ?? []) {
        if (!entry.name.startsWith(prefix) || !isValidPathSegment(entry.name.slice(prefix.length)))
          throw new Error("Matrícula inválida.");
        await invalidateCourseDownloadTokens(entry.name.slice(prefix.length));
      }
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);
  }
}

// Sólo después de accounts:lookup: decodificar un JWT no verifica su firma.
export async function firebaseCredentialIsActive(idToken: string, uid: string) {
  const claims = tokenSchema.parse(
    JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8"))
  );
  if (claims.sub !== uid) return false;
  const token = await googleAccessToken();
  const response = await fetch(
    `https://firestore.googleapis.com/v1/${documents}/authRevocations/${encodeURIComponent(firebaseUid(uid))}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  if (response.status === 404) return true;
  if (!response.ok) throw new Error("No se pudo comprobar la revocación.");
  const { fields } = revocationSchema.parse(await response.json());
  return !fields.disabled.booleanValue && claims.auth_time > fields.revokedAt.integerValue;
}

// La cuenta relacional permanece hasta completar la limpieza, permitiendo reintentar.
export async function deleteFirebaseAccountData(userId: string) {
  if (userId.startsWith("dev:")) return;
  const uid = firebaseUid(userId);
  const token = await googleAccessToken();
  const pageSchema = z.object({
    documents: z.array(z.object({ name: z.string() })).optional(),
    nextPageToken: z.string().optional(),
  });
  for (const collection of [
    `enrollments/${uid}/sections`,
    `users/${uid}/settings`,
    `users/${uid}/calendar_events`,
    `users/${uid}/notificationReads`,
  ]) {
    let pageToken = "";
    do {
      const query = new URLSearchParams({ pageSize: "100", ...(pageToken ? { pageToken } : {}) });
      const response = await fetch(
        `https://firestore.googleapis.com/v1/${documents}/${collection}?${query}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("No se pudo limpiar el acceso Firebase.");
      const page = pageSchema.parse(await response.json());
      const prefix = `${documents}/${collection}/`;
      if (
        page.documents?.some(
          (doc) => !doc.name.startsWith(prefix) || doc.name.slice(prefix.length).includes("/")
        )
      )
        throw new Error("Ruta de limpieza inválida.");
      await commitFirestoreWrites((page.documents ?? []).map(({ name }) => ({ delete: name })));
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);
  }
  await commitFirestoreWrites([{ delete: `${documents}/users/${uid}` }]);
  // Se conserva authRevocations como lápida: un ID token anterior nunca recrea el perfil.
  const authToken = await googleAccessToken("https://www.googleapis.com/auth/identitytoolkit");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/accounts:delete`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ localId: uid }),
    }
  );
  if (!response.ok) {
    const error = z
      .object({ error: z.object({ message: z.string() }) })
      .parse(await response.json());
    if (error.error.message !== "USER_NOT_FOUND")
      throw new Error("No se pudo eliminar la identidad Firebase.");
  }
}
