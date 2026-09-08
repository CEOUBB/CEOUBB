import { and, asc, count, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db/index.ts";
import {
  interopGrants,
  interopProgress,
  interopResources,
  interopStatements,
  interopTools,
  matriculas,
  periodos,
  secciones,
  sessions,
  users,
} from "../../db/schema.ts";
import type { PublicUser } from "../auth.ts";
import { isSectionId, type SectionRole } from "../section-roles.ts";
import {
  contentOrigin,
  platformOrigin,
  resourceInputSchema,
  toolInputSchema,
} from "../interop/config.ts";
import { fail } from "../interop/errors.ts";
import { oidcSchema, privateLtiKey, signLtiLaunch } from "../interop/lti.ts";
import { packageManifestSchema } from "../interop/packages.ts";
import { validateScormData } from "../interop/scorm.ts";
import { canonicalJson, validateStatement } from "../interop/xapi.ts";

export const interopServiceRequirements = [
  "REQ-IO-01",
  "REQ-IO-02",
  "REQ-IO-03",
  "REQ-IO-07",
  "REQ-IO-08",
  "REQ-IO-11",
] as const;
export const hashToken = async (token: string) =>
  Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))).toString(
    "hex"
  );

export async function authorizeInteropSection(actor: PublicUser, sectionId: string, write = false) {
  if (!isSectionId(sectionId)) fail("La sección no existe.", 404);
  const [section] = await getDb()
    .select({ id: secciones.id, state: periodos.estado })
    .from(secciones)
    .innerJoin(periodos, eq(periodos.id, secciones.periodoId))
    .where(eq(secciones.id, sectionId))
    .limit(1);
  if (!section) fail("La sección no existe.", 404);
  const [enrollment] = await getDb()
    .select({ role: matriculas.rolSeccion })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.seccionId, sectionId),
        eq(matriculas.usuarioId, actor.id),
        eq(matriculas.estado, "activa")
      )
    )
    .limit(1);
  const role: SectionRole | "owner" =
    actor.role === "owner"
      ? "owner"
      : (enrollment?.role ?? fail("No tienes matrícula activa en esta sección.", 403));
  if (
    write &&
    (section.state !== "abierto" ||
      !(
        role === "owner" ||
        (actor.role === "teacher" && ["teacher", "coordinator"].includes(role))
      ))
  )
    fail("Esta sección no admite cambios de tu cuenta.", 403);
  return { role, state: section.state };
}

export async function registerTool(actor: PublicUser, input: unknown) {
  if (actor.role !== "owner") fail("Sólo administración puede registrar herramientas.", 403);
  const parsed = toolInputSchema.parse(input);
  const row = {
    id: crypto.randomUUID(),
    clientId: crypto.randomUUID(),
    deploymentId: crypto.randomUUID(),
    name: parsed.name,
    loginUrl: parsed.loginUrl,
    redirectUrisJson: JSON.stringify(parsed.redirectUris),
    targetUrisJson: JSON.stringify(parsed.targetUris),
    enabled: true,
    createdBy: actor.id,
    createdAt: new Date().toISOString(),
  };
  await getDb().transaction(async (tx) => {
    const [total] = await tx.select({ value: count() }).from(interopTools).limit(1);
    if (total.value >= 100) fail("Se alcanzó el máximo de 100 herramientas registradas.", 429);
    await tx.insert(interopTools).values(row);
  });
  return toolView(row);
}
export async function setToolEnabled(actor: PublicUser, id: string, enabled: boolean) {
  if (actor.role !== "owner") fail("Sólo administración puede cambiar herramientas.", 403);
  const changed = await getDb()
    .update(interopTools)
    .set({ enabled })
    .where(eq(interopTools.id, id))
    .returning({ id: interopTools.id });
  if (!changed.length) fail("La herramienta no existe.", 404);
}
function toolView(row: typeof interopTools.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    clientId: row.clientId,
    deploymentId: row.deploymentId,
    loginUrl: row.loginUrl,
    redirectUris: z.array(z.string()).parse(JSON.parse(row.redirectUrisJson)),
    targetUris: z.array(z.string()).parse(JSON.parse(row.targetUrisJson)),
    enabled: row.enabled,
  };
}
export async function listInteropTools(cursor?: string) {
  const rows = await getDb()
    .select()
    .from(interopTools)
    .where(cursor ? gt(interopTools.id, cursor) : undefined)
    .orderBy(asc(interopTools.id))
    .limit(51);
  const items = rows.slice(0, 50).map(toolView);
  return { items, nextCursor: rows.length > 50 ? items.at(-1)!.id : null };
}
async function activeTool(id: string) {
  const [row] = await getDb()
    .select()
    .from(interopTools)
    .where(and(eq(interopTools.id, id), eq(interopTools.enabled, true)))
    .limit(1);
  if (!row) fail("La herramienta está deshabilitada o no existe.", 404);
  return toolView(row);
}
export async function insertInteropResource(row: typeof interopResources.$inferInsert) {
  return getDb().transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: interopResources.id })
      .from(interopResources)
      .where(
        and(
          eq(interopResources.sectionId, row.sectionId),
          eq(interopResources.fingerprint, row.fingerprint)
        )
      )
      .limit(1);
    if (existing) return existing.id;
    const [total] = await tx
      .select({ value: count() })
      .from(interopResources)
      .where(eq(interopResources.sectionId, row.sectionId))
      .limit(1);
    if (total.value >= 100) fail("Esta sección alcanzó el máximo de 100 recursos externos.", 429);
    await tx.insert(interopResources).values(row);
    return row.id;
  });
}
export async function linkLtiResource(actor: PublicUser, sectionId: string, input: unknown) {
  await authorizeInteropSection(actor, sectionId, true);
  const parsed = resourceInputSchema.parse(input);
  const tool = await activeTool(parsed.toolId);
  if (!tool.targetUris.includes(parsed.targetUrl))
    fail("El destino no está registrado para esta herramienta.");
  return insertInteropResource({
    id: crypto.randomUUID(),
    sectionId,
    title: parsed.title,
    kind: "lti",
    toolId: tool.id,
    targetUrl: parsed.targetUrl,
    fingerprint: await hashToken("lti:" + tool.id + ":" + parsed.targetUrl),
    createdBy: actor.id,
    createdAt: new Date().toISOString(),
  });
}
export async function listInteropResources(actor: PublicUser, sectionId: string, cursor?: string) {
  await authorizeInteropSection(actor, sectionId);
  const rows = await getDb()
    .select({
      id: interopResources.id,
      title: interopResources.title,
      kind: interopResources.kind,
      createdAt: interopResources.createdAt,
    })
    .from(interopResources)
    .where(
      and(
        eq(interopResources.sectionId, sectionId),
        cursor ? gt(interopResources.id, cursor) : undefined
      )
    )
    .orderBy(asc(interopResources.id))
    .limit(51);
  const items = rows.slice(0, 50);
  return { items, nextCursor: rows.length > 50 ? items.at(-1)!.id : null };
}
export async function getInteropResource(
  actor: PublicUser,
  sectionId: string,
  resourceId: string,
  write = false
) {
  const access = await authorizeInteropSection(actor, sectionId, write);
  const [resource] = await getDb()
    .select()
    .from(interopResources)
    .where(and(eq(interopResources.id, resourceId), eq(interopResources.sectionId, sectionId)))
    .limit(1);
  if (!resource) fail("El recurso no existe en esta sección.", 404);
  return { resource, access };
}
async function createGrant(
  actor: PublicUser,
  resourceId: string,
  kind: "lti" | "content",
  sessionHash: string
) {
  const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");
  const now = new Date().toISOString();
  const db = getDb();
  const expired = await db
    .select({ hash: interopGrants.tokenHash })
    .from(interopGrants)
    .where(lt(interopGrants.expiresAt, now))
    .orderBy(asc(interopGrants.expiresAt))
    .limit(100);
  if (expired.length)
    await db.delete(interopGrants).where(
      inArray(
        interopGrants.tokenHash,
        expired.map((g) => g.hash)
      )
    );
  const grant = {
    tokenHash: await hashToken(token),
    registration: crypto.randomUUID(),
    userId: actor.id,
    resourceId,
    kind,
    sessionHash,
    expiresAt: new Date(Date.now() + (kind === "lti" ? 300 : 7200) * 1000).toISOString(),
  };
  await db.transaction(async (tx) => {
    const [total] = await tx
      .select({ value: count() })
      .from(interopGrants)
      .where(
        and(
          eq(interopGrants.userId, actor.id),
          gt(interopGrants.expiresAt, now),
          isNull(interopGrants.consumedAt)
        )
      )
      .limit(1);
    if (total.value >= 20)
      fail("Tienes demasiadas sesiones de recursos abiertas. Espera antes de volver a abrir.", 429);
    await tx.insert(interopGrants).values(grant);
  });
  return { token, ...grant };
}
export async function launchInteropResource(
  actor: PublicUser,
  sectionId: string,
  resourceId: string,
  sessionHash: string
) {
  const { resource, access } = await getInteropResource(actor, sectionId, resourceId);
  if (access.state !== "abierto")
    fail("Los recursos externos de una sección cerrada están disponibles sólo para descarga.", 403);
  if (resource.kind === "lti") {
    privateLtiKey();
    const tool = await activeTool(resource.toolId ?? "");
    const grant = await createGrant(actor, resourceId, "lti", sessionHash);
    const url = new URL(tool.loginUrl);
    url.searchParams.set("iss", platformOrigin());
    url.searchParams.set("login_hint", grant.token);
    url.searchParams.set("target_link_uri", resource.targetUrl);
    url.searchParams.set("lti_message_hint", resource.id);
    url.searchParams.set("lti_deployment_id", tool.deploymentId);
    url.searchParams.set("client_id", tool.clientId);
    return { kind: "lti" as const, url: url.href };
  }
  const origin = contentOrigin();
  const grant = await createGrant(actor, resourceId, "content", sessionHash);
  return {
    kind: "content" as const,
    url: origin + "/api/interop/content/" + grant.token + "/player",
    title: resource.title,
    expiresAt: grant.expiresAt,
  };
}
export async function authorizeLti(actor: PublicUser, sessionHash: string, input: unknown) {
  const parsed = oidcSchema.parse(input);
  const tokenHash = await hashToken(parsed.login_hint);
  const [grant] = await getDb()
    .select()
    .from(interopGrants)
    .where(eq(interopGrants.tokenHash, tokenHash))
    .limit(1);
  if (
    !grant ||
    grant.kind !== "lti" ||
    grant.userId !== actor.id ||
    grant.sessionHash !== sessionHash ||
    grant.expiresAt <= new Date().toISOString()
  )
    fail("El lanzamiento LTI venció o no pertenece a esta sesión.", 401);
  if (grant.consumedAt) fail("Este lanzamiento LTI ya se utilizó.", 409);
  const [resource] = await getDb()
    .select()
    .from(interopResources)
    .where(eq(interopResources.id, grant.resourceId))
    .limit(1);
  if (!resource || resource.kind !== "lti") fail("El recurso LTI no existe.", 404);
  const access = await authorizeInteropSection(actor, resource.sectionId);
  if (access.state !== "abierto") fail("La sección está cerrada.", 403);
  const tool = await activeTool(resource.toolId ?? "");
  if (
    tool.clientId !== parsed.client_id ||
    !tool.redirectUris.includes(parsed.redirect_uri) ||
    (parsed.lti_message_hint && parsed.lti_message_hint !== resource.id) ||
    !tool.targetUris.includes(resource.targetUrl)
  )
    fail("Los parámetros del lanzamiento no corresponden a la herramienta.", 400);
  // Implements: REQ-QMD-06
  const token = await signLtiLaunch({
    clientId: tool.clientId,
    deploymentId: tool.deploymentId,
    userId: actor.id,
    resourceId: resource.id,
    sectionId: resource.sectionId,
    title: resource.title,
    role: access.role,
    targetUrl: resource.targetUrl,
    nonce: parsed.nonce,
  });
  const consumed = await getDb()
    .update(interopGrants)
    .set({ consumedAt: new Date().toISOString() })
    .where(
      and(
        eq(interopGrants.tokenHash, tokenHash),
        isNull(interopGrants.consumedAt),
        gt(interopGrants.expiresAt, new Date().toISOString())
      )
    )
    .returning({ id: interopGrants.tokenHash });
  if (!consumed.length) fail("Este lanzamiento LTI ya se utilizó.", 409);
  return { redirect: parsed.redirect_uri, token, state: parsed.state };
}
export async function contentGrant(token: string, requestOrigin: string) {
  if (requestOrigin !== contentOrigin())
    fail("El contenido sólo se sirve desde su origen aislado.", 403);
  if (!/^[a-f0-9]{64}$/.test(token)) fail("La sesión de aprendizaje no es válida.", 401);
  const [grant] = await getDb()
    .select()
    .from(interopGrants)
    .where(
      and(
        eq(interopGrants.tokenHash, await hashToken(token)),
        eq(interopGrants.kind, "content"),
        gt(interopGrants.expiresAt, new Date().toISOString())
      )
    )
    .limit(1);
  if (!grant) fail("La sesión de aprendizaje venció. Vuelve a abrir el recurso.", 401);
  const [session] = await getDb()
    .select({ id: sessions.tokenHash })
    .from(sessions)
    .where(
      and(
        eq(sessions.tokenHash, grant.sessionHash),
        eq(sessions.userId, grant.userId),
        gt(sessions.expiresAt, new Date().toISOString())
      )
    )
    .limit(1);
  if (!session) fail("La sesión del portal terminó. Vuelve a iniciar sesión.", 401);
  // Implements: REQ-QMD-06
  const [[actor], [resource]] = await Promise.all([
    getDb().select().from(users).where(eq(users.id, grant.userId)).limit(1),
    getDb()
      .select()
      .from(interopResources)
      .where(eq(interopResources.id, grant.resourceId))
      .limit(1),
  ]);
  if (!actor || !resource || resource.kind === "lti") fail("El recurso no está disponible.", 404);
  const access = await authorizeInteropSection(actor, resource.sectionId);
  if (access.state !== "abierto") fail("La sección está cerrada.", 403);
  return {
    grant,
    resource,
    manifest: packageManifestSchema.parse(JSON.parse(resource.manifestJson)),
    actor,
  };
}
export async function loadInteropProgress(resourceId: string, userId: string) {
  const [row] = await getDb()
    .select()
    .from(interopProgress)
    .where(and(eq(interopProgress.resourceId, resourceId), eq(interopProgress.userId, userId)))
    .limit(1);
  return {
    version: row?.version ?? 0,
    data: row ? z.record(z.string(), z.string()).parse(JSON.parse(row.dataJson)) : {},
  };
}
export async function saveInteropProgress(
  context: Awaited<ReturnType<typeof contentGrant>>,
  input: unknown
) {
  if (context.resource.kind !== "scorm12" && context.resource.kind !== "scorm2004")
    fail("El recurso no utiliza SCORM.");
  // Implements: REQ-INT-05
  const parsed = z
    .strictObject({
      version: z.number().int().min(0),
      data: z.record(z.string().max(100), z.string().max(64000)),
    })
    .parse(input);
  if (Object.keys(parsed.data).length > 50) fail("El avance contiene demasiados campos.");
  let data: Record<string, string>;
  try {
    data = validateScormData(context.resource.kind, parsed.data);
  } catch {
    return fail("El avance SCORM contiene campos o valores no compatibles.");
  }
  const { grant, resource } = context;
  return getDb().transaction(async (tx) => {
    const quota = await tx
      .update(interopGrants)
      .set({ writeCount: sql`${interopGrants.writeCount} + 1` })
      .where(
        and(
          eq(interopGrants.tokenHash, grant.tokenHash),
          lt(interopGrants.writeCount, 1000),
          gt(interopGrants.expiresAt, new Date().toISOString())
        )
      )
      .returning({ id: interopGrants.tokenHash });
    if (!quota.length) fail("La sesión alcanzó su límite de escrituras.", 429);
    const id = resource.id + ":" + grant.userId;
    const [current] = await tx
      .select()
      .from(interopProgress)
      .where(eq(interopProgress.id, id))
      .limit(1);
    if ((current?.version ?? 0) !== parsed.version)
      fail("El avance cambió en otra ventana. Vuelve a abrir el recurso.", 409);
    const row = {
      id,
      userId: grant.userId,
      resourceId: resource.id,
      version: parsed.version + 1,
      dataJson: JSON.stringify(data),
      updatedAt: new Date().toISOString(),
    };
    await tx
      .insert(interopProgress)
      .values(row)
      .onConflictDoUpdate({
        target: interopProgress.id,
        set: { version: row.version, dataJson: row.dataJson, updatedAt: row.updatedAt },
      });
    return { version: row.version };
  });
}
export async function saveXapiStatements(
  context: Awaited<ReturnType<typeof contentGrant>>,
  input: unknown,
  statementId?: string
) {
  if (context.resource.kind !== "xapi") fail("El recurso no utiliza xAPI.");
  const batch = Array.isArray(input) ? input : [input];
  if (!batch.length || batch.length > 20 || (statementId && batch.length !== 1))
    fail("Se admiten de 1 a 20 Statements por solicitud.");
  const actorId = await hashToken(context.actor.id);
  const parsed = batch.map((value) => {
    if (statementId) {
      const record = z.record(z.string(), z.unknown()).parse(value);
      if (record.id && record.id !== statementId)
        fail("El UUID de la URL y del Statement no coinciden.");
      value = { ...record, id: statementId };
    }
    return validateStatement(value, {
      actorId,
      activityId: context.manifest.activityId,
      registration: context.grant.registration,
      platformOrigin: platformOrigin(),
    });
  });
  return getDb().transaction(async (tx) => {
    // Implements: REQ-QMD-06
    const ids = parsed
      .map((s) => s.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    const existingRows = ids.length
      ? await tx.select().from(interopStatements).where(inArray(interopStatements.id, ids))
      : [];
    const existingMap = new Map(existingRows.map((r) => [r.id, r]));
    const toInsert: { statement: (typeof parsed)[number]; inputJson: string }[] = [];
    for (const statement of parsed) {
      const existing = existingMap.get(statement.id);
      const inputJson = canonicalJson(statement);
      if (existing) {
        if (
          existing.userId !== context.actor.id ||
          existing.resourceId !== context.resource.id ||
          existing.inputJson !== inputJson
        )
          fail("El UUID xAPI ya existe con otro contenido.", 409);
        continue;
      }
      toInsert.push({ statement, inputJson });
    }
    if (toInsert.length > 0) {
      const quota = await tx
        .update(interopGrants)
        .set({ writeCount: sql`${interopGrants.writeCount} + ${toInsert.length}` })
        .where(
          and(
            eq(interopGrants.tokenHash, context.grant.tokenHash),
            sql`${interopGrants.writeCount} + ${toInsert.length} <= 1000`,
            gt(interopGrants.expiresAt, new Date().toISOString())
          )
        )
        .returning({ id: interopGrants.tokenHash });
      if (!quota.length) fail("La sesión alcanzó su límite de Statements.", 429);
      const now = new Date().toISOString();
      const rows = toInsert.map(({ statement, inputJson }) => {
        const stored = {
          ...statement,
          timestamp: statement.timestamp ?? now,
          stored: now,
          version: "1.0.3",
          authority: {
            objectType: "Agent",
            account: { homePage: platformOrigin(), name: "ceoubb-platform" },
          },
        };
        return {
          id: statement.id,
          userId: context.actor.id,
          resourceId: context.resource.id,
          registration: context.grant.registration,
          inputJson,
          statementJson: JSON.stringify(stored),
          storedAt: now,
        };
      });
      await tx.insert(interopStatements).values(rows);
    }
    return parsed.map((s) => s.id);
  });
}
export async function getXapiStatement(
  context: Awaited<ReturnType<typeof contentGrant>>,
  id: string
) {
  const [row] = await getDb()
    .select({ value: interopStatements.statementJson })
    .from(interopStatements)
    .where(
      and(
        eq(interopStatements.id, id),
        eq(interopStatements.resourceId, context.resource.id),
        eq(interopStatements.userId, context.actor.id)
      )
    )
    .limit(1);
  if (!row) fail("El Statement no existe en esta sesión.", 404);
  return JSON.parse(row.value) as unknown;
}
