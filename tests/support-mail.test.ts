import assert from "node:assert/strict";
import test from "node:test";
import {
  componerAsunto,
  componerCuerpo,
  enviarCorreoSoporte,
  type SolicitudParaCorreo,
} from "../lib/services/support-mail.ts";

/*
  REQ-SUP-08, REQ-SUP-09: la entrega pasa por un puerto único, sin SDK de
  proveedor, en texto plano y con `replyTo` apuntando a quien escribió. Sin
  proveedor configurado responde honestamente en vez de fallar.
*/

const SOLICITUD: SolicitudParaCorreo = {
  nombre: "Felipe Arce",
  email: "persona@alumnos.ubiobio.cl",
  categoria: "reporte-error",
  asunto: "El libro de notas no carga",
  mensaje: "Al abrir la sección de calificaciones la página queda en blanco.",
  rolDeclarado: "student",
};

const ENTORNO = [
  "SOPORTE_MAIL_DRIVER",
  "SOPORTE_MAIL_API_KEY",
  "SOPORTE_MAIL_FROM",
  "SOPORTE_MAIL_TO",
] as const;

function conEntorno(valores: Partial<Record<(typeof ENTORNO)[number], string>>) {
  const previo: Record<string, string | undefined> = {};
  for (const clave of ENTORNO) {
    previo[clave] = process.env[clave];
    if (valores[clave] === undefined) delete process.env[clave];
    else process.env[clave] = valores[clave];
  }
  return () => {
    for (const clave of ENTORNO) {
      if (previo[clave] === undefined) delete process.env[clave];
      else process.env[clave] = previo[clave];
    }
  };
}

test("sin proveedor configurado no entrega y lo dice", async () => {
  const restaurar = conEntorno({});
  try {
    const resultado = await enviarCorreoSoporte(SOLICITUD);
    assert.equal(resultado.entregado, false);
    // Nunca se intentó: la solicitud queda pendiente, no fallida.
    assert.equal(resultado.intentado, false);
    assert.equal(resultado.error, "sin proveedor configurado");
  } finally {
    restaurar();
  }
});

test("con driver brevo pero configuración incompleta no entrega", async () => {
  const restaurar = conEntorno({ SOPORTE_MAIL_DRIVER: "brevo" });
  try {
    const resultado = await enviarCorreoSoporte(SOLICITUD);
    assert.equal(resultado.entregado, false);
    assert.equal(resultado.intentado, false);
    assert.equal(resultado.error, "configuración de correo incompleta");
  } finally {
    restaurar();
  }
});

test("una entrega correcta llama al punto de Brevo con la carga esperada", async () => {
  const restaurar = conEntorno({
    SOPORTE_MAIL_DRIVER: "brevo",
    SOPORTE_MAIL_API_KEY: "clave-secreta-de-prueba",
    SOPORTE_MAIL_FROM: "soporte@notificaciones.ceoubb.com",
    SOPORTE_MAIL_TO: "contacto@ceoubb.com",
  });
  const fetchOriginal = globalThis.fetch;
  let urlLlamada = "";
  let cabeceras: Record<string, string> = {};
  let carga: Record<string, unknown> = {};

  globalThis.fetch = (async (url: string, init: RequestInit) => {
    urlLlamada = String(url);
    cabeceras = init.headers as Record<string, string>;
    carga = JSON.parse(String(init.body));
    return new Response("{}", { status: 201 });
  }) as unknown as typeof fetch;

  try {
    const resultado = await enviarCorreoSoporte(SOLICITUD);
    assert.equal(resultado.entregado, true);
    assert.equal(resultado.intentado, true);
    assert.equal(urlLlamada, "https://api.brevo.com/v3/smtp/email");
    assert.equal(cabeceras["api-key"], "clave-secreta-de-prueba");

    // El remitente es la plataforma; quien escribió viaja solo en replyTo, para
    // no romper la autenticación de dominio del remitente.
    assert.equal(
      (carga.sender as { email: string }).email,
      "soporte@notificaciones.ceoubb.com"
    );
    assert.equal((carga.to as { email: string }[])[0]?.email, "contacto@ceoubb.com");
    assert.equal(
      (carga.replyTo as { email: string }).email,
      "persona@alumnos.ubiobio.cl"
    );

    // Sin parte HTML, nunca.
    assert.equal("htmlContent" in carga, false);
    assert.equal(typeof carga.textContent, "string");
  } finally {
    globalThis.fetch = fetchOriginal;
    restaurar();
  }
});

test("un error del proveedor no entrega y no filtra la clave", async () => {
  const restaurar = conEntorno({
    SOPORTE_MAIL_DRIVER: "brevo",
    SOPORTE_MAIL_API_KEY: "clave-secreta-de-prueba",
    SOPORTE_MAIL_FROM: "soporte@notificaciones.ceoubb.com",
    SOPORTE_MAIL_TO: "contacto@ceoubb.com",
  });
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response('{"message":"clave-secreta-de-prueba rechazada"}', {
      status: 401,
    })) as unknown as typeof fetch;

  try {
    const resultado = await enviarCorreoSoporte(SOLICITUD);
    assert.equal(resultado.entregado, false);
    // Sí hubo intento: el proveedor rechazó, la solicitud queda fallida.
    assert.equal(resultado.intentado, true);
    assert.match(resultado.error ?? "", /401/);
    assert.doesNotMatch(resultado.error ?? "", /clave-secreta-de-prueba/);
  } finally {
    globalThis.fetch = fetchOriginal;
    restaurar();
  }
});

test("un fallo de red no entrega y no lanza", async () => {
  const restaurar = conEntorno({
    SOPORTE_MAIL_DRIVER: "brevo",
    SOPORTE_MAIL_API_KEY: "clave",
    SOPORTE_MAIL_FROM: "soporte@notificaciones.ceoubb.com",
    SOPORTE_MAIL_TO: "contacto@ceoubb.com",
  });
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed");
  }) as unknown as typeof fetch;

  try {
    const resultado = await enviarCorreoSoporte(SOLICITUD);
    assert.equal(resultado.entregado, false);
    assert.equal(resultado.intentado, true);
    assert.match(resultado.error ?? "", /fallo de red/);
  } finally {
    globalThis.fetch = fetchOriginal;
    restaurar();
  }
});

test("el asunto lleva la categoría, va en una línea y está acotado", () => {
  assert.equal(componerAsunto(SOLICITUD), "[Reporte de error] El libro de notas no carga");

  // Inyección de cabeceras: un salto de línea en el asunto no puede sobrevivir.
  const inyectado = componerAsunto({
    ...SOLICITUD,
    asunto: "Hola\nBcc: tercero@ejemplo.cl",
  });
  assert.doesNotMatch(inyectado, /\n/);
  assert.ok(componerAsunto({ ...SOLICITUD, asunto: "a".repeat(300) }).length <= 200);
});

test("el cuerpo declara la procedencia del correo y conserva el mensaje literal", () => {
  const institucional = componerCuerpo(SOLICITUD);
  assert.match(institucional, /Rol derivado del dominio institucional: student/);
  assert.match(institucional, /Al abrir la sección de calificaciones/);

  const externo = componerCuerpo({ ...SOLICITUD, rolDeclarado: null });
  assert.match(externo, /no se puede verificar matrícula/);
});

test("el marcado escrito por la persona llega literal, no como HTML", () => {
  const cuerpo = componerCuerpo({
    ...SOLICITUD,
    mensaje: "Probando <script>alert(1)</script> y <b>negrita</b> en el reporte.",
  });
  assert.match(cuerpo, /<script>alert\(1\)<\/script>/);
});
