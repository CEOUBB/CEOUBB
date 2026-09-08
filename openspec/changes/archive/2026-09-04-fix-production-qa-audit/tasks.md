# Tareas de Implementación: Remediación QA CEOUBB Core

## 1. Infraestructura y Assets Estáticos

- [x] 1.1 Generar y colocar `public/favicon.ico` con el isotipo de CEOUBB en formato multirresolución (16x16 y 32x32) y verificar que responde con HTTP 200 y Content-Type de imagen. // Implements: REQ-SEO-01
- [x] 1.2 Actualizar `public/robots.txt` a URL canónica absoluta `Sitemap: https://ceoubb.com/sitemap.xml` cumpliendo RFC 9309 y verificar sintaxis. // Implements: REQ-SEO-02

## 2. Blindaje de Webhooks de Integración

- [x] 2.1 Modificar `app/api/webhooks/github/route.ts` para retornar `HTTP 404` cuando `GITHUB_WEBHOOK_SECRET` no esté configurado en el entorno. // Implements: REQ-INT-01
- [x] 2.2 Modificar `app/api/webhooks/linear/route.ts` para retornar `HTTP 404` cuando `LINEAR_WEBHOOK_SECRET` no esté configurado en el entorno. // Implements: REQ-INT-01

## 3. Accesibilidad y Desduplicación de Landmarks

- [x] 3.1 Actualizar el atributo en `app/site-footer.tsx` a `aria-label="Documentos institucionales y legales"` para desduplicar el landmark frente a páginas de políticas. // Implements: REQ-HELP-10

## 4. Nueva UI: Página 404 Institucional (/deliberate & /impeccable)

- [x] 4.1 Definir la hoja de decisiones de diseño (/deliberate decision sheet) y modo Operate (/impeccable) para la pantalla de error 404: emparejamiento `Merriweather` + `Manrope`, tokens OKLCH de superficie, cero inline SVGs y soporte completo de estados (`:hover`, `:active`, `:focus-visible`). // Implements: REQ-UI-404
- [x] 4.2 Crear `app/not-found.tsx` estructurado con `<main id="main-content">`, redacción empática institucional en español, botón de recuperación hacia `/` con `@phosphor-icons/react` y respeto a `useReducedMotion()`. // Implements: REQ-UI-404
- [x] 4.3 Verificar accesibilidad WCAG 2.2 AA en `app/not-found.tsx` con ratios de contraste superiores a 4.5:1 y navegación por teclado fluida. // Implements: REQ-UI-404

## 5. Metadatos Canónicos, Schema.org y Optimización de Carga

- [x] 5.1 Declarar `metadataBase: new URL('https://ceoubb.com')` y enlaces canónicos en `app/layout.tsx`, ajustando la precarga de fuentes para evitar advertencias en consola. // Implements: REQ-SEO-03, REQ-SEO-04
- [x] 5.2 Incorporar bloque `<script type="application/ld+json">` con `@type: EducationalOrganization` en `app/page.tsx` y `@type: FAQPage` en `app/faq/page.tsx`. // Implements: REQ-SEO-03

## 6. Verificación Integral y Suite de Calidad

- [x] 6.1 Ejecutar `pnpm run verify:fast` y `pnpm run verify:invariants` validando tipos, tests unitarios e integridad SHA-256 sin degradación.
- [x] 6.2 Ejecutar `pnpm run format` y `pnpm run format:check` garantizando conformidad con Prettier y ESLint antes del cierre del cambio.
