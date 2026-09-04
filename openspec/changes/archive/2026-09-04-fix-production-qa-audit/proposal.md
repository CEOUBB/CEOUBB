# Propuesta: Remediación de Hallazgos QA de Producción en CEOUBB Core

## Why

La auditoría exhaustiva en vivo sobre la plataforma en producción `https://ceoubb.com` evidenció un rendimiento de carga y velocidad óptimos (TTFB ~140ms, Lighthouse 96 en Performance), pero identificó fallas técnicas, de experiencia de usuario y de seguridad que comprometen la calidad institucional:

1. Peticiones automáticas nativas a `/favicon.ico` fallan con HTTP 404 y consumen ~15.6 KB de HTML en cada solicitud.
2. Rutas no encontradas renderizan la pantalla predeterminada en inglés de Next.js (`404: This page could not be found.`), sin semántica institucional ni contenedor `<main>`.
3. Webhooks no configurados responden con HTTP 500 confirmando la existencia del handler y activando reintentos infinitos en GitHub y Linear.
4. `robots.txt` declara una directiva sitemap relativa (`/sitemap.xml`) en violación de RFC 9309, penalizando el puntaje SEO.
5. Se detecta duplicación del landmark `<nav aria-label="Documentos relacionados">` en el footer institucional frente a páginas de políticas.
6. Ausencia de etiquetas canónicas y marcado estructurado JSON-LD (Schema.org).

Este cambio resuelve estas brechas técnicas para asegurar el estándar institucional de CEOUBB antes de mayor escala.

## What Changes

- **Página 404 Institucional (`app/not-found.tsx`)**: Nueva vista de error 404 implementada siguiendo estrictamente los protocolos de diseño `/impeccable` y `/deliberate`, con tokens OKLCH, tipografía `Merriweather` / `Manrope`, semántica accesible `<main>` y soporte de navegación de retorno en español.
- **Favicon Raíz (`public/favicon.ico`)**: Incorporación de icono multirresolución estándar (16x16 y 32x32) en la raíz para evitar errores 404 y transferencias de 15 KB por petición del navegador.
- **Protección de Webhooks (`/api/webhooks/github`, `/api/webhooks/linear`)**: Modificación del comportamiento ante ausencia de secreto de webhook para responder con `HTTP 404 Not Found` en lugar de `HTTP 500 Internal Server Error`, previniendo la fuga de información de infraestructura y la sobrecarga por reintentos de los servicios externos.
- **Corrección RFC 9309 en `robots.txt`**: Actualización de la directiva `Sitemap` a URL canónica absoluta (`https://ceoubb.com/sitemap.xml`).
- **Desduplicación de Landmark Accesible en Footer (`app/site-footer.tsx`)**: Modificación del atributo a `aria-label="Documentos institucionales y legales"` para eliminar la no-conformidad de landmarks duplicados (Axe-Core).
- **SEO Canónico y Marcado Estructurado Schema.org**: Incorporación de `metadataBase` en el layout raíz, `<link rel="canonical">` dinámico y datos estructurados JSON-LD (`EducationalOrganization` en la raíz y `FAQPage` en `/faq`).
- **Optimización de Recursos de Fuentes**: Carga selectiva / condicional de `JetBrains Mono` para eliminar advertencias de precarga no consumida en el portal público.

_(Nota: Toda ruta o lógica vinculada a `/biblioteca` o `/biblioteca/index.html` queda explícitamente fuera de este cambio por estar sujeta a un rediseño integral futuro)._

## Capabilities

### New Capabilities

- `ui/not-found-page`: Implementación de la vista 404 personalizada con diseño deliberado e impecable (`app/not-found.tsx`), contraste garantizado WCAG 2.2 AA y navegación de recuperación hacia la página principal.
- `quality/seo-and-metadata`: Suministro de `favicon.ico`, directiva canónica absoluta de `sitemap.xml` en `robots.txt`, metadatos canónicos y enriquecimiento semántico con Schema.org JSON-LD.

### Modified Capabilities

- `integrations`: Modificación del manejo de errores en webhooks externos cuando el secreto no está configurado (retornar HTTP 404 en lugar de 500).
- `ui/public-help-pages`: Desduplicación del landmark `<nav>` en `app/site-footer.tsx` para garantizar identificadores accesibles unívocos en páginas de ayuda y políticas institucionales.

## Impact

- **Archivos creados/modificados:**
  - `public/favicon.ico` [NEW]
  - `app/not-found.tsx` [NEW]
  - `public/robots.txt` [MODIFY]
  - `app/site-footer.tsx` [MODIFY]
  - `app/api/webhooks/github/route.ts` [MODIFY]
  - `app/api/webhooks/linear/route.ts` [MODIFY]
  - `app/layout.tsx` [MODIFY]
  - `app/faq/page.tsx` [MODIFY]
- **Dependencias:** Cero nuevas dependencias externas requeridas. Se utilizan primitivas existentes de Next.js 16, `@phosphor-icons/react` y tokens OKLCH del sistema.
- **Riesgo:** Bajo. No altera esquemas de base de datos Turso ni proyecciones de Firestore.
