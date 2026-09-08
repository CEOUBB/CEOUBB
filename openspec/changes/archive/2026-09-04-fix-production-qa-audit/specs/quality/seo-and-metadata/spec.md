## Purpose

Gobierna los estándares de descubrimiento web, identidad gráfica en navegadores (favicon), directivas para rastreadores (RFC 9309), metadatos canónicos y datos estructurados Schema.org para posicionamiento institucional de CEOUBB.

## ADDED Requirements

### Requirement: Suministro de Favicon Canónico en Raíz (REQ-SEO-01)

WHEN un navegador, cliente HTTP o crawler solicita `/favicon.ico` en la raíz del dominio, el servidor SHALL responder con un recurso binario de icono válido (`image/x-icon`) y código de estado HTTP 200, evitando responder con páginas HTML de error 404 o redirecciones.

#### Scenario: Petición nativa del navegador a favicon.ico

- **GIVEN** un navegador web abriendo cualquier página de `https://ceoubb.com`
- **WHEN** el navegador emite automáticamente una petición `GET /favicon.ico`
- **THEN** el servidor SHALL responder con HTTP 200 y cabecera `Content-Type: image/x-icon` (o equivalente de imagen)
- **AND** el tamaño del recurso SHALL ser inferior a 10 KB

### Requirement: Directiva Absoluta de Sitemap en robots.txt (REQ-SEO-02)

The system SHALL publicar en `public/robots.txt` la directiva `Sitemap` conteniendo una URL absoluta canónica con esquema `https://ceoubb.com/sitemap.xml`, en estricta conformidad con el estándar RFC 9309.

#### Scenario: Rastreo por bots de búsqueda

- **GIVEN** un robot indexador (Googlebot, Bingbot u otro agente de búsqueda)
- **WHEN** descarga `https://ceoubb.com/robots.txt`
- **THEN** la línea `Sitemap:` SHALL especificar `https://ceoubb.com/sitemap.xml`
- **AND** NO SHALL contener rutas relativas como `/sitemap.xml`

### Requirement: Metadatos Canónicos y Datos Estructurados JSON-LD (REQ-SEO-03)

The system SHALL configurar en `app/layout.tsx` la propiedad `metadataBase: new URL('https://ceoubb.com')` y generar etiquetas `<link rel="canonical">` en todas las páginas públicas institucionales.
WHERE la página es el portal principal (`/`), el documento SHALL incluir un bloque `<script type="application/ld+json">` con la definición de `@type: EducationalOrganization` o `WebApplication`.
WHERE la página es `/faq`, el documento SHALL incluir un bloque `<script type="application/ld+json">` con `@type: FAQPage` estructurando las preguntas frecuentes y sus respuestas.

#### Scenario: Validación de etiquetas canónicas en el head

- **GIVEN** un visitante o crawler en cualquier ruta pública (`/`, `/faq`, `/contacto`, etc.)
- **WHEN** se inspecciona el elemento `<head>` del HTML renderizado
- **THEN** SHALL existir una etiqueta `<link rel="canonical" href="...">` apuntando a la URL absoluta canónica correspondiente

#### Scenario: Validación de FAQPage Schema

- **GIVEN** un motor de búsqueda indexando `https://ceoubb.com/faq`
- **WHEN** analiza los bloques de script del documento
- **THEN** SHALL encontrar un bloque JSON-LD con `@context: "https://schema.org"` y `@type: "FAQPage"`
- **AND** contendrá las entidades `Question` y `Answer` correspondientes a las preguntas publicadas

### Requirement: Optimización de Precarga de Fuentes Monospace (REQ-SEO-04)

The system SHALL evitar precargar globalmente recursos tipográficos pesados que no se consumen en las vistas de primer nivel del portal público institucional.

#### Scenario: Carga de página principal sin advertencias de precarga

- **GIVEN** un usuario en la página principal `/`
- **WHEN** la página termina de cargar en un navegador con DevTools abierto
- **THEN** la consola del navegador NO SHALL registrar advertencias de recursos precargados no utilizados (font preload unused warning)
