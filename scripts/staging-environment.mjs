export const STAGING_REQUIREMENTS = [
  "Implements: REQ-STG-01",
  "Implements: REQ-STG-02",
  "Implements: REQ-STG-06",
];

const createdAt = "2026-08-01T00:00:00.000Z";

export const STAGING_FIXTURES = Object.freeze({
  users: [
    {
      id: "firebase:staging-teacher",
      email: "staging-teacher@example.invalid",
      name: "Docente de prueba",
      role: "teacher",
      createdAt,
    },
    ...Array.from({ length: 3 }, (_, index) => ({
      id: `firebase:staging-student-${index + 1}`,
      email: `staging-student-${index + 1}@example.invalid`,
      name: `Estudiante de prueba ${index + 1}`,
      role: "student",
      createdAt,
    })),
  ],
  faculties: [{ id: "staging-fac-ingenieria", nombre: "Facultad sintética", sede: "Concepcion" }],
  departments: [
    {
      id: "staging-dep-ciencias",
      facultadId: "staging-fac-ingenieria",
      nombre: "Departamento sintético",
    },
  ],
  careers: [
    {
      id: "staging-car-001",
      departamentoId: "staging-dep-ciencias",
      codigo: "STG-001",
      nombre: "Carrera de pruebas",
    },
  ],
  subjects: [
    {
      id: "staging-asig-001",
      codigo: "STG101",
      nombre: "Fundamentos de entorno seguro",
      creditosSct: 5,
      departamentoId: "staging-dep-ciencias",
    },
    {
      id: "staging-asig-002",
      codigo: "STG102",
      nombre: "Validación de infraestructura",
      creditosSct: 5,
      departamentoId: "staging-dep-ciencias",
    },
  ],
  periods: [
    {
      id: "staging-periodo-2026-2",
      nombre: "Segundo semestre sintético 2026",
      fechaInicio: "2026-08-01",
      fechaFin: "2026-12-31",
      estado: "abierto",
    },
  ],
  sections: [
    {
      id: "staging-sec-001",
      asignaturaId: "staging-asig-001",
      periodoId: "staging-periodo-2026-2",
      numeroSeccion: 1,
      docenteId: "firebase:staging-teacher",
      createdAt,
    },
    {
      id: "staging-sec-002",
      asignaturaId: "staging-asig-002",
      periodoId: "staging-periodo-2026-2",
      numeroSeccion: 1,
      docenteId: "firebase:staging-teacher",
      createdAt,
    },
  ],
  enrollments: ["staging-sec-001", "staging-sec-002"].flatMap((seccionId) => [
    {
      id: `${seccionId}-teacher`,
      seccionId,
      usuarioId: "firebase:staging-teacher",
      rolSeccion: "teacher",
      estado: "activa",
      createdAt,
    },
    ...Array.from({ length: 3 }, (_, index) => ({
      id: `${seccionId}-student-${index + 1}`,
      seccionId,
      usuarioId: `firebase:staging-student-${index + 1}`,
      rolSeccion: "student",
      estado: "activa",
      createdAt,
    })),
  ]),
  postsPerSection: 2,
  gradesPerSection: 3,
});

export function fixtureCounts(fixtures = STAGING_FIXTURES) {
  return {
    users: fixtures.users.length,
    sections: fixtures.sections.length,
    enrollments: fixtures.enrollments.length,
    firestoreWrites:
      fixtures.users.length +
      fixtures.enrollments.length +
      fixtures.sections.length * fixtures.postsPerSection +
      fixtures.sections.length +
      fixtures.sections.length * fixtures.gradesPerSection,
  };
}

export function assertStagingTargets({ environment, firebaseProjectId, tursoDatabaseUrl }) {
  if (environment?.trim().toLowerCase() !== "staging") {
    throw new Error("STAGING_ENV_REQUIRED: CEOUBB_ENVIRONMENT debe ser staging.");
  }
  if (!firebaseProjectId || !tursoDatabaseUrl) {
    throw new Error("STAGING_CONFIG_INCOMPLETE: faltan FIREBASE_PROJECT_ID o TURSO_DATABASE_URL.");
  }
  if (firebaseProjectId.trim() !== "centro-de-estudio-ubb-staging") {
    throw new Error("PRODUCTION_TARGET_REJECTED: FIREBASE_PROJECT_ID no identifica staging.");
  }
  let parsed;
  try {
    parsed = new URL(tursoDatabaseUrl);
  } catch {
    throw new Error("STAGING_CONFIG_INCOMPLETE: TURSO_DATABASE_URL no es una URL válida.");
  }
  if (!parsed.hostname.toLowerCase().includes("ceoubb-staging")) {
    throw new Error("PRODUCTION_TARGET_REJECTED: TURSO_DATABASE_URL no identifica staging.");
  }
  return { firebaseProjectId: firebaseProjectId.trim(), tursoDatabaseUrl: parsed.toString() };
}
