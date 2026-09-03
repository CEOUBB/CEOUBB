import { and, eq } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { interopResources } from "../../db/schema.ts";
import type { PublicUser } from "../auth.ts";
import { fail } from "../interop/errors.ts";
import { packageBuffer } from "../interop/zip.ts";
import { inspectLearningPackage, packageContentType } from "../interop/packages.ts";
import { googleAccessToken, STORAGE_SCOPE } from "./enrollment-projection.ts";
import { authorizeInteropSection, insertInteropResource } from "./interop.ts";

const bucket = process.env.FIREBASE_STORAGE_BUCKET || "centro-de-estudio-ubb.firebasestorage.app";
const objectUrl = (path: string) =>
  "https://storage.googleapis.com/storage/v1/b/" +
  encodeURIComponent(bucket) +
  "/o/" +
  encodeURIComponent(path);

async function uploadObject(path: string, bytes: Uint8Array, contentType: string, token: string) {
  const url =
    "https://storage.googleapis.com/upload/storage/v1/b/" +
    encodeURIComponent(bucket) +
    "/o?uploadType=media&ifGenerationMatch=0&name=" +
    encodeURIComponent(path);
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": contentType },
    body: packageBuffer(bytes),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) fail("No se pudo guardar el paquete en el almacenamiento privado.", 503);
}
async function deleteObject(path: string, token: string) {
  await fetch(objectUrl(path), {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
    signal: AbortSignal.timeout(15000),
  });
}
export async function readInteropObject(path: string) {
  const response = await fetch(objectUrl(path) + "?alt=media", {
    headers: { Authorization: "Bearer " + (await googleAccessToken(STORAGE_SCOPE)) },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok || !response.body)
    fail("El archivo del recurso no está disponible.", response.status === 404 ? 404 : 503);
  return response;
}
export async function importLearningPackage(
  actor: PublicUser,
  sectionId: string,
  bytes: Uint8Array
) {
  await authorizeInteropSection(actor, sectionId, true);
  const fingerprint = Buffer.from(
    await crypto.subtle.digest("SHA-256", packageBuffer(bytes))
  ).toString("hex");
  const [existing] = await getDb()
    .select({ id: interopResources.id })
    .from(interopResources)
    .where(
      and(eq(interopResources.sectionId, sectionId), eq(interopResources.fingerprint, fingerprint))
    )
    .limit(1);
  if (existing) return { id: existing.id, reused: true };
  const { archive, manifest } = await inspectLearningPackage(bytes);
  const id = crypto.randomUUID();
  const prefix = "interop/" + sectionId + "/" + id + "/";
  const token = await googleAccessToken(STORAGE_SCOPE);
  const uploaded: string[] = [];
  let published = false;
  try {
    await uploadObject(prefix + "original.zip", bytes, "application/zip", token);
    uploaded.push(prefix + "original.zip");
    for (const entry of archive.entries) {
      const path = prefix + "files/" + entry.name;
      await uploadObject(
        path,
        await archive.read(entry.name),
        packageContentType(entry.name),
        token
      );
      uploaded.push(path);
    }
    await authorizeInteropSection(actor, sectionId, true);
    const savedId = await insertInteropResource({
      id,
      sectionId,
      title: manifest.title,
      kind: manifest.kind,
      manifestJson: JSON.stringify(manifest),
      storagePrefix: prefix,
      fingerprint,
      createdBy: actor.id,
      createdAt: new Date().toISOString(),
    });
    published = savedId === id;
    return { id: savedId, reused: savedId !== id };
  } finally {
    if (!published) {
      for (const path of uploaded) await deleteObject(path, token).catch(() => undefined);
    }
  }
}
