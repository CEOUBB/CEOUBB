import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/*
  Presupuesto de rendimiento móvil (TASK-13 de `docs/specs/p5-capacitor-mobile-migration.md`).

  El test no cuenta ocurrencias: parsea `app/globals.css` con un recorrido de llaves y
  exige que TODA declaración de `backdrop-filter` viva dentro de un `@media` que pida
  `min-width` >= 768px. Contar sería frágil — el día que alguien añada un séptimo blur
  suelto y borre otro, el número cuadraría y el guard no diría nada.
*/

const MOBILE_BREAKPOINT_PX = 768;
const CSS_PATH = new URL("../app/globals.css", import.meta.url);

/* Los comentarios se eliminan antes de parsear: uno de ellos menciona `backdrop-filter`
   al explicar el porqué del guard y no debe contarse como declaración activa. */
function stripComments(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, " ");
}

/* `@media (min-width: 768px)` protege; `@media (max-width: 520px)` no. Una lista
   separada por comas es una unión de condiciones (basta que una rama aplique), así que
   se descarta entera: no puede garantizar que el viewport móvil quede fuera. */
function guardsMobile(prelude: string) {
  if (!/^@media\b/i.test(prelude.trim())) return false;
  if (prelude.includes(",")) return false;
  const matches = prelude.matchAll(/min-width\s*:\s*([\d.]+)\s*(px|rem|em)/gi);
  for (const [, rawValue, unit] of matches) {
    const px = unit.toLowerCase() === "px" ? Number(rawValue) : Number(rawValue) * 16;
    if (px >= MOBILE_BREAKPOINT_PX) return true;
  }
  return false;
}

type Declaration = { text: string; ancestors: string[] };

/* Recorrido lineal: cada `{` apila el prelude acumulado, cada `}` o `;` cierra una
   declaración. Suficiente para CSS plano y anidado, y sin dependencias nuevas. */
function collectDeclarations(css: string) {
  const declarations: Declaration[] = [];
  const stack: string[] = [];
  let buffer = "";

  const flush = () => {
    const text = buffer.trim();
    if (text) declarations.push({ text, ancestors: [...stack] });
    buffer = "";
  };

  for (const char of css) {
    if (char === "{") {
      stack.push(buffer.trim());
      buffer = "";
    } else if (char === "}") {
      flush();
      stack.pop();
    } else if (char === ";") {
      flush();
    } else {
      buffer += char;
    }
  }
  flush();
  return declarations;
}

function ruleBodiesFor(css: string, selector: string) {
  const bodies: string[] = [];
  const pattern = new RegExp(
    `(?:^|[},])\\s*${selector.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*\\{([^{}]*)\\}`,
    "g"
  );
  for (const match of css.matchAll(pattern)) bodies.push(match[1]);
  return bodies;
}

const css = stripComments(await readFile(CSS_PATH, "utf8"));
const declarations = collectDeclarations(css);

// REQ-CAP-09: ninguna regla con `backdrop-filter` puede quedar activa en viewport móvil.
test("REQ-CAP-09: todo backdrop-filter vive tras un @media min-width >= 768px", () => {
  const blurs = declarations.filter((declaration) =>
    /^-?(?:webkit-)?backdrop-filter\s*:/i.test(declaration.text)
  );

  assert.ok(
    blurs.length > 0,
    "El parser no encontró ninguna declaración de backdrop-filter: el guard quedaría vacío y dejaría de proteger nada."
  );

  const unguarded = blurs.filter((declaration) => !declaration.ancestors.some(guardsMobile));
  assert.deepEqual(
    unguarded.map((declaration) => declaration.text),
    [],
    "Estas declaraciones de backdrop-filter se aplican en móvil; envuélvelas en @media (min-width: 768px)."
  );
});

// REQ-CAP-09: el `@supports` de la cabecera sigue existiendo, pero anidado en el media query.
test("REQ-CAP-09: el velo de .app-header conserva su @supports dentro del media query", () => {
  const headerBlur = declarations.find(
    (declaration) =>
      /^backdrop-filter\s*:/i.test(declaration.text) &&
      declaration.ancestors.some((prelude) => prelude.includes(".app-header"))
  );

  assert.ok(headerBlur, "Se perdió el velo de .app-header.");
  assert.ok(
    headerBlur.ancestors.some((prelude) => /^@supports\b/i.test(prelude.trim())),
    "El velo de .app-header debe seguir detrás de un @supports: sin él, los navegadores sin backdrop-filter se quedan con una cabecera semitransparente ilegible."
  );
});

// REQ-CAP-08: las filas del feed se saltan layout y paint fuera de pantalla.
test("REQ-CAP-08: las filas del feed declaran content-visibility y su alto estimado", () => {
  /* `.material-row` desapareció con la pestaña «Materiales»: la Portada es hoy
     la única lista sin techo, y absorbió las filas de archivos (REQ-PUB-13). */
  for (const selector of [".post-list article"]) {
    const bodies = ruleBodiesFor(css, selector);
    assert.ok(bodies.length > 0, `No se encontró la regla base de \`${selector}\`.`);

    const body = bodies.find((candidate) => candidate.includes("content-visibility"));
    assert.ok(body, `\`${selector}\` debe declarar content-visibility: auto (REQ-CAP-08).`);
    assert.match(body, /content-visibility\s*:\s*auto/);
    assert.match(
      body,
      /contain-intrinsic-size\s*:\s*auto\s+\d+px/,
      `\`${selector}\` necesita un contain-intrinsic-size con keyword \`auto\`; sin la pista de tamaño la barra de scroll salta al pintar cada fila.`
    );
  }
});
