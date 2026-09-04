/*
  Los fixtures de staging (scripts/staging-environment.mjs) están sellados por
  contrato: todo usuario debe llevar id `firebase:staging-*` y correo
  `@example.invalid`, y ninguna cadena puede parecerse a un dominio
  institucional. Ese guardarraíl existe para que nadie confunda datos de prueba
  con personas reales, y no se toca.

  El ramo de demostración de las previews necesita justo lo contrario: colgar de
  las cuentas `dev:teacher-demo` y `dev:student-demo` que expone el login de
  desarrollo, cuyos correos sí imitan el dominio UBB para ejercitar la
  derivación de roles. Por eso vive en su propio módulo, con su propio guardián
  de objetivo, en vez de ensanchar el conjunto sellado.
*/
// Implements: REQ-STG-01, REQ-AUTH-05

const createdAt = "2026-08-01T00:00:00.000Z";

export const DEMO_TEACHER_ID = "dev:teacher-demo";
export const DEMO_STUDENT_ID = "dev:student-demo";

/* La sección poblada y la vacía comparten catálogo: la diferencia entre ambas
   es sólo el contenido, para poder comparar un aula con datos contra sus
   estados vacíos en la misma preview. */
export const DEMO_FULL_SECTION = "demo-sec-mec220-1";
export const DEMO_EMPTY_SECTION = "demo-sec-mec210-1";

export const DEMO_FIXTURES = Object.freeze({
  users: [
    {
      id: DEMO_TEACHER_ID,
      email: "docente.demo@ubiobio.cl",
      name: "Docente Demo",
      role: "teacher",
      createdAt,
    },
    {
      id: DEMO_STUDENT_ID,
      email: "estudiante.demo@alumnos.ubiobio.cl",
      name: "Estudiante Demo",
      role: "student",
      createdAt,
    },
    ...Array.from({ length: 3 }, (_, index) => ({
      id: `dev:student-demo-${index + 1}`,
      email: `estudiante.demo${index + 1}@alumnos.ubiobio.cl`,
      name: `Estudiante Demo ${index + 1}`,
      role: "student",
      createdAt,
    })),
  ],
  faculties: [{ id: "demo-fac-ingenieria", nombre: "Facultad de Ingeniería", sede: "Concepcion" }],
  departments: [
    {
      id: "demo-dep-mecanica",
      facultadId: "demo-fac-ingenieria",
      nombre: "Departamento de Ingeniería Mecánica",
    },
  ],
  careers: [
    {
      id: "demo-car-mecanica",
      departamentoId: "demo-dep-mecanica",
      codigo: "29017",
      nombre: "Ingeniería Civil Mecánica",
    },
  ],
  subjects: [
    {
      id: "demo-asig-fluidos",
      codigo: "MEC220",
      nombre: "Mecánica de Fluidos",
      creditosSct: 6,
      departamentoId: "demo-dep-mecanica",
    },
    {
      id: "demo-asig-termo",
      codigo: "MEC210",
      nombre: "Termodinámica I",
      creditosSct: 5,
      departamentoId: "demo-dep-mecanica",
    },
  ],
  periods: [
    {
      id: "demo-periodo-2026-2",
      nombre: "Segundo Semestre 2026",
      fechaInicio: "2026-08-01",
      fechaFin: "2026-12-31",
      estado: "abierto",
    },
  ],
  sections: [
    {
      id: DEMO_FULL_SECTION,
      asignaturaId: "demo-asig-fluidos",
      periodoId: "demo-periodo-2026-2",
      numeroSeccion: 1,
      docenteId: DEMO_TEACHER_ID,
      createdAt,
    },
    {
      id: DEMO_EMPTY_SECTION,
      asignaturaId: "demo-asig-termo",
      periodoId: "demo-periodo-2026-2",
      numeroSeccion: 1,
      docenteId: DEMO_TEACHER_ID,
      createdAt,
    },
  ],
  profiles: [
    {
      seccionId: DEMO_FULL_SECTION,
      title: "Mecánica de Fluidos",
      description: "Estudio del comportamiento estático y dinámico de fluidos newtonianos.",
      modality: "presencial",
      room: "Lab Fluidos",
      tone: "emerald",
      updatedAt: createdAt,
    },
    {
      seccionId: DEMO_EMPTY_SECTION,
      title: "Termodinámica I",
      description: "Sección recién creada, sin material publicado todavía.",
      modality: "presencial",
      room: "G-102",
      tone: "sky",
      updatedAt: createdAt,
    },
  ],
  /* La sección vacía sólo matricula al docente: sin estudiantes, el libro de
     notas, el progreso y la bandeja de corrección muestran sus estados vacíos. */
  enrollments: [
    {
      id: `${DEMO_FULL_SECTION}-teacher`,
      seccionId: DEMO_FULL_SECTION,
      usuarioId: DEMO_TEACHER_ID,
      rolSeccion: "teacher",
      estado: "activa",
      createdAt,
    },
    {
      id: `${DEMO_FULL_SECTION}-student-demo`,
      seccionId: DEMO_FULL_SECTION,
      usuarioId: DEMO_STUDENT_ID,
      rolSeccion: "student",
      estado: "activa",
      createdAt,
    },
    ...Array.from({ length: 3 }, (_, index) => ({
      id: `${DEMO_FULL_SECTION}-student-${index + 1}`,
      seccionId: DEMO_FULL_SECTION,
      usuarioId: `dev:student-demo-${index + 1}`,
      rolSeccion: "student",
      estado: "activa",
      createdAt,
    })),
    {
      id: `${DEMO_EMPTY_SECTION}-teacher`,
      seccionId: DEMO_EMPTY_SECTION,
      usuarioId: DEMO_TEACHER_ID,
      rolSeccion: "teacher",
      estado: "activa",
      createdAt,
    },
  ],
  evaluations: [
    { id: "demo-eval-certamen-1", name: "Certamen 1", weight: 35 },
    { id: "demo-eval-certamen-2", name: "Certamen 2", weight: 35 },
    { id: "demo-eval-laboratorio", name: "Informes de laboratorio", weight: 30 },
  ],
  posts: [
    {
      id: "demo-post-bienvenida",
      kind: "announcement",
      title: "Bienvenidos a Mecánica de Fluidos",
      body: "Las clases comienzan la primera semana de agosto en el Laboratorio de Fluidos. Revisen el programa antes de la primera sesión.",
      folder: "Avisos",
    },
    {
      id: "demo-post-guia",
      kind: "guide",
      title: "Guía 1: estática de fluidos",
      body: "Ejercicios de presión hidrostática y fuerzas sobre superficies sumergidas. Se resuelve en la ayudantía de la semana 3.",
      folder: "Guías",
    },
    {
      id: "demo-post-certamen",
      kind: "assessment",
      title: "Certamen 1",
      body: "Cubre estática de fluidos y ecuación de continuidad. Se rinde en la sala G-102.",
      folder: "Evaluaciones",
      dueDate: "2026-09-15",
    },
  ],
});

export function demoFixtureCounts(fixtures = DEMO_FIXTURES) {
  const students = fixtures.enrollments.filter((item) => item.rolSeccion === "student");
  return {
    users: fixtures.users.length,
    sections: fixtures.sections.length,
    enrollments: fixtures.enrollments.length,
    firestoreWrites:
      fixtures.users.length +
      fixtures.enrollments.length +
      fixtures.posts.length +
      1 +
      students.length,
  };
}

/*
  El guardián acepta preview y staging porque ambos entornos comparten la misma
  base y el mismo proyecto Firebase, y rechaza cualquier objetivo que huela a
  producción antes de escribir una sola fila.
*/
// Implements: REQ-STG-01
export function assertDemoTargets({ environment, firebaseProjectId, tursoDatabaseUrl }) {
  const normalized = environment?.trim().toLowerCase();
  if (normalized !== "preview" && normalized !== "staging") {
    throw new Error("PREVIEW_ENV_REQUIRED: CEOUBB_ENVIRONMENT debe ser preview o staging.");
  }
  if (!firebaseProjectId || !tursoDatabaseUrl) {
    throw new Error("PREVIEW_CONFIG_INCOMPLETE: faltan FIREBASE_PROJECT_ID o TURSO_DATABASE_URL.");
  }
  if (firebaseProjectId.trim() !== "centro-de-estudio-ubb-staging") {
    throw new Error("PRODUCTION_TARGET_REJECTED: FIREBASE_PROJECT_ID no identifica staging.");
  }
  let parsed;
  try {
    parsed = new URL(tursoDatabaseUrl);
  } catch {
    throw new Error("PREVIEW_CONFIG_INCOMPLETE: TURSO_DATABASE_URL no es una URL válida.");
  }
  if (!parsed.hostname.toLowerCase().includes("ceoubb-staging")) {
    throw new Error("PRODUCTION_TARGET_REJECTED: TURSO_DATABASE_URL no identifica staging.");
  }
  return { firebaseProjectId: firebaseProjectId.trim(), tursoDatabaseUrl: parsed.toString() };
}
