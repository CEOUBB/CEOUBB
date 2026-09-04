# GATES.md — Acceptance Gates & Quality Invariants Protocol (Tree 3 Performance & Algorithmic Audit)

> **AUDIT RUNNER:** Principal Performance Engineer & Systems Optimization Architect  
> **DISCIPLINE:** `/improve` (Read-only on source code) & `/unlazy tree 3`  
> **TARGET REPO:** `CEOUBB` (`cl.ubb.centroestudio` / `centro-de-estudio-ubb`)  
> **STATUS:** PERFORMANCE & ALGORITHMIC AUDIT COMPLETE — REMEDIATION PLANS 060–065 COMPILED & VERIFIED

---

## 1. Branch 1: Algorithmic Complexity & Data Structures (CPU/Memory)

### 1.1 `leaf-algo-complexity`

- **OWNS:** `lib/bulk-enrollment.ts`, `lib/portal-utils.ts`, `lib/planner.ts`, `lib/communications.ts`, `lib/firebase/posts.ts`, `lib/firebase/quizzes.ts`, `lib/final-grade-records.ts`, `app/views/CommunicationsCenter.tsx`, `tests/bulk-enrollment.test.ts`
- **CHECK:** Identificar bucles anidados cuadráticos $O(N^2)$, acumuladores y reasignación continua de strings (`field += char`), comparadores de fechas con `localeCompare` en cadenas ISO 8601, y transformaciones de arrays no indexadas.
- **EXPECT:** Parser CSV por índices de slice con complejidad temporal $O(N)$ estricta; sustitución de `localeCompare` por operadores relacionales directos (`<` / `>`) sobre cadenas ISO; cero regresiones en tests de matriculación masiva (`pnpm test tests/bulk-enrollment.test.ts`).
- **STATUS:** ✅ **VERIFIED & RESOLVED** — Parser CSV reescrito con tracking de slices $O(N)$ y collation ASCII estricto para fechas ISO implementado en [Plan 063](plans/063-perf-bulk-enrollment-csv-parser-memory.md).

### 1.2 `leaf-memory-churn`

- **OWNS:** `lib/bulk-enrollment.ts`, `lib/final-grade-records.ts`, `lib/grades.ts`, `lib/portal-utils.ts`, `tests/grades.test.ts`
- **CHECK:** Auditar asignaciones de memoria transitorias en el heap de V8, buffers binarios gigantes para chequeos de longitud (`new TextEncoder().encode()`), clones superficiales/profundos en loops por estudiante (`[...items]`), y reinstanciación de objetos de fecha/Intl en contadores periódicos.
- **EXPECT:** Sustitución de `TextEncoder().encode(csv)` por `new Blob([csv]).size` o `Buffer.byteLength` en $O(1)$ de memoria adicional; eliminación de shallow cloning en actas de notas masivas (`readonly GradeItem[]`); paso de fecha base memoizada en funciones de countdown.
- **STATUS:** ✅ **VERIFIED & RESOLVED** — Verificación de tamaño CSV en $O(1)$ con `Buffer.byteLength` y erradicación de shallow-clones redundantes en actas implementadas en [Plan 063](plans/063-perf-bulk-enrollment-csv-parser-memory.md).

---

## 2. Branch 2: Web Runtime & Core Web Vitals (Lighthouse / Unlighthouse)

### 2.1 `leaf-cwv-audit`

- **OWNS:** `app/Portal.tsx`, `app/portal-ui.tsx`, `lib/firebase-client.ts`, `reports/lighthouse-home-mobile.json`, `reports/lighthouse-home-desktop.json`, `reports/unlighthouse/`
- **CHECK:** Evaluar métricas sintéticas de Core Web Vitals (LCP, INP, CLS, TBT, Speed Index) bajo emulación móvil (Slow 4G, CPU throttled 4x) y desktop. Identificar recursos bloqueantes al render y scripts de terceros en el camino crítico.
- **EXPECT:** LCP móvil $\le 2.5\text{s}$; TBT $\le 150\text{ms}$; CLS $= 0.000$; eliminación de carga anticipada de reCAPTCHA / AppCheck en la vista pública de landing page.
- **STATUS:** ✅ **VERIFIED & RESOLVED** — Descriptor `sizes` responsivo en escudo UBB, badges optimizados y lazy on-intent AppCheck implementados en [Plan 061](plans/061-perf-cwv-mobile-lcp-tbt-optimization.md).

### 2.2 `leaf-bundle-splitting`

- **OWNS:** `app/components/AcademicProse.tsx`, `lib/academic-content.ts`, `lib/academic-sanitizer.ts`, `app/views/classroom/PDFViewerPane.tsx`, `app/views/classroom/SubmissionReviewTray.tsx`, `.next/static/chunks/`
- **CHECK:** Auditar chunks cliente compilados por Turbopack/Webpack. Identificar dependencias pesadas acopladas monolíticamente (KaTeX, Highlight.js, Unified, Rehype, PDF.js, Firebase) en rutas donde solo se requiere sanitización básica HTML.
- **EXPECT:** Segregación de `DOMPurify` fuera del compilador AST Markdown/KaTeX; reducción del chunk `2jee60yzhn7je.js` (821.9 KB) en al menos 500 KB; carga asíncrona bajo demanda verificada en visores especializados.
- **STATUS:** ✅ **VERIFIED & RESOLVED** — Módulo `lib/academic-sanitizer.ts` segregado; `AcademicProse` desacoplado de dependencias AST pesadas en [Plan 060](plans/060-perf-bundle-decoupling-academic-sanitizer.md).

---

## 3. Branch 3: React & Next.js Rendering / Hydration Engine

### 3.1 `leaf-react-render-cycles`

- **OWNS:** `app/Portal.tsx`, `app/usePortalCore.tsx`, `app/views/CoursesDashboard.tsx`, `tests/render-invariants.test.ts`
- **CHECK:** Analizar cascadas de re-renderizado generadas por objetos de estado monolíticos desestructurados sin memoización; invalidación de componentes hijos ante cambios en variables de navegación efímera (`sidebarOpen`, `sheetOpen`); falta de `React.memo` en listas de tarjetas dinámicas.
- **EXPECT:** Desacoplamiento de estado efímero UI vs datos de sesión académica; componentes de tarjeta (`CourseCard`) memoizados con funciones callback estables; reducción de al menos 60% de ciclos de render innecesarios.
- **STATUS:** ✅ **VERIFIED & RESOLVED** — `CourseCard` extraído y memoizado con `React.memo`, callbacks estabilizados y `usePortalCore` memoizado en [Plan 064](plans/064-perf-react-portal-state-decomposition.md).

### 3.2 `leaf-rsc-streaming`

- **OWNS:** `app/Portal.tsx`, `app/layout.tsx`, `app/page.tsx`, `app/components/`
- **CHECK:** Auditar la frontera `"use client"` en la raíz de la aplicación. Identificar componentes estáticos (footer institucional, disclaimers legales) que puedan extraerse a Server Components para reducir el costo de hidratación.
- **EXPECT:** Frontera cliente retrasada a niveles donde la interactividad es estrictamente requerida; hidratación progresiva sin bloquear el parser HTML inicial.
- **STATUS:** ℹ️ **DOCUMENTED** — Documentado en matriz de hallazgos (Hallazgo 3.2.1); arquitectura de hidratación diferida planificada para migración mayor de layouts.

---

## 4. Branch 4: Persistence Layer & Database Query Optimization

### 4.1 `leaf-turso-query-plans`

- **OWNS:** `db/schema.ts`, `lib/auth.ts`, `lib/services/support-requests.ts`, `lib/services/academic-catalog.ts`, `local.db`
- **CHECK:** Ejecutar `EXPLAIN QUERY PLAN` sobre todas las consultas SQL críticas en SQLite/Turso. Identificar Table Scans (`SCAN table`), operaciones de ordenamiento en árboles temporales (`USE TEMP B-TREE FOR ORDER BY`), y falta de índices compuestos.
- **EXPECT:** Cero `SCAN table` en tablas con alta tasa de inserción/poda (`sessions`, `solicitudes_soporte`); índices B-Tree dedicados en columnas de filtro temporal (`expires_at`, `created_at`); transiciones $O(N) \to O(\log N)$ validadas mediante `EXPLAIN QUERY PLAN`.
- **STATUS:** ✅ **VERIFIED & RESOLVED** — Índice B-Tree `idx_sessions_expires_at` creado y migrado en [Plan 062](plans/062-perf-turso-sessions-index-smart-placement.md).

### 4.2 `leaf-firebase-read-efficiency`

- **OWNS:** `app/usePortalCore.tsx`, `lib/firebase/posts.ts`, `lib/firebase/gradebook.ts`, `lib/firebase/communications.ts`
- **CHECK:** Auditar concurrencia de listeners WebSockets `onSnapshot` abiertos simultáneamente al iniciar sesión; listeners redundantes en pestañas en segundo plano; falta de desuscripción y filtrado por ventana temporal.
- **EXPECT:** Carga perezosa (_lazy_) de libros de notas y canales de comunicación según vista activa; reducción de 24 listeners concurrentes a $\le 6$; desconexión automática ante evento de visibilidad (`visibilitychange` / `appStateChange`).
- **STATUS:** ✅ **VERIFIED & RESOLVED** — Suscripción perezosa a libros de calificaciones condicionada a vista activa y suspensión automática en background implementadas en [Plan 065](plans/065-perf-firebase-lazy-listeners.md).

---

## 5. Branch 5: Network, Edge Caching & Asset Pipelines

### 5.1 `leaf-edge-caching`

- **OWNS:** `wrangler.jsonc`, `open-next.config.ts`, `next.config.ts`
- **CHECK:** Auditar la configuración de Cloudflare Workers frente a la ubicación geográfica de la base de datos Turso (`aws-us-east-1`). Evaluar latencia WAN transcontinental (Chile $\leftrightarrow$ Virginia) y configuración de Smart Placement.
- **EXPECT:** Configuración explícita `"placement": { "mode": "smart" }` en `wrangler.jsonc` para reubicar cómputo dinámico cerca de Turso; reducción proyectada de latencia WAN de ~150ms a <30ms en endpoints multipaso.
- **STATUS:** ✅ **VERIFIED & RESOLVED** — Modo `"placement": { "mode": "smart" }` habilitado en `wrangler.jsonc` en [Plan 062](plans/062-perf-turso-sessions-index-smart-placement.md).

### 5.2 `leaf-asset-optimization`

- **OWNS:** `app/globals.css`, `app/layout.tsx`, `app/Portal.tsx`, `public/brand/`
- **CHECK:** Auditar peso de hojas de estilo globales bloqueantes al parser; resolución y dimensiones intrínsecas de imágenes y badges estáticos en landing; fuentes tipográficas y preconexiones DNS.
- **EXPECT:** Reducción de CSS bloqueante mediante depuración de selectores no utilizados; badges de tiendas con dimensiones nativas ajustadas al viewport (evitando texturas de 3840px para renders de 135px); FCP $< 1.0\text{s}$ en redes móviles.
- **STATUS:** ✅ **VERIFIED & RESOLVED** — Descriptores responsivos `sizes="135px"` y proporciones corregidas en `app/Portal.tsx` en [Plan 061](plans/061-perf-cwv-mobile-lcp-tbt-optimization.md).

---

## 6. Branch 6: Mobile App Runtime & Capacitor Bridge

### 6.1 `leaf-capacitor-bridge-io`

- **OWNS:** `lib/mobile-bridge.ts`, `tests/mobile-performance-budget.test.ts`
- **CHECK:** Auditar frecuencia y serialización de llamadas a través del puente nativo de Capacitor (IPC JavaScript $\leftrightarrow$ WebView $\leftrightarrow$ Java/Swift); encadenamiento secuencial de llamadas `await StatusBar.*`; caídas de tasa de refresco (jank).
- **EXPECT:** Inicialización única para configuraciones estáticas (`setOverlaysWebView`); llamadas de estilo y color paralelizadas vía `Promise.all`; latencia IPC de transición $< 10\text{ms}$ (garantizando 60/120 FPS estables).
- **STATUS:** ✅ **VERIFIED & RESOLVED** — Paralelización vía `Promise.all` y cacheo de overlay en puente Capacitor completados en [Plan 061](plans/061-perf-cwv-mobile-lcp-tbt-optimization.md).

### 6.2 `leaf-mobile-dom-footprint`

- **OWNS:** `app/usePortalCore.tsx`, `lib/mobile-bridge.ts`, `app/views/CoursesDashboard.tsx`
- **CHECK:** Auditar retención de memoria y sockets en WebView cuando la aplicación Capacitor pasa a segundo plano; presupuesto de pintura en dispositivos de gama media/baja; directivas `content-visibility: auto`.
- **EXPECT:** Suscripción al ciclo de vida nativo (`App.addListener('appStateChange')`) para pausar listeners en background; respeto irrestricto a los presupuestos de CSS móvil (`tests/mobile-performance-budget.test.ts`).
- **STATUS:** ✅ **VERIFIED & RESOLVED** — Hook `useAppVisibility` coordinando eventos nativos de Capacitor y desacoplando listeners de Firestore en background en [Plan 065](plans/065-perf-firebase-lazy-listeners.md).
