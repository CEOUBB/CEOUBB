import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { MAX_GRADE, MIN_GRADE, PASSING_GRADE } from "../lib/grades.ts";
import { CATEGORIAS_SOPORTE } from "../lib/support-request.ts";
import { CATEGORIAS_FAQ, TOTAL_PREGUNTAS } from "../app/faq/faq-content.ts";

/*
  REQ-HELP-01 a REQ-HELP-10: contratos del contenido publicado en /contacto y
  /faq. Estas comprobaciones existen porque las dos páginas hacen afirmaciones
  que otros documentos ya publicados tienen que respaldar, y porque el contenido
  del FAQ describe aritmética que vive en el código.
*/

const RAYA_LARGA = "—";

async function leer(ruta: string) {
  return readFile(new URL(ruta, import.meta.url), "utf8");
}

test("REQ-HELP-01: ambas páginas usan el armazón de documento público", async () => {
  for (const ruta of ["../app/contacto/page.tsx", "../app/faq/page.tsx"]) {
    const fuente = await leer(ruta);
    assert.match(fuente, /className="policy-page"/, `${ruta} debe usar .policy-page`);
    assert.match(fuente, /className="skip-link"/, `${ruta} necesita enlace de salto`);
    assert.match(fuente, /id="contenido-principal"/, `${ruta} necesita destino de salto`);
    assert.match(fuente, /tabIndex=\{-1\}/, `${ruta} debe poder recibir foco programático`);
    assert.match(fuente, /className="policy-back"/, `${ruta} necesita salida al portal`);
  }
});

test("REQ-HELP-01: ninguna de las dos páginas exige sesión", async () => {
  for (const ruta of ["../app/contacto/page.tsx", "../app/faq/page.tsx"]) {
    const fuente = await leer(ruta);
    assert.doesNotMatch(fuente, /getSessionUser|redirect\(/, `${ruta} no debe exigir sesión`);
  }
});

test("REQ-HELP-02: /contacto publica el buzón institucional y los plazos", async () => {
  const fuente = await leer("../app/contacto/page.tsx");
  assert.match(fuente, /mailto:contacto@ceoubb\.com/);
  assert.match(fuente, /cinco<\/span> días hábiles/);
  assert.match(fuente, /treinta<\/span> días corridos/);
  // El descargo de independencia sobrevive en toda superficie pública.
  assert.match(fuente, /plataforma estudiantil independiente/);
});

test("REQ-HELP-02: los plazos coinciden con los de la declaración de accesibilidad", async () => {
  const accesibilidad = await leer("../app/accesibilidad/page.tsx");
  assert.match(accesibilidad, /cinco días hábiles/);
  assert.match(accesibilidad, /treinta días corridos/);
});

test("REQ-HELP-09: /faq y /contacto se enlazan mutuamente", async () => {
  assert.match(await leer("../app/faq/page.tsx"), /href="\/contacto"/);
  assert.match(await leer("../app/contacto/page.tsx"), /href="\/faq"/);
});

test("REQ-HELP-09: ambas rutas están en el mapa del sitio y en los pies de página", async () => {
  const sitemap = await leer("../app/sitemap.xml/route.ts");
  assert.match(sitemap, /\/faq<\/loc>/);
  assert.match(sitemap, /\/contacto<\/loc>/);

  const portal = await leer("../app/Portal.tsx");
  assert.match(portal, /href="\/faq"/);
  assert.match(portal, /href="\/contacto"/);

  const shell = await leer("../app/portal-shell.tsx");
  assert.match(shell, /href="\/contacto"/);
});

test("REQ-HELP-10: la declaración de accesibilidad incluye las dos páginas nuevas", async () => {
  const fuente = await leer("../app/accesibilidad/page.tsx");
  // Publicar páginas sin sumarlas al listado estrecharía en silencio una
  // afirmación de conformidad ya publicada.
  assert.match(fuente, /<code>\/faq<\/code>/);
  assert.match(fuente, /<code>\/contacto<\/code>/);
});

test("REQ-SUP-05: la política de privacidad declara la nueva categoría y su plazo", async () => {
  const fuente = await leer("../app/privacidad/page.tsx");
  assert.match(fuente, /Solicitudes de soporte/);
  assert.match(fuente, /12<\/span> meses/);
  assert.match(fuente, /nunca se guarda en claro/);
  // Un tercero recibe el mensaje: la sección de proveedores tiene que nombrarlo.
  assert.match(fuente, /Brevo/);
});

test("REQ-HELP-06: el FAQ cubre las cinco categorías comprometidas", () => {
  const esperadas = ["acceso", "cursos", "notas", "biblioteca", "movil"];
  assert.deepEqual(
    CATEGORIAS_FAQ.map((c) => c.slug),
    esperadas
  );
  for (const categoria of CATEGORIAS_FAQ) {
    assert.ok(categoria.preguntas.length > 0, `${categoria.slug} no tiene preguntas`);
    assert.ok(categoria.titulo.length > 0, `${categoria.slug} no tiene título`);
  }
});

test("REQ-HELP-08: cada pregunta tiene un identificador único y estable", () => {
  const slugs = CATEGORIAS_FAQ.flatMap((c) => c.preguntas.map((p) => p.slug));
  assert.equal(new Set(slugs).size, slugs.length, "hay identificadores repetidos");
  assert.equal(slugs.length, TOTAL_PREGUNTAS);
  for (const slug of slugs) {
    // Sirven como fragmento de URL: sin mayúsculas, espacios ni acentos.
    assert.match(slug, /^[a-z0-9-]+$/, `${slug} no sirve como fragmento de URL`);
  }
});

test("cada pregunta tiene enunciado y al menos un párrafo de respuesta", () => {
  for (const categoria of CATEGORIAS_FAQ) {
    for (const pregunta of categoria.preguntas) {
      assert.ok(pregunta.pregunta.length > 10, `${pregunta.slug} sin enunciado`);
      assert.ok(pregunta.respuesta.length > 0, `${pregunta.slug} sin respuesta`);
      for (const parrafo of pregunta.respuesta) {
        assert.ok(parrafo.trim().length > 20, `${pregunta.slug} tiene un párrafo vacío`);
      }
    }
  }
});

test("ninguna pregunta ni respuesta del FAQ lleva raya larga", () => {
  /*
    Regla de redacción del proyecto. La raya larga entre cláusulas es uno de los
    rasgos más reconocibles de la prosa generada, y este es un documento que
    tiene que leerse como institucional.
  */
  for (const categoria of CATEGORIAS_FAQ) {
    assert.ok(!categoria.titulo.includes(RAYA_LARGA), `${categoria.slug} lleva raya larga`);
    for (const pregunta of categoria.preguntas) {
      assert.ok(
        !pregunta.pregunta.includes(RAYA_LARGA),
        `${pregunta.slug} lleva raya larga en el enunciado`
      );
      for (const parrafo of pregunta.respuesta) {
        assert.ok(
          !parrafo.includes(RAYA_LARGA),
          `${pregunta.slug} lleva raya larga en la respuesta`
        );
      }
    }
  }
});

test("las páginas publicadas tampoco llevan raya larga en su texto", async () => {
  for (const ruta of ["../app/contacto/page.tsx", "../app/faq/page.tsx"]) {
    const fuente = await leer(ruta);
    assert.ok(!fuente.includes(RAYA_LARGA), `${ruta} lleva raya larga`);
  }
});

test("REQ-HELP-06: la respuesta sobre notas coincide con lib/grades.ts", () => {
  const notas = CATEGORIAS_FAQ.find((c) => c.slug === "notas");
  const texto = notas!.preguntas.flatMap((p) => p.respuesta).join(" ");
  // La escala publicada no puede divergir de la que implementa el código.
  assert.match(texto, new RegExp(`${MIN_GRADE},0`));
  assert.match(texto, new RegExp(`${MAX_GRADE},0`));
  assert.match(texto, new RegExp(`${PASSING_GRADE},0`));
  // El divisor del promedio es la parte que más se malinterpreta.
  assert.match(texto, /evaluaciones calificadas/);
});

test("REQ-HELP-06: la respuesta sobre acceso coincide con la política de dominios", async () => {
  const acceso = CATEGORIAS_FAQ.find((c) => c.slug === "acceso");
  const texto = acceso!.preguntas.flatMap((p) => p.respuesta).join(" ");
  const politica = await leer("../lib/access-policy.ts");
  assert.match(politica, /@alumnos\.ubiobio\.cl/);
  assert.match(politica, /@ubiobio\.cl/);
  assert.match(texto, /@alumnos\.ubiobio\.cl/);
  assert.match(texto, /@ubiobio\.cl/);
});

test("el FAQ no promete una aplicación publicada que no existe", () => {
  const movil = CATEGORIAS_FAQ.find((c) => c.slug === "movil");
  const texto = movil!.preguntas.flatMap((p) => p.respuesta).join(" ");
  // Los distintivos de tienda son marcadores de posición hasta que exista un
  // acuerdo institucional, así que la respuesta no puede insinuar una descarga.
  assert.match(texto, /marcadores de posición|no publicada/);
});

test("el FAQ preserva el descargo de independencia", () => {
  const acceso = CATEGORIAS_FAQ.find((c) => c.slug === "acceso");
  const texto = acceso!.preguntas.flatMap((p) => p.respuesta).join(" ");
  assert.match(texto, /plataforma estudiantil independiente/);
});

test("REQ-HELP-04: cada control del formulario tiene etiqueta permanente", async () => {
  const fuente = await leer("../app/contacto/ContactForm.tsx");
  for (const campo of ["nombre", "email", "categoria", "asunto", "mensaje"]) {
    assert.match(fuente, new RegExp(`htmlFor="soporte-${campo}"`), `falta la etiqueta de ${campo}`);
    assert.match(fuente, new RegExp(`id="soporte-${campo}"`), `falta el id de ${campo}`);
  }
  // La validación se expone de forma programática, no solo por color.
  assert.match(fuente, /aria-invalid/);
  assert.match(fuente, /aria-describedby/);
});

test("REQ-HELP-03: el acuse es una región persistente y no un aviso efímero", async () => {
  const fuente = await leer("../app/contacto/ContactForm.tsx");
  assert.match(fuente, /aria-live="polite"/);
  assert.match(fuente, /policy-confirm/);
  // Ninguna biblioteca de avisos que se desvanecen.
  assert.doesNotMatch(fuente, /from "sonner"|react-hot-toast|react-toastify/);

  const dependencias = JSON.parse(await leer("../package.json")).dependencies ?? {};
  assert.equal("sonner" in dependencias, false, "sonner no debe entrar como dependencia");
  assert.ok("zod" in dependencias, "zod es la biblioteca de validación autorizada");
});

test("REQ-SUP-03: el señuelo queda fuera del foco y de la tecnología asistiva", async () => {
  const fuente = await leer("../app/contacto/ContactForm.tsx");
  assert.match(fuente, /className="policy-honeypot"/);
  assert.match(fuente, /tabIndex=\{-1\}/);
  assert.match(fuente, /aria-hidden="true"/);

  const estilos = await leer("../app/globals.css");
  // Con `display: none` muchos clientes automatizados lo detectan y lo esquivan.
  const bloque = estilos.slice(estilos.indexOf(".policy-honeypot {"));
  assert.doesNotMatch(bloque.slice(0, 300), /display: none/);
  assert.match(bloque.slice(0, 300), /clip-path: inset\(50%\)/);
});

test("REQ-HELP-10: la apertura del acordeón respeta el movimiento reducido", async () => {
  const estilos = await leer("../app/globals.css");
  const bloque = estilos.slice(estilos.indexOf("/* ── Contacto y preguntas frecuentes"));
  assert.match(bloque, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(bloque, /interpolate-size: allow-keywords/);
  // `transition: all` está prohibido: las propiedades se nombran una a una.
  assert.doesNotMatch(bloque, /transition:\s*all/);
});

test("las categorías del formulario y del esquema no pueden divergir", async () => {
  const fuente = await leer("../app/contacto/ContactForm.tsx");
  // El formulario recorre la constante en vez de repetir la lista a mano.
  assert.match(fuente, /CATEGORIAS_SOPORTE\.map/);
  assert.equal(CATEGORIAS_SOPORTE.length, 4);
});
