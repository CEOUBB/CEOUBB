import assert from "node:assert/strict";
import test, { before, beforeEach } from "node:test";
import { sql } from "drizzle-orm";

// El endpoint resuelve la base de datos de forma diferida, pero la URL debe
// existir antes de la primera llamada real. Se fija aquí, antes de cualquier
// prueba, para no depender del orden de importación.
process.env.TURSO_DATABASE_URL = "file::memory:";
process.env.SOPORTE_IP_PEPPER = "pimienta-de-prueba";
delete process.env.SOPORTE_MAIL_DRIVER;

const { getDb } = await import("../db/index.ts");
const { solicitudesSoporte } = await import("../db/schema.ts");
const { POST } = await import("../app/api/soporte/route.ts");

/*
  REQ-SUP-02, REQ-SUP-03, REQ-SUP-04, REQ-SUP-05, REQ-SUP-06, REQ-SUP-07,
  REQ-SUP-09: el endpoint de soporte es público, así que cada control antiabuso
  se verifica aquí, junto con la regla de que la fila se escribe antes de
  intentar la entrega.
*/

const CUERPO_VALIDO = {
  nombre: "Felipe Arce",
  email: "persona@alumnos.ubiobio.cl",
  categoria: "soporte-tecnico",
  asunto: "No puedo iniciar sesión",
  mensaje: "Desde ayer mi correo institucional no me deja entrar a la plataforma.",
  duracionMs: 9000,
};

const IP = "203.0.113.10";

function peticion(cuerpo: unknown, opciones: { tipo?: string; ip?: string } = {}) {
  return new Request("https://ceoubb.com/api/soporte", {
    method: "POST",
    headers: {
      "content-type": opciones.tipo ?? "application/json",
      "x-forwarded-for": opciones.ip ?? IP,
    },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });
}

async function filas() {
  return getDb().select().from(solicitudesSoporte).limit(50);
}

before(async () => {
  await getDb().run(
    sql`CREATE TABLE IF NOT EXISTS solicitudes_soporte (
      id text PRIMARY KEY NOT NULL, nombre text NOT NULL, email text NOT NULL,
      rol_declarado text, categoria text NOT NULL, asunto text NOT NULL,
      mensaje text NOT NULL, estado text NOT NULL, error_entrega text,
      ip_hash text NOT NULL, user_id text, created_at text NOT NULL, enviado_en text);`
  );
});

beforeEach(async () => {
  await getDb().delete(solicitudesSoporte);
  delete process.env.SOPORTE_MAIL_DRIVER;
  delete process.env.TURNSTILE_SECRET_KEY;
});

test("REQ-SUP-02: rechaza un tipo de contenido que no es JSON", async () => {
  const respuesta = await POST(peticion(CUERPO_VALIDO, { tipo: "text/plain" }));
  assert.equal(respuesta.status, 415);
  assert.equal((await filas()).length, 0);
});

test("REQ-SUP-02: rechaza un cuerpo sobre el máximo declarado en la cabecera", async () => {
  const peticionGrande = new Request("https://ceoubb.com/api/soporte", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(9 * 1024),
      "x-forwarded-for": IP,
    },
    body: JSON.stringify(CUERPO_VALIDO),
  });
  const respuesta = await POST(peticionGrande);
  assert.equal(respuesta.status, 413);
  assert.equal((await filas()).length, 0);
});

test("REQ-SUP-02: rechaza un cuerpo real sobre el máximo aunque la cabecera mienta", async () => {
  const respuesta = await POST(peticion({ ...CUERPO_VALIDO, mensaje: "a".repeat(9 * 1024) }));
  assert.equal(respuesta.status, 413);
  assert.equal((await filas()).length, 0);
});

test("REQ-SUP-01: un cuerpo inválido responde 400 y nombra los campos", async () => {
  const respuesta = await POST(peticion({ ...CUERPO_VALIDO, email: "no-es-correo" }));
  assert.equal(respuesta.status, 400);
  const datos = (await respuesta.json()) as { campos?: Record<string, string> };
  assert.equal(typeof datos.campos?.email, "string");
  assert.equal((await filas()).length, 0);
});

test("REQ-SUP-01: un JSON malformado responde 400", async () => {
  const respuesta = await POST(peticion("{no es json"));
  assert.equal(respuesta.status, 400);
  assert.equal((await filas()).length, 0);
});

test("REQ-SUP-03: el señuelo relleno no guarda nada y responde como una aceptación", async () => {
  const aceptada = await POST(peticion(CUERPO_VALIDO));
  await getDb().delete(solicitudesSoporte);

  const senuelo = await POST(peticion({ ...CUERPO_VALIDO, sitioWeb: "http://spam" }));
  assert.equal(senuelo.status, aceptada.status);
  assert.deepEqual(await senuelo.json(), await aceptada.json());
  assert.equal((await filas()).length, 0);
});

test("REQ-SUP-03: un envío más rápido que la permanencia mínima no guarda nada", async () => {
  const respuesta = await POST(peticion({ ...CUERPO_VALIDO, duracionMs: 900 }));
  assert.equal(respuesta.status, 202);
  assert.equal((await filas()).length, 0);
});

test("REQ-SUP-03: justo en el umbral de tres segundos sí se acepta", async () => {
  const respuesta = await POST(peticion({ ...CUERPO_VALIDO, duracionMs: 3000 }));
  assert.equal(respuesta.status, 202);
  assert.equal((await filas()).length, 1);
});

test("REQ-SUP-09: sin proveedor la solicitud se guarda como pendiente y responde 202", async () => {
  const respuesta = await POST(peticion(CUERPO_VALIDO));
  assert.equal(respuesta.status, 202);
  assert.deepEqual(await respuesta.json(), { estado: "recibido", entregado: false });

  const guardadas = await filas();
  assert.equal(guardadas.length, 1);
  // Pendiente, no fallido: nunca hubo intento de entrega que pudiera fallar.
  assert.equal(guardadas[0]?.estado, "pendiente");
  assert.equal(guardadas[0]?.enviadoEn, null);
});

test("REQ-SUP-05: la dirección se guarda como hash y nunca en claro", async () => {
  await POST(peticion(CUERPO_VALIDO));
  const guardada = (await filas())[0];
  assert.ok(guardada);
  assert.notEqual(guardada.ipHash, IP);
  assert.doesNotMatch(guardada.ipHash, /203\.0\.113\.10/);
  assert.match(guardada.ipHash, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(guardada).includes(IP), false);
});

test("REQ-SUP-06: un correo institucional guarda el rol derivado por la política única", async () => {
  await POST(peticion({ ...CUERPO_VALIDO, email: "docente@ubiobio.cl" }));
  assert.equal((await filas())[0]?.rolDeclarado, "teacher");

  await getDb().delete(solicitudesSoporte);
  await POST(peticion({ ...CUERPO_VALIDO, email: "alumno@alumnos.ubiobio.cl" }));
  assert.equal((await filas())[0]?.rolDeclarado, "student");
});

test("REQ-SUP-06: un correo externo se acepta con rol nulo y nunca con 403", async () => {
  // Quien escribe desde un correo personal suele ser quien no puede usar el suyo.
  const respuesta = await POST(peticion({ ...CUERPO_VALIDO, email: "persona@gmail.com" }));
  assert.notEqual(respuesta.status, 403);
  assert.equal(respuesta.status, 202);
  assert.equal((await filas())[0]?.rolDeclarado, null);
});

test("REQ-SUP-07: una entrega correcta marca enviado con marca de tiempo", async () => {
  process.env.SOPORTE_MAIL_DRIVER = "brevo";
  process.env.SOPORTE_MAIL_API_KEY = "clave";
  process.env.SOPORTE_MAIL_FROM = "soporte@notificaciones.ceoubb.com";
  process.env.SOPORTE_MAIL_TO = "contacto@ceoubb.com";
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async () => new Response("{}", { status: 201 })) as unknown as typeof fetch;

  try {
    const respuesta = await POST(peticion(CUERPO_VALIDO));
    assert.equal(respuesta.status, 201);
    const guardada = (await filas())[0];
    assert.equal(guardada?.estado, "enviado");
    assert.equal(typeof guardada?.enviadoEn, "string");
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("REQ-SUP-07: un fallo del proveedor conserva la fila como fallida", async () => {
  process.env.SOPORTE_MAIL_DRIVER = "brevo";
  process.env.SOPORTE_MAIL_API_KEY = "clave";
  process.env.SOPORTE_MAIL_FROM = "soporte@notificaciones.ceoubb.com";
  process.env.SOPORTE_MAIL_TO = "contacto@ceoubb.com";
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async () => new Response("{}", { status: 500 })) as unknown as typeof fetch;

  try {
    const respuesta = await POST(peticion(CUERPO_VALIDO));
    assert.equal(respuesta.status, 202);
    const guardada = (await filas())[0];
    // El mensaje no se pierde: la fila sobrevive al fallo del proveedor.
    assert.equal(guardada?.estado, "fallido");
    assert.match(guardada?.errorEntrega ?? "", /500/);
    assert.equal(guardada?.mensaje, CUERPO_VALIDO.mensaje);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("REQ-SUP-04: el cuarto envío por hora desde un mismo origen responde 429", async () => {
  for (let i = 0; i < 3; i += 1) {
    const respuesta = await POST(peticion(CUERPO_VALIDO));
    assert.equal(respuesta.status, 202, `el envío ${i + 1} debería aceptarse`);
  }
  const cuarta = await POST(peticion(CUERPO_VALIDO));
  assert.equal(cuarta.status, 429);
  assert.equal((await filas()).length, 3);
});

test("REQ-SUP-04: el límite cuenta por origen y no bloquea a otra dirección", async () => {
  for (let i = 0; i < 3; i += 1) await POST(peticion(CUERPO_VALIDO));
  const otra = await POST(peticion(CUERPO_VALIDO, { ip: "198.51.100.7" }));
  assert.equal(otra.status, 202);
  assert.equal((await filas()).length, 4);
});

test("REQ-SUP-04: el conteo vive en la base y no en memoria del proceso", async () => {
  // Vercel levanta muchas instancias aisladas: un contador por proceso sería un
  // límite solo de nombre. Insertar filas directamente debe bastar para limitar.
  const ahora = new Date().toISOString();
  const { hashDireccion } = await import("../lib/services/support-requests.ts");
  for (let i = 0; i < 3; i += 1) {
    await getDb()
      .insert(solicitudesSoporte)
      .values({
        id: `previa-${i}`,
        nombre: "Otra persona",
        email: "otra@alumnos.ubiobio.cl",
        rolDeclarado: "student",
        categoria: "sugerencia",
        asunto: "Enviada por otra instancia",
        mensaje: "Registrada sin pasar por este proceso.",
        estado: "pendiente",
        ipHash: hashDireccion(IP),
        userId: null,
        createdAt: ahora,
      });
  }
  const respuesta = await POST(peticion(CUERPO_VALIDO));
  assert.equal(respuesta.status, 429);
});

test("REQ-SUP-10: la tabla declara los dos índices que sostienen las consultas", async () => {
  const { getTableConfig } = await import("drizzle-orm/sqlite-core");
  const nombres = getTableConfig(solicitudesSoporte).indexes.map((i) => i.config.name);
  assert.ok(nombres.includes("idx_soporte_ip_created"));
  assert.ok(nombres.includes("idx_soporte_estado_created"));
});

test("SEC-04, SEC-07: con TURNSTILE_SECRET_KEY configurada, rechaza petición sin token con 400 y no escribe en BD", async () => {
  process.env.TURNSTILE_SECRET_KEY = "dummy-turnstile-secret";
  const respuesta = await POST(peticion(CUERPO_VALIDO));
  assert.equal(respuesta.status, 400);
  const datos = (await respuesta.json()) as { error?: string };
  assert.match(datos.error ?? "", /seguridad/i);
  assert.equal((await filas()).length, 0);
});

test("SEC-04, SEC-07: con TURNSTILE_SECRET_KEY configurada y token inválido rechaza con 400 y no escribe en BD", async () => {
  process.env.TURNSTILE_SECRET_KEY = "dummy-turnstile-secret";
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: false }), { status: 200 })) as unknown as typeof fetch;

  try {
    const respuesta = await POST(peticion({ ...CUERPO_VALIDO, turnstileToken: "token-invalido" }));
    assert.equal(respuesta.status, 400);
    const datos = (await respuesta.json()) as { error?: string };
    assert.match(datos.error ?? "", /seguridad/i);
    assert.equal((await filas()).length, 0);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("SEC-04, SEC-07: con TURNSTILE_SECRET_KEY configurada y token válido se acepta y guarda en BD", async () => {
  process.env.TURNSTILE_SECRET_KEY = "dummy-turnstile-secret";
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ success: true }), { status: 200 })) as unknown as typeof fetch;

  try {
    const respuesta = await POST(peticion({ ...CUERPO_VALIDO, turnstileToken: "token-valido" }));
    assert.equal(respuesta.status, 202);
    assert.equal((await filas()).length, 1);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});
