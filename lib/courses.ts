import { isSectionId, isSectionRole, type SectionRole } from "./section-roles.ts";

export type CourseUnit = {
  title: string;
  subtitle: string;
};

export type CourseEvaluation = {
  id: string;
  name: string;
  date: string;
};

export type Course = {
  id: string;
  name: string;
  code: string;
  section: string;
  teacher: string;
  period: string;
  tone: string;
  eyebrow: string;
  headline: string;
  summary: string;
  facts: string[];
  units: CourseUnit[];
  evaluations: CourseEvaluation[];
  periodId?: string;
  periodStatus?: PeriodStatus;
  readOnly?: boolean;
  sectionRole?: SectionRole;
};

export const PERIOD_STATUSES = ["abierto", "cerrado", "archivado"] as const;

export type PeriodStatus = (typeof PERIOD_STATUSES)[number];

export type AcademicSectionSummary = {
  seccionId: string;
  asignaturaCodigo: string;
  asignaturaNombre: string;
  periodoId: string;
  periodoNombre: string;
  periodoEstado: PeriodStatus;
  numeroSeccion: number;
  docenteId: string;
  docenteNombre: string;
  rolSeccion: SectionRole;
};

export const PERIOD = "2026-2";

export const COURSES: Course[] = [
  {
    id: "estatica",
    name: "Estática",
    code: "440299",
    section: "1",
    teacher: "Aula piloto colaborativa",
    period: `Semestre ${PERIOD}`,
    tone: "#38bdf8",
    eyebrow: "Aula piloto colaborativa",
    headline: "Estática",
    summary:
      "Cuatro resultados de aprendizaje: sistemas de fuerzas, equilibrio de cuerpos rígidos, fricción seca y propiedades de área y masa.",
    facts: ["6 créditos SCT", "Semestral", "Presencial y digital"],
    units: [
      {
        title: "RA1 · Sistemas de fuerzas",
        subtitle: "Vectores, leyes de Newton, resultantes y sistemas equivalentes",
      },
      {
        title: "RA2 · Cuerpos rígidos y estructuras",
        subtitle: "Diagramas de cuerpo libre, reacciones y equilibrio en 2D/3D",
      },
      { title: "RA3 · Fricción seca", subtitle: "Cuñas, tornillos, correas, descansos y rodadura" },
      {
        title: "RA4 · Propiedades de área y masa",
        subtitle: "Centroide, centro de gravedad, inercia y teorema de Steiner",
      },
    ],
    evaluations: [
      { id: "practica-ra1", name: "Práctica de sistemas de fuerzas", date: "2026-08-18" },
    ],
  },
  {
    id: "edo",
    name: "Ecuaciones Diferenciales",
    code: "EDO",
    section: "1",
    teacher: "Biblioteca académica",
    period: `Semestre ${PERIOD}`,
    // Implements: REQ-DELIB-07
    tone: "oklch(0.62 0.22 300)",
    eyebrow: "Aula del curso",
    headline: "Ecuaciones Diferenciales",
    summary:
      "La biblioteca académica cubre este ramo con desarrollo completo. El aula queda disponible para que el docente publique material y evaluaciones.",
    facts: [],
    units: [],
    evaluations: [],
  },
  {
    id: "estadistica",
    name: "Estadística",
    code: "220318",
    section: "1",
    teacher: "Aula de práctica",
    period: `Semestre ${PERIOD}`,
    tone: "#10b981",
    eyebrow: "Aula del curso",
    headline: "Estadística",
    summary:
      "La biblioteca académica cubre este ramo con desarrollo completo. El aula queda disponible para que el docente publique material y evaluaciones.",
    facts: [],
    units: [],
    evaluations: [],
  },
  {
    id: "ingles",
    name: "Inglés Comunicacional I",
    code: "340357",
    section: "1",
    teacher: "Biblioteca académica",
    period: `Semestre ${PERIOD}`,
    tone: "#ec4899",
    eyebrow: "Aula del curso",
    headline: "Inglés Comunicacional I",
    summary:
      "La biblioteca académica cubre este ramo. El aula queda disponible para que el docente publique material y evaluaciones.",
    facts: [],
    units: [],
    evaluations: [],
  },
  {
    id: "termodinamica",
    name: "Termodinámica Aplicada",
    code: "440303",
    section: "1",
    teacher: "Biblioteca académica",
    period: `Semestre ${PERIOD}`,
    tone: "#e31b23",
    eyebrow: "Aula del curso",
    headline: "Termodinámica Aplicada",
    summary:
      "La biblioteca académica cubre este ramo con desarrollo completo. El aula queda disponible para que el docente publique material y evaluaciones.",
    facts: [],
    units: [],
    evaluations: [
      { id: "test-01", name: "Test 01", date: "2026-09-01" },
      { id: "evaluacion-01", name: "Evaluación 01 · Primera y Segunda ley", date: "2026-10-08" },
      {
        id: "evaluacion-02",
        name: "Evaluación 02 · Combustión y ciclos de vapor",
        date: "2026-11-26",
      },
    ],
  },
  {
    id: "matlab",
    name: "Programación en Ingeniería",
    code: "MATLAB",
    section: "1",
    teacher: "Laboratorio de código",
    period: `Semestre ${PERIOD}`,
    tone: "#f59e0b",
    eyebrow: "Aula del curso",
    headline: "Programación en Ingeniería",
    summary:
      "El laboratorio de código cubre este ramo. El aula queda disponible para que el docente publique material y evaluaciones.",
    facts: [],
    units: [],
    evaluations: [],
  },
];

export function courseById(id: string) {
  return COURSES.find((course) => course.id === id) ?? null;
}

export function parseAcademicSections(value: unknown): AcademicSectionSummary[] {
  if (!Array.isArray(value)) return [];
  const sections = new Map<string, AcademicSectionSummary>();
  const duplicates = new Set<string>();

  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const input = item as Partial<AcademicSectionSummary>;
    const valid =
      isSectionId(input.seccionId) &&
      typeof input.asignaturaCodigo === "string" &&
      input.asignaturaCodigo.trim().length > 0 &&
      typeof input.asignaturaNombre === "string" &&
      input.asignaturaNombre.trim().length > 0 &&
      isSectionId(input.periodoId) &&
      typeof input.periodoNombre === "string" &&
      input.periodoNombre.trim().length > 0 &&
      PERIOD_STATUSES.includes(input.periodoEstado as PeriodStatus) &&
      Number.isInteger(input.numeroSeccion) &&
      Number(input.numeroSeccion) > 0 &&
      typeof input.docenteId === "string" &&
      input.docenteId.length > 0 &&
      typeof input.docenteNombre === "string" &&
      input.docenteNombre.trim().length > 0 &&
      isSectionRole(input.rolSeccion);
    if (!valid || duplicates.has(input.seccionId as string)) continue;
    if (sections.has(input.seccionId as string)) {
      sections.delete(input.seccionId as string);
      duplicates.add(input.seccionId as string);
      continue;
    }
    sections.set(input.seccionId as string, input as AcademicSectionSummary);
  }

  return [...sections.values()];
}

export function courseFromAcademicSection(section: AcademicSectionSummary): Course {
  const template = COURSES.find(
    (course) =>
      course.id === section.seccionId ||
      course.code.toLocaleLowerCase("es-CL") === section.asignaturaCodigo.toLocaleLowerCase("es-CL")
  );
  const tone = template?.tone ?? courseTone(section.asignaturaCodigo);
  const readOnly = section.periodoEstado !== "abierto";
  return {
    id: section.seccionId,
    name: section.asignaturaNombre,
    code: section.asignaturaCodigo,
    section: String(section.numeroSeccion),
    teacher: section.docenteNombre,
    period: section.periodoNombre,
    tone,
    eyebrow: readOnly ? "Ramo archivado" : (template?.eyebrow ?? "Aula del curso"),
    headline: section.asignaturaNombre,
    summary:
      template?.summary ??
      "Aula académica de la sección con materiales, evaluaciones y seguimiento del período.",
    facts: template?.facts ?? [],
    units: template?.units ?? [],
    evaluations: template?.evaluations ?? [],
    periodId: section.periodoId,
    periodStatus: section.periodoEstado,
    readOnly,
    sectionRole: section.rolSeccion,
  };
}

export function partitionAcademicCourses(sections: readonly AcademicSectionSummary[]) {
  const current: Course[] = [];
  const archived: Course[] = [];
  for (const section of sections) {
    const course = courseFromAcademicSection(section);
    if (course.readOnly) archived.push(course);
    else current.push(course);
  }
  return { current, archived };
}

function courseTone(code: string): string {
  const tones = ["#38bdf8", "#10b981", "#f59e0b", "#e31b23", "#8b5cf6", "#0d9488"];
  const index = [...code].reduce((total, character) => total + character.codePointAt(0)!, 0);
  return tones[index % tones.length];
}

export function materialFolders(course: Course) {
  const units = course.units.flatMap((unit) => {
    const title = unit.title.split("·")[0].trim();
    return title ? [title] : [];
  });
  return [...units, "Certámenes anteriores", "General"];
}

export const DEFAULT_FOLDER = "General";
