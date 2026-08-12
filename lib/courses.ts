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
    teacher: "Aula piloto colaborativa",
    period: `Semestre ${PERIOD}`,
    tone: "#00a6d6",
    eyebrow: "Aula piloto colaborativa",
    headline: "Equilibrio, fricción y propiedades de área y masa",
    summary: "Desarrolla modelos de sistemas mecánicos en equilibrio con análisis riguroso, diagramas de cuerpo libre y notación matemática inmediata.",
    facts: ["6 créditos SCT", "Semestral", "Presencial y digital"],
    units: [
      { title: "RA1 · Sistemas de fuerzas", subtitle: "Vectores, leyes de Newton, resultantes y sistemas equivalentes" },
      { title: "RA2 · Cuerpos rígidos y estructuras", subtitle: "Diagramas de cuerpo libre, reacciones y equilibrio en 2D/3D" },
      { title: "RA3 · Fricción seca", subtitle: "Cuñas, tornillos, correas, descansos y rodadura" },
      { title: "RA4 · Propiedades de área y masa", subtitle: "Centroide, centro de gravedad, inercia y teorema de Steiner" },
    ],
    evaluations: [
      { id: "practica-ra1", name: "Práctica de sistemas de fuerzas", date: "2026-08-18" },
    ],
  },
  {
    id: "edo",
    name: "Ecuaciones Diferenciales",
    code: "EDO",
    teacher: "Banco de estudio",
    period: `Semestre ${PERIOD}`,
    tone: "#0057a4",
    eyebrow: "Aula del curso",
    headline: "Ecuaciones Diferenciales",
    summary: "El banco de certámenes cubre este ramo con desarrollo completo. El aula queda disponible para que el docente publique material y evaluaciones.",
    facts: [],
    units: [],
    evaluations: [],
  },
  {
    id: "estadistica",
    name: "Estadística",
    code: "220318",
    teacher: "Aula de práctica",
    period: `Semestre ${PERIOD}`,
    tone: "#007fc3",
    eyebrow: "Aula del curso",
    headline: "Estadística",
    summary: "El banco de certámenes cubre este ramo con desarrollo completo. El aula queda disponible para que el docente publique material y evaluaciones.",
    facts: [],
    units: [],
    evaluations: [],
  },
  {
    id: "ingles",
    name: "Inglés Comunicacional I",
    code: "340357",
    teacher: "Banco de estudio",
    period: `Semestre ${PERIOD}`,
    tone: "#004d91",
    eyebrow: "Aula del curso",
    headline: "Inglés Comunicacional I",
    summary: "El banco de estudio cubre este ramo. El aula queda disponible para que el docente publique material y evaluaciones.",
    facts: [],
    units: [],
    evaluations: [],
  },
  {
    id: "termodinamica",
    name: "Termodinámica Aplicada",
    code: "440303",
    teacher: "Banco de certámenes",
    period: `Semestre ${PERIOD}`,
    tone: "#e84235",
    eyebrow: "Aula del curso",
    headline: "Termodinámica Aplicada",
    summary: "El banco de certámenes cubre este ramo con desarrollo completo. El aula queda disponible para que el docente publique material y evaluaciones.",
    facts: [],
    units: [],
    evaluations: [
      { id: "test-01", name: "Test 01", date: "2026-09-01" },
      { id: "evaluacion-01", name: "Evaluación 01 · Primera y Segunda ley", date: "2026-10-08" },
      { id: "evaluacion-02", name: "Evaluación 02 · Combustión y ciclos de vapor", date: "2026-11-26" },
    ],
  },
  {
    id: "matlab",
    name: "Programación en Ingeniería",
    code: "MATLAB",
    teacher: "Laboratorio de código",
    period: `Semestre ${PERIOD}`,
    tone: "#ffd100",
    eyebrow: "Aula del curso",
    headline: "Programación en Ingeniería",
    summary: "El laboratorio de código cubre este ramo. El aula queda disponible para que el docente publique material y evaluaciones.",
    facts: [],
    units: [],
    evaluations: [],
  },
];

export function courseById(id: string) {
  return COURSES.find((course) => course.id === id) ?? null;
}

export function materialFolders(course: Course) {
  const units = course.units.map((unit) => unit.title.split("·")[0].trim()).filter(Boolean);
  return [...units, "Certámenes anteriores", "General"];
}

export const DEFAULT_FOLDER = "General";
