# ADR 0001: Separación de Responsabilidades entre Turso (libSQL) y Cloud Firestore

- **Estado:** Aceptado
- **Fecha:** 2026-08-14
- **Decisores:** Mantenedores del Proyecto CEOUBB
- **Consulta / Specs:** `docs/specs/p1-academic-model.md`, `AGENTS.md`

---

## Contexto y Planteamiento del Problema

El LMS CEOUBB requiere gestionar dos naturalezas distintas de datos con requerimientos de escala, consistencia y latencia divergentes:

1. **Estructura Académica Institucional:** Jerarquía relacional estricta compuesta por facultades, departamentos, carreras, asignaturas, períodos lectivos, secciones académicas y matrículas de estudiantes. Estos datos requieren integridad referencial relacional (claves foráneas, unicidad compuesta, transacciones ACID y esquemas versionados mediante migraciones SQL).
2. **Operación del Aula en Tiempo Real:** Flujos de publicación de anuncios, archivos adjuntos en almacenamiento masivo, actualización de estados de lectura, notificaciones push inmediatas y control de acceso descentralizado a nivel de documento.

El uso exclusivo de Firestore como base de datos única provocaba duplicación de datos de matrícula, dificultad para ejecutar consultas agregadas complejas (e.g. catálogos de cursos con filtros relacionales) y altos costos por operaciones de lectura en barridos globales. Por otro lado, usar una base de datos relacional tradicional para feeds en vivo exigía infraestructura de WebSockets compleja y costosa de mantener en Vercel Serverless.

---

## Decisión de Arquitectura

Se decide implementar una **arquitectura de almacenamiento desacoplada con doble persistencia especializada**:

1. **Turso / libSQL como Sistema de Registro (System of Record - SoR):**
   - Alberga el modelo de datos relacional canónico (`facultades`, `carreras`, `secciones`, `usuarios`, `enrollments`).
   - Gobernado y versionado a través de **Drizzle ORM** con migraciones reproducibles en `drizzle/`.
   - Garantiza consistencia ACID, consultas complejas indexadas y aislamiento de transacciones para operaciones administrativas y de matrícula.

2. **Cloud Firestore como Proyección Operativa Unidireccional (Real-Time Projection):**
   - Alberga las colecciones operativas del aula virtual (`courses/{courseId}/posts`, `calendar`, `grades`).
   - Mantiene una **proyección unidireccional y liviana de inscripciones** (`courses/{courseId}/members/{userId}`) sincronizada desde Turso.
   - Las reglas de seguridad de Firestore (`firestore.rules`) consultan la pertenencia del estudiante a una sección de forma eficiente mediante `exists(/databases/$(database)/documents/courses/$(courseId)/members/$(request.auth.uid))`, habilitando seguridad declarativa a nivel de documento sin acoplarse al motor relacional en cada lectura.

---

## Consecuencias

### Positivas:

- **Integridad Relacional Garantizada:** La matrícula y estructura de cursos universitaria no sufre inconsistencias eventuales.
- **Rendimiento y Reactividad en Tiempo Real:** La experiencia del estudiante en el aula aprovecha los listeners en tiempo real de Firestore (`onSnapshot`) sin sobrecargar la base de datos relacional.
- **Seguridad Bounded y Determinística:** Las reglas de seguridad de Firestore ejecutan validaciones O(1) vía `exists()`, evitando barridos de colecciones completas.
- **Escala de Costos Predecible:** Las lecturas masivas de catálogo se resuelven en Turso a costo de compute relacional fijo, mientras que el consumo de Firestore se limita estrictamente a la actividad interactiva de cada usuario.

### Negativas / Mitigaciones:

- **Doble Escritura en Cambios de Rol / Matrícula:** Cualquier alta o baja de matrícula debe escribir en Turso y proyectar la membresía en Firestore.
  - _Mitigación:_ Se centralizan las mutaciones en endpoints transaccionales (`app/api/admin/`) con reintentos controlados.
