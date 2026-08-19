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

export function materialFolders(course: Course) {
  const units = course.units.flatMap((unit) => {
    const title = unit.title.split("·")[0].trim();
    return title ? [title] : [];
  });
  return [...units, "Certámenes anteriores", "General"];
}

export const DEFAULT_FOLDER = "General";
