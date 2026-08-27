import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { getSessionUser } from "../../../../lib/auth";
import {
  AVATAR_CONTENT_TYPES,
  AVATAR_MAX_BYTES,
  avatarPublicUrl,
  avatarStoragePath,
  deleteAvatarObject,
  firebaseUid,
  projectUserPhotoToFirestore,
  uploadAvatarObject,
} from "../../../../lib/services/user-profile";

/*
  El archivo se valida antes de tocar el almacenamiento: tipo dentro de la
  lista admitida y tamaño bajo el tope. Un archivo rechazado no deja objeto
  huérfano ni fila actualizada.
*/
// Implements: REQ-CFG-02
const fotoSchema = z.object({
  contentType: z.enum(AVATAR_CONTENT_TYPES),
  size: z.number().int().positive().max(AVATAR_MAX_BYTES, "La imagen no puede superar los 2 MB."),
});

// Implements: REQ-CFG-02
export async function POST(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor) return Response.json({ error: "Sesión no válida." }, { status: 401 });

  let file: File | null = null;
  try {
    const form = await request.formData();
    const candidate = form.get("photo");
    if (candidate instanceof File) file = candidate;
  } catch {
    return Response.json({ error: "No se pudo leer la imagen enviada." }, { status: 400 });
  }
  if (!file) return Response.json({ error: "Adjunta una imagen." }, { status: 400 });

  const parsed = fotoSchema.safeParse({ contentType: file.type, size: file.size });
  if (!parsed.success) {
    return Response.json(
      {
        error: "La imagen no cumple el formato admitido.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 }
    );
  }

  try {
    const uid = firebaseUid(actor.id);
    const storagePath = avatarStoragePath(uid, parsed.data.contentType);
    await uploadAvatarObject(storagePath, await file.arrayBuffer(), parsed.data.contentType);
    const photoUrl = avatarPublicUrl(storagePath);
    const db = getDb();
    await db.update(users).set({ photoUrl }).where(eq(users.id, actor.id));
    await projectUserPhotoToFirestore(actor.id, photoUrl);
    return Response.json({ photoUrl });
  } catch (cause) {
    console.error("[api/profile/photo] POST", cause);
    return Response.json({ error: "No se pudo actualizar la foto de perfil." }, { status: 500 });
  }
}

/*
  Restablecer no guarda la URL de Google en la base: esa dirección puede rotar
  y quedaría congelada. Se limpia la columna y el avatar vuelve a resolver por
  precedencia hacia la foto de la cuenta institucional.
*/
// Implements: REQ-CFG-03
export async function DELETE(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor) return Response.json({ error: "Sesión no válida." }, { status: 401 });

  try {
    const uid = firebaseUid(actor.id);
    // Las tres extensiones posibles se borran a la vez: son independientes y
    // encadenarlas triplicaría la latencia de una acción que el usuario espera.
    await Promise.all(
      AVATAR_CONTENT_TYPES.map((contentType) =>
        deleteAvatarObject(avatarStoragePath(uid, contentType))
      )
    );
    const db = getDb();
    await db.update(users).set({ photoUrl: null }).where(eq(users.id, actor.id));
    await projectUserPhotoToFirestore(actor.id, null);
    return Response.json({ photoUrl: null });
  } catch (cause) {
    console.error("[api/profile/photo] DELETE", cause);
    return Response.json({ error: "No se pudo restablecer la foto de perfil." }, { status: 500 });
  }
}
