import assert from "node:assert/strict";
import test from "node:test";
import {
  CATEGORIAS_SOPORTE,
  CATEGORIA_ETIQUETAS,
  DURACION_MINIMA_MS,
  envioSoporteSchema,
  erroresPorCampo,
  solicitudSoporteSchema,
} from "../lib/support-request.ts";

/*
  REQ-SUP-01: la forma de una solicitud de soporte se define una sola vez y el
  servidor revalida siempre. Estas pruebas fijan los límites de cada campo, la
  normalización del correo y el comportamiento de los dos controles antiabuso,
  para que ninguna ruta pueda relajarlos por su cuenta.
*/

const VALIDA = {
  nombre: "Felipe Arce",
  email: "persona@alumnos.ubiobio.cl",
  categoria: "soporte-tecnico" as const,
  asunto: "No puedo iniciar sesión",
  mensaje: "Desde ayer mi correo institucional no me deja entrar a la plataforma.",
};

test("acepta una solicitud válida", () => {
  const resultado = solicitudSoporteSchema.safeParse(VALIDA);
  assert.equal(resultado.success, true);
});

test("recorta los espacios y normaliza el correo a minúsculas", () => {
  const resultado = solicitudSoporteSchema.safeParse({
    ...VALIDA,
    nombre: "   Felipe Arce   ",
    email: "  Persona@Alumnos.UBioBio.CL  ",
    asunto: "  No puedo iniciar sesión  ",
  });
  assert.equal(resultado.success, true);
  assert.equal(resultado.data?.nombre, "Felipe Arce");
  assert.equal(resultado.data?.email, "persona@alumnos.ubiobio.cl");
  assert.equal(resultado.data?.asunto, "No puedo iniciar sesión");
});

test("rechaza cada campo bajo su mínimo", () => {
  const casos = [
    { campo: "nombre", valor: "F" },
    { campo: "asunto", valor: "abc" },
    { campo: "mensaje", valor: "muy corto" },
  ] as const;
  for (const { campo, valor } of casos) {
    const resultado = solicitudSoporteSchema.safeParse({ ...VALIDA, [campo]: valor });
    assert.equal(resultado.success, false, `${campo} debería fallar bajo su mínimo`);
  }
});

test("rechaza cada campo sobre su máximo", () => {
  const casos = [
    { campo: "nombre", largo: 121 },
    { campo: "asunto", largo: 161 },
    { campo: "mensaje", largo: 4001 },
  ] as const;
  for (const { campo, largo } of casos) {
    const resultado = solicitudSoporteSchema.safeParse({ ...VALIDA, [campo]: "a".repeat(largo) });
    assert.equal(resultado.success, false, `${campo} debería fallar sobre su máximo`);
  }
});

test("acepta cada campo justo en su máximo", () => {
  const casos = [
    { campo: "nombre", largo: 120 },
    { campo: "asunto", largo: 160 },
    { campo: "mensaje", largo: 4000 },
  ] as const;
  for (const { campo, largo } of casos) {
    const resultado = solicitudSoporteSchema.safeParse({ ...VALIDA, [campo]: "a".repeat(largo) });
    assert.equal(resultado.success, true, `${campo} debería aceptarse en su máximo`);
  }
});

test("rechaza un correo con formato inválido", () => {
  for (const email of ["sin-arroba", "sin@dominio", "@sin-local.cl", ""]) {
    const resultado = solicitudSoporteSchema.safeParse({ ...VALIDA, email });
    assert.equal(resultado.success, false, `"${email}" no debería aceptarse`);
  }
});

test("acepta un correo no institucional", () => {
  // REQ-SUP-06: el dominio se anota, nunca se rechaza. Quien más probablemente
  // escribe es alguien cuyo correo institucional dejó de funcionar.
  const resultado = solicitudSoporteSchema.safeParse({ ...VALIDA, email: "persona@gmail.com" });
  assert.equal(resultado.success, true);
});

test("rechaza una categoría desconocida", () => {
  const resultado = solicitudSoporteSchema.safeParse({ ...VALIDA, categoria: "otra-cosa" });
  assert.equal(resultado.success, false);
});

test("cada categoría declarada es aceptada y tiene etiqueta visible", () => {
  for (const categoria of CATEGORIAS_SOPORTE) {
    const resultado = solicitudSoporteSchema.safeParse({ ...VALIDA, categoria });
    assert.equal(resultado.success, true, `${categoria} debería aceptarse`);
    assert.ok(CATEGORIA_ETIQUETAS[categoria]?.length > 0, `${categoria} necesita etiqueta`);
  }
});

test("erroresPorCampo devuelve un mensaje por campo inválido", () => {
  const resultado = solicitudSoporteSchema.safeParse({
    nombre: "F",
    email: "no",
    categoria: "otra",
    asunto: "a",
    mensaje: "corto",
  });
  assert.equal(resultado.success, false);
  const errores = erroresPorCampo(resultado.error!);
  for (const campo of ["nombre", "email", "categoria", "asunto", "mensaje"] as const) {
    assert.equal(typeof errores[campo], "string", `falta el mensaje de ${campo}`);
  }
});

test("el esquema acepta el señuelo con cualquier contenido", () => {
  /*
    REQ-SUP-03: el señuelo no se valida aquí a propósito. Rechazarlo en el
    esquema devolvería un 400 con errores de campo, y eso le diría al cliente
    automatizado exactamente qué lo delató. La ruta lo evalúa después y
    responde igual que ante una aceptación.
  */
  assert.equal(envioSoporteSchema.safeParse(VALIDA).success, true);
  assert.equal(envioSoporteSchema.safeParse({ ...VALIDA, sitioWeb: "" }).success, true);
  assert.equal(envioSoporteSchema.safeParse({ ...VALIDA, sitioWeb: "http://x" }).success, true);
});

test("el señuelo y la duración viven fuera del esquema del formulario", () => {
  // Un fallo antiabuso nunca debe mostrarse como error de un campo visible.
  const forma = Object.keys(solicitudSoporteSchema.shape);
  assert.equal(forma.includes("sitioWeb"), false);
  assert.equal(forma.includes("duracionMs"), false);
});

test("la duración se mide como tiempo transcurrido no negativo", () => {
  assert.equal(envioSoporteSchema.safeParse({ ...VALIDA, duracionMs: 0 }).success, true);
  assert.equal(envioSoporteSchema.safeParse({ ...VALIDA, duracionMs: 5000 }).success, true);
  assert.equal(envioSoporteSchema.safeParse({ ...VALIDA, duracionMs: -1 }).success, false);
  assert.equal(envioSoporteSchema.safeParse({ ...VALIDA, duracionMs: 1.5 }).success, false);
});

test("el umbral mínimo de permanencia es de tres segundos", () => {
  assert.equal(DURACION_MINIMA_MS, 3000);
});
