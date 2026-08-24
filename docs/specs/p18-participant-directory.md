# P18 — Directorio de participantes por sección (CEO-24)

**Estado:** VERIFICADA  
**Issue:** CEO-24  
**Rama:** `elpapijuaco325/ceo-24-mejorar-la-lista-de-participantes-buscador-roles-y-contacto`  
**Autorización:** el mantenedor solicitó ejecución directa y publicación en PR el 2026-08-23, sin pausas de aprobación intermedias.

## 1. Intención y alcance

La pestaña Participantes deja de depender de una grilla plana y pasa a ser un directorio consultable de la sección abierta. Turso continúa como sistema de registro de matrículas; Firestore no incorpora listeners ni documentos nuevos. El alcance incluye lectura acotada, búsqueda por nombre o correo, separación entre equipo docente, ayudantes y estudiantes, y contacto por correo institucional.

No incluye asignar o revocar el rol `assistant`, mensajería interna, envíos masivos ni cambios en reglas Firebase.

## 2. Requisitos formales

- **REQ-PART-01 (Unwanted Behavior):** IF una solicitud de participantes no tiene una sesión válida ni una matrícula activa en la sección, THEN el sistema SHALL responder `401` o `403` sin revelar nombres, correos ni cantidades; una cuenta `owner` MAY consultar para soporte administrativo.
- **REQ-PART-02 (Event-Driven):** WHEN una persona abre Participantes, busca por nombre o correo, selecciona un rol o solicita la página siguiente, el sistema SHALL consultar Turso con filtros aplicados antes del límite, SHALL devolver como máximo 50 filas y SHALL entregar un cursor estable o `null`.
- **REQ-PART-03 (Ubiquitous):** The system SHALL present participantes in the three visible groups «Equipo docente», «Ayudantes» and «Estudiantes»; `teacher` and `coordinator` SHALL belong to the teaching group while preserving their individual labels.
- **REQ-PART-04 (Optional Feature):** WHERE un participante tiene un correo válido, el sistema SHALL offer an accessible `mailto:` action addressed only to that person and prefilled with the section context; the action SHALL NOT create a platform message or expose a bulk-recipient list.
- **REQ-PART-05 (State-Driven):** WHILE the directory is loading, empty, filtered, paginating or unavailable, the system SHALL expose a visible state and an `aria-live` announcement without replacing the existing safe fallback with a blank screen.
- **REQ-PART-06 (Ubiquitous):** The system SHALL keep search and role filtering on the server, SHALL cap search terms at 80 characters, SHALL disable shared caching of participant responses and SHALL add no unbounded database query or Firestore listener.

## 3. Criterios de aceptación BDD

```gherkin
Scenario: Una matrícula activa consulta el directorio
  Given una sesión autenticada con matrícula activa en la sección abierta
  When solicita la primera página de participantes
  Then recibe como máximo 50 participantes activos
  And la respuesta incluye cantidades por rol y un cursor acotado
  And la respuesta se marca como privada y no almacenable

Scenario: Una cuenta ajena intenta enumerar una sección
  Given una sesión autenticada sin matrícula activa en la sección
  When solicita el directorio
  Then la respuesta es 403
  And la respuesta no contiene nombres, correos ni cantidades

Scenario: La búsqueda alcanza una nómina grande
  Given una sección con 300 participantes activos
  When la persona busca una parte de un nombre o correo
  Then el filtro se aplica en Turso antes de la paginación
  And la interfaz muestra sólo coincidencias de esa búsqueda
  And puede solicitar la página siguiente sin duplicar filas

Scenario: Los roles son distinguibles
  Given una página con docentes, coordinación, ayudantes y estudiantes
  When se presenta el directorio
  Then docentes y coordinación aparecen bajo Equipo docente
  And ayudantes aparecen bajo Ayudantes
  And estudiantes aparecen bajo Estudiantes
  And cada fila conserva su rótulo de rol exacto

Scenario: Contacto individual
  Given un participante con correo institucional válido
  When se activa Escribir correo
  Then se abre un enlace mailto dirigido sólo a ese correo
  And el asunto identifica el código y la sección del ramo

Scenario: Falla de infraestructura
  Given que Turso no responde
  When la pestaña intenta cargar el directorio
  Then se conserva el padrón seguro ya disponible en el aula
  And se anuncia que el directorio completo no pudo cargarse
  And se ofrece reintentar sin recargar toda la aplicación
```

## 4. Diseño técnico

```mermaid
flowchart LR
  UI[PeopleSection cliente] -->|GET q role cursor limit| API[/api/sections/sectionId/participants]
  API --> Auth[getSessionUser]
  API --> Membership[matrícula activa u owner]
  Membership --> Catalog[academic-catalog]
  Catalog --> DB[(Turso users + matriculas)]
  DB --> API
  API -->|items counts nextCursor no-store| UI
  UI --> Mail[mailto individual]
```

### 4.1 Contratos

```ts
type ParticipantDirectoryEntry = {
  id: string;
  name: string;
  email: string;
  role: "teacher" | "coordinator" | "assistant" | "student";
};

type ParticipantDirectoryPage = {
  items: ParticipantDirectoryEntry[];
  counts: Record<ParticipantDirectoryEntry["role"], number>;
  nextCursor: string | null;
};
```

Parámetros GET: `q` (0–80), `role` (`all | teaching | assistant | student`), `cursor` (opaco para la interfaz) y `limit` (1–50 en esta ruta). No hay mutaciones, tablas, migraciones, reglas ni dependencias nuevas.

### 4.2 Errores

| Condición                      | Estado | Respuesta                       | Reintento             |
| :----------------------------- | :----: | :------------------------------ | :-------------------- |
| Sin sesión                     |  401   | `{ error }`                     | Tras iniciar sesión   |
| Sin matrícula                  |  403   | `{ error }`                     | No automático         |
| Sección o parámetros inválidos |  400   | `{ error }`                     | Corregir solicitud    |
| Turso no disponible            |  500   | `{ error }` sin detalle interno | Manual desde la vista |

### 4.3 Seguridad, privacidad y rendimiento

- La autorización deriva de `getSessionUser` y de `matriculas`; no se aceptan roles del cliente.
- El correo sólo llega a una sesión admitida en la sección o a `owner`, y la respuesta usa `Cache-Control: private, no-store`.
- La consulta parte por `seccionId + estado`, aprovecha `idx_matriculas_seccion_estado`, aplica búsqueda/rol antes de `.limit()` y conserva paginación por cursor.
- El cliente solicita 24 filas por página, cancela solicitudes reemplazadas y no abre listeners en tiempo real.
- La búsqueda, los controles y los enlaces mantienen objetivo táctil de 44 px, foco visible, nombre accesible y anuncios de estado.

### 4.4 Invariantes preservadas

| Invariante                  | Tratamiento                                                                          |
| :-------------------------- | :----------------------------------------------------------------------------------- |
| Identidad y roles           | No cambia `roleForEmail`; consume el rol de matrícula existente.                     |
| Aislamiento por sección     | La API verifica matrícula activa antes de consultar el padrón.                       |
| Turso / Firestore           | Turso es la única fuente del directorio; cero lecturas o escrituras Firebase nuevas. |
| Escala                      | Búsqueda servidor, consultas acotadas, cursor y 24 filas iniciales.                  |
| Independencia institucional | No cambia marca, descargos ni insignias de tienda.                                   |

## 5. DAG de ejecución

- [x] **TASK-01 — REQ-PART-01, REQ-PART-02, REQ-PART-06.** Ampliar el catálogo y exponer la ruta autenticada. Verificar: `pnpm run typecheck`.
- [x] **TASK-02 — REQ-PART-03, REQ-PART-04, REQ-PART-05.** Implementar contrato cliente, búsqueda, grupos, contacto y estados responsive. Verificar: prueba focal y lint.
- [x] **TASK-03 — REQ-PART-01…06.** Añadir pruebas de contrato, parser y UI, registrar hash. Verificar: `pnpm run verify:fast`.
- [x] **TASK-04 — REQ-PART-01…06.** Ejecutar invariantes, formato, lint y suite integral. Verificar: `pnpm run verify:invariants`, `pnpm run format:check`, `pnpm run lint`, `pnpm test`.
- [x] **TASK-05 — REQ-PART-01…06.** Actualizar handoff y publicar rama/PR en español. Verificar: rama publicada y PR [#74](https://github.com/CEOUBB/CEOUBB/pull/74) abierto.

## 6. Trazabilidad

| Requisito   | Símbolos / superficies                           | Evidencia                                 |
| :---------- | :----------------------------------------------- | :---------------------------------------- |
| REQ-PART-01 | ruta `participants`, `activeSectionRoleForUser`  | prueba de contrato de autorización        |
| REQ-PART-02 | `listSectionRoster`, parámetros de directorio    | pruebas de límites, búsqueda y cursor     |
| REQ-PART-03 | `participantGroupForRole`, `PeopleSection`       | prueba de agrupación y render contractual |
| REQ-PART-04 | `participantContactHref`, acción Escribir correo | prueba de destinatario único y asunto     |
| REQ-PART-05 | estados y reintento de `PeopleSection`           | prueba de superficie y QA visual          |
| REQ-PART-06 | consulta acotada, `no-store`, aborto cliente     | prueba de contrato y suite integral       |

## 7. Evidencia de verificación

- `pnpm run verify:fast`: 253/253 pruebas, 32 hashes y 14 especificaciones OpenSpec.
- `pnpm run verify:invariants`: 31/31 y reglas Firebase válidas.
- `pnpm run format:check`, `pnpm run lint`, `pnpm run check:functions`: limpios.
- `pnpm test`: build de Next.js 16.3 y 278/278 pruebas.
- QA local con 304 matrículas: búsqueda, filtros, agrupación, contacto y carga 24 → 48; respuestas autenticada `200` y anónima `401`; escritorio y 390 × 844 sin overflow ni errores; Axe sobre el directorio con 0 infracciones y 0 resultados incompletos.
- React Doctor: una advertencia revisada por carga autenticada dentro de un efecto; el efecto cancela solicitudes reemplazadas con `AbortController` y descarta respuestas obsoletas mediante versión de solicitud.
