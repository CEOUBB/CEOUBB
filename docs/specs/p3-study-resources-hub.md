# P3 — Hub de Recursos de Estudio, Asistentes de IA y Ecosistema UBB (SDD Specification)

**Status:** APPROVED FOR IMPLEMENTATION · **Target:** Web Portal (`app/portal-views.tsx`, `app/globals.css`)  
**Design Standard:** `DESIGN.md` · **Execution Agent:** Claude Code / Antigravity

---

## 1. Visión Ejecutiva y Libertad Creativa

Transformar la vista estática y restringida de Recursos de Estudio (`ResourcesView`) en un **Hub Integral de Recursos Académicos, Asistentes de IA, Beneficios Estudiantiles y Portales Oficiales UBB**, transversal para todas las facultades y carreras de la Universidad del Bío-Bío.

> [!TIP]
> **Directiva de Libertad Creativa y Técnica para Claude Code:**  
> El agente ejecutor cuenta con **total libertad creativa y arquitectónica** para diseñar componentes, modularizar código, estructurar estilos CSS, añadir micro-interacciones sutiles con `motion/react`, refinar el layout responsivo y pulir la tipografía y contrastes, siempre que cumpla con los requisitos funcionales EARS y los lineamientos base de `DESIGN.md`.

---

## 2. Requerimientos de Contenido y Jerarquía de Secciones

El flujo visual de la página SHALL estructurarse en **4 grandes bloques temáticos** en el siguiente orden:

```
1. ENCABEZADO PRINCIPAL
   Título y descripción motivacional y amplia (sin mención restrictiva a cantidad de ramos).

2. SECCIÓN 1: ECOSISTEMA CEOUBB
   ├─ Biblioteca académica (banco colaborativo de certámenes y apuntes; sin lista fija de 6 ramos).
   └─ CEOUBB Móvil (información de app móvil y badges de Google Play y App Store).

3. SECCIÓN 2: ASISTENTES DE INTELIGENCIA ARTIFICIAL
   ├─ Sub-grupo: 100% Gratis (DeepSeek, Kimi, Qwen)
   ├─ Sub-grupo: Plan gratuito* (ChatGPT**, Claude, Google Gemini)
   └─ Notas al pie aclaratorias (* y **).

4. SECCIÓN 3: BENEFICIOS CON CORREO INSTITUCIONAL (@alumnos.ubiobio.cl)
   ├─ GitHub Student Developer Pack (Copilot gratis, suite JetBrains; sin Canva Pro)
   ├─ Notion Plus para Educación (bloques y almacenamiento ilimitado)
   ├─ Microsoft 365 Educación UBB (Office descargable en 5 PCs/Macs + OneDrive)
   ├─ Autodesk Education (AutoCAD, Revit, Fusion 360 e Inventor gratis)
   ├─ Spotify Premium Estudiantes ($2.700 CLP/mes vía SheerID)
   ├─ Apple Music Estudiantes (tarifa reducida + Apple TV+ incluido vía UNiDAYS)
   └─ YouTube Music / Premium Estudiantes (música/video sin anuncios vía SheerID)
   (Todos con sus logos oficiales vectoriales SVG integrados).

5. SECCIÓN 4: PORTALES Y SERVICIOS OFICIALES UBB (Al final de la página)
   ├─ Intranet Alumnos UBB (intranet.ubiobio.cl)
   ├─ Adecca UBB (adecca.ubiobio.cl)
   ├─ Moodle UBB (moodle.ubiobio.cl)
   ├─ Biblioteca Central SIBUBB (sibubb.ubiobio.cl)
   └─ Portal Institucional UBB (ubiobio.cl)
```

---

## 3. Requirements Engineering (EARS & RFC 2119)

### Requisitos Funcionales

- **REQ-RES-01 (Ubiquitous - Universalidad Académica)**  
  The system SHALL present general-purpose study resources and AI tools accessible to students and faculty across all UBB disciplines (Humanities, Engineering, Health, Business, Education, Architecture).

- **REQ-RES-02 (Event-Driven - Enlace a Biblioteca)**  
  WHEN a user interacts with the Biblioteca Académica card, the system SHALL navigate to `/biblioteca/index.html` within the same browsing context.

- **REQ-RES-03 (Event-Driven - Aplicaciones Móviles)**  
  WHEN a user interacts with the CEOUBB Móvil card, the system SHALL present the mobile application card and store badges (Google Play y App Store).

- **REQ-RES-04 (Event-Driven - Enlaces Externos Seguros)**  
  WHEN a user clicks any external AI tool, student benefit, or official UBB portal link, the system SHALL open the target URL in a new browser tab (`target="_blank"`) with strict security headers (`rel="noreferrer noopener"`).

- **REQ-RES-05 (State-Driven - Categorización de IAs y Notas al Pie)**  
  WHILE rendering the AI Hub, the system SHALL segregate the 6 AI platforms into two distinct groups:
  1. `100% Gratis`: DeepSeek, Kimi, Qwen.
  2. `Plan gratuito*`: ChatGPT\*\*, Claude, Google Gemini.  
     And SHALL render the corresponding explanatory footnotes for `*` (cuotas de uso) and `**` (acceso conversacional ilimitado en modelos base).

- **REQ-RES-06 (State-Driven - Logos Vectoriales Oficiales)**  
  WHILE rendering third-party platforms (AI tools and student perks), the system SHALL use sharp, clean, self-contained SVG vectors for each brand logo (OpenAI, Anthropic, DeepSeek, Google, Moonshot, Alibaba Qwen, GitHub, Notion, Microsoft 365, Autodesk, Spotify, Apple Music, YouTube Music).

- **REQ-RES-07 (State-Driven - Posicionamiento de Portales Oficiales UBB)**  
  WHILE rendering the layout, the system SHALL place the official UBB portals section at the bottom of the page with clear institutional styling.

- **REQ-RES-08 (Unwanted Behavior - Aislamiento de Ruidos y Enlaces Rotos)**  
  IF an external service requires login or external identity verification (SheerID, UNiDAYS, UBB SSO), THEN the UI SHALL clearly indicate the benefit model without promising instant bypass of third-party verification.

---

## 4. BDD Acceptance Criteria (Gherkin Scenarios)

```gherkin
Feature: Study Resources & Academic Hub

  Scenario: User visits Resources page and navigates to Biblioteca Académica
    Given an authenticated student or teacher on the CEOUBB portal
    When they navigate to the "Recursos" view
    Then the Biblioteca Académica card is rendered without the old 6-course list
    And its description explains the community certámenes and pautas
    And clicking "Abrir biblioteca" opens "/biblioteca/index.html"

  Scenario: Student consults AI Hub categories and footnotes
    Given an authenticated user viewing the AI section
    Then DeepSeek, Kimi, and Qwen are displayed under the "100% Gratis" tier
    And ChatGPT, Claude, and Gemini are displayed under the "Plan gratuito*" tier
    And ChatGPT displays a double asterisk mark "**"
    And the footnote explains that base conversation in ChatGPT is unlimited without subscription

  Scenario: Student clicks on an official UBB portal or external benefit
    Given an authenticated user on the Resources page
    When they click on "Moodle UBB" or "GitHub Student Pack"
    Then the link opens in a new tab with rel="noreferrer noopener"
    And the official UBB section is positioned at the bottom of the page
```

---

## 5. Directrices Técnicas de Implementación

1. **Componentes (`app/portal-views.tsx`)**:
   - Refactorizar `ResourcesView({ courses })`.
   - Incluir SVGs de marcas como componentes React o paths SVG limpios.
   - Usar animaciones de entrada fluidas y sutiles con `motion/react` (`stagger`, `rise`, `duration: 0.25–0.4s`).
2. **Estilos (`app/globals.css`)**:
   - Tarjetas sobre `--surface-card` (`#ffffff`), bordes `--border-hairline` (`#e2e8f0`), sutil elevación al hover.
   - Badges con estilo pill (`border-radius: 9999px`) usando los acentos de `DESIGN.md` (azul UBB `#0055b8` para oficiales, verde suave para 100% gratis, ámbar para descuentos).
   - Layout 100% responsivo (grid flexible de 1 columna en móvil, 2 en tablet, 3-4 en desktop grande).
3. **Verificación de Calidad**:
   - `pnpm run lint`
   - `pnpm run typecheck`
   - `pnpm run test:unit`
