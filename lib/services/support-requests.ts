import { createHash, randomUUID } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { solicitudesSoporte } from "../../db/schema.ts";
import type { AccountRole } from "../access-policy.ts";
import type { CategoriaSoporte } from "../support-request.ts";

/*
  Implements: REQ-SUP-04, REQ-SUP-05, REQ-SUP-07, REQ-SUP-10
  Persistencia de las solicitudes recibidas por /contacto. Toda lectura lleva
  `.limit()` explícito y se apoya en uno de los dos índices de la tabla.
*/

/** Máximo de envíos por hora desde una misma dirección. */
export const LIMITE_POR_ORIGEN = 3;

/** Máximo de envíos por hora en total, para toda la plataforma. */
export const LIMITE_GLOBAL = 20;

/** Ventana del límite, en milisegundos. */
export const VENTANA_LIMITE_MS = 60 * 60 * 1000;

export type SolicitudPersistida = {
  id: string;
  nombre: string;
  email: string;
  rolDeclarado: AccountRole | null;
  categoria: CategoriaSoporte;
  asunto: string;
  mensaje: string;
};

/**
 * Implements: REQ-SUP-05
 * La dirección se guarda solo como hash con pepper del servidor. Sirve para
 * contar envíos por origen, nunca para reconstruir desde dónde escribió
 * alguien. Sin pepper configurado el hash se calcula igual: pierde resistencia
 * a un ataque de diccionario, pero el límite de envíos sigue funcionando y el
 * formulario no se cae por una variable ausente.
 */
export function hashDireccion(direccion: string): string {
  const pepper = process.env.SOPORTE_IP_PEPPER ?? "";
  return createHash("sha256").update(`${direccion}${pepper}`).digest("hex");
}

/**
 * Dirección del cliente según las cabeceras del proxy. Se toma el primer salto
 * de `cf-connecting-ip` o `x-forwarded-for`, que garantiza el cliente real;
 * los siguientes los puede escribir cualquiera.
 */
export function direccionDeSolicitud(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  const reenviada = request.headers.get("x-forwarded-for");
  if (reenviada) {
    const primera = reenviada.split(",")[0]?.trim();
    if (primera) return primera;
  }
  return request.headers.get("x-real-ip")?.trim() || "desconocida";
}

type ConteoReciente = { porOrigen: number; global: number };

/**
 * Implements: REQ-SUP-04, REQ-SUP-10
 * Cuenta los envíos de la última hora. Se resuelve contra la base de datos y no
 * contra memoria del proceso porque Cloudflare Workers levanta instancias aisladas en el Edge,
 * y un contador por instancia sería un límite solo de nombre.
 */
export async function contarSolicitudesRecientes(ipHash: string): Promise<ConteoReciente> {
  const desde = new Date(Date.now() - VENTANA_LIMITE_MS).toISOString();
  const db = getDb();

  const [porOrigen, global] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)` })
      .from(solicitudesSoporte)
      .where(and(eq(solicitudesSoporte.ipHash, ipHash), gte(solicitudesSoporte.createdAt, desde)))
      .limit(1),
    db
      .select({ total: sql<number>`count(*)` })
      .from(solicitudesSoporte)
      .where(gte(solicitudesSoporte.createdAt, desde))
      .limit(1),
  ]);

  return {
    porOrigen: Number(porOrigen[0]?.total ?? 0),
    global: Number(global[0]?.total ?? 0),
  };
}

export function superaLimite(conteo: ConteoReciente): boolean {
  return conteo.porOrigen >= LIMITE_POR_ORIGEN || conteo.global >= LIMITE_GLOBAL;
}

/**
 * Implements: REQ-SUP-07
 * Escribe la solicitud antes de que se intente la entrega. Si el proveedor de
 * correo falla, la fila ya existe y el mensaje no se pierde.
 */
export async function registrarSolicitud(entrada: {
  nombre: string;
  email: string;
  rolDeclarado: AccountRole | null;
  categoria: CategoriaSoporte;
  asunto: string;
  mensaje: string;
  ipHash: string;
  userId: string | null;
}): Promise<SolicitudPersistida> {
  const id = randomUUID();
  await getDb().insert(solicitudesSoporte).values({
    id,
    nombre: entrada.nombre,
    email: entrada.email,
    rolDeclarado: entrada.rolDeclarado,
    categoria: entrada.categoria,
    asunto: entrada.asunto,
    mensaje: entrada.mensaje,
    estado: "pendiente",
    ipHash: entrada.ipHash,
    userId: entrada.userId,
    createdAt: new Date().toISOString(),
  });

  return {
    id,
    nombre: entrada.nombre,
    email: entrada.email,
    rolDeclarado: entrada.rolDeclarado,
    categoria: entrada.categoria,
    asunto: entrada.asunto,
    mensaje: entrada.mensaje,
  };
}

export async function marcarEntregada(id: string): Promise<void> {
  await getDb()
    .update(solicitudesSoporte)
    .set({ estado: "enviado", enviadoEn: new Date().toISOString(), errorEntrega: null })
    .where(eq(solicitudesSoporte.id, id));
}

export async function marcarFallida(id: string, motivo: string): Promise<void> {
  await getDb()
    .update(solicitudesSoporte)
    .set({ estado: "fallido", errorEntrega: motivo.slice(0, 500) })
    .where(eq(solicitudesSoporte.id, id));
}
