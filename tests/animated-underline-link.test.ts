import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("REQ-MOTION-LINK-01: AnimatedUnderline y AnimatedUnderlineLink están declarados y exportados", async () => {
  const [componentSource, reexportSource] = await Promise.all([
    source("components/motion/animated-underline-link.tsx"),
    source("components/AnimatedUnderlineLink.tsx"),
  ]);

  // Exportaciones nombradas principales
  assert.match(componentSource, /export function AnimatedUnderline\(/);
  assert.match(componentSource, /export function AnimatedUnderlineLink\(/);
  assert.match(reexportSource, /export \{\s*AnimatedUnderline,\s*AnimatedUnderlineLink/);

  // Soporte de aislamiento de prefijo y sufijo respecto al subrayado
  assert.match(componentSource, /animated-underline-prefix/);
  assert.match(componentSource, /animated-underline-suffix/);
  assert.match(componentSource, /className=\{.*animated-underline/);
  assert.match(componentSource, /if\s*\(as === "a"\)/);
});

test("REQ-MOTION-LINK-02: estilos canónicos de subrayado direccional y accesibilidad en globals.css", async () => {
  const globalsCss = await source("app/globals.css");

  // Regla base del subrayado: scaleX(0) en reposo con origen a la derecha
  assert.match(globalsCss, /\.animated-underline\s*\{[^}]*position:\s*relative/);
  assert.match(globalsCss, /\.animated-underline::after\s*\{[^}]*transform:\s*scaleX\(0\)/);
  assert.match(globalsCss, /\.animated-underline::after\s*\{[^}]*transform-origin:\s*right/);

  // Activación en hover y focus-visible: scaleX(1) con origen a la izquierda
  assert.match(globalsCss, /\.animated-underline:hover::after/);
  assert.match(globalsCss, /transform:\s*scaleX\(1\)/);
  assert.match(globalsCss, /transform-origin:\s*left/);

  // Activación por contenedor ancestro (.course-action, .animated-underline-link, .next-eval-action)
  assert.match(globalsCss, /\.course-action:hover\s+\.animated-underline::after/);
  assert.match(globalsCss, /\.animated-underline-link:hover\s+\.animated-underline::after/);
  assert.match(globalsCss, /\.next-eval-action:hover\s+\.animated-underline::after/);

  // Accesibilidad: WCAG 2.2 prefers-reduced-motion
  assert.match(
    globalsCss,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.animated-underline::after\s*\{[^}]*transition:\s*none/
  );
});

test("REQ-MOTION-LINK-03: integración de AnimatedUnderlineLink en el pie institucional compartido", async () => {
  const footerSource = await source("app/site-footer.tsx");

  assert.match(
    footerSource,
    /import\s*\{\s*AnimatedUnderlineLink\s*\}\s*from\s*["']@\/components\/motion\/animated-underline-link["']/
  );
  assert.match(footerSource, /<AnimatedUnderlineLink\s+href=\{enlace\.href\}/);
});

test("REQ-MOTION-LINK-04: integración de AnimatedUnderline en tarjetas de curso aislando el icono", async () => {
  const [courseCardSource, dashboardSource] = await Promise.all([
    source("app/views/CourseCard.tsx"),
    source("app/views/CoursesDashboard.tsx"),
  ]);

  // CourseCard: Entrar al aula envuelto en AnimatedUnderline dejando ArrowRight intacto
  assert.match(
    courseCardSource,
    /import\s*\{[^}]*AnimatedUnderline[^}]*\}\s*from\s*["']@\/components\/motion\/animated-underline-link["']/
  );
  assert.match(
    courseCardSource,
    /<AnimatedUnderline>Entrar al aula<\/AnimatedUnderline>(?:\{" "\}|\s)*<ArrowRight/
  );

  // CoursesDashboard: Ir al ramo envuelto en AnimatedUnderline dejando ArrowRight intacto
  assert.match(
    dashboardSource,
    /import\s*\{[^}]*AnimatedUnderline[^}]*\}\s*from\s*["']@\/components\/motion\/animated-underline-link["']/
  );
  assert.match(
    dashboardSource,
    /<AnimatedUnderline>Ir al ramo<\/AnimatedUnderline>(?:\{" "\}|\s)*<ArrowRight/
  );
});
