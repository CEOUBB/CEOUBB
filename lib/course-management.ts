import type { GradeItem } from "./grades.ts";
import type { Course } from "./courses.ts";

export const COURSE_MODALITIES = ["presencial", "hibrida", "remota"] as const;
export const COURSE_TONES = ["sky", "emerald", "gold", "red", "teal", "purple"] as const;

export type CourseModality = (typeof COURSE_MODALITIES)[number];
export type CourseTone = (typeof COURSE_TONES)[number];
export type CourseSectionRole = "teacher" | "student" | "assistant" | "coordinator";

export type CreateTeacherCourseInput = {
  code: string;
  name: string;
  creditsSct: number;
  departmentId: string;
  periodId: string;
  sectionNumber: number;
  summary: string;
  modality: CourseModality;
  room: string;
  tone: CourseTone;
};

export type UpdateTeacherCourseInput = Partial<
  Pick<CreateTeacherCourseInput, "summary" | "modality" | "room" | "tone">
> & {
  title?: string;
};

export type AssistantInput = { email: string };

export type ManagedCourse = Course & {
  role: CourseSectionRole;
  modality: CourseModality;
  room: string;
  toneKey: CourseTone;
  creditsSct: number;
  departmentId: string;
  periodId: string;
  canManage: boolean;
};

export type CourseCatalogOption = { id: string; label: string };

export type TeacherCourseCatalog = {
  departments: CourseCatalogOption[];
  periods: CourseCatalogOption[];
};

export type CoursePage = {
  items: ManagedCourse[];
  nextCursor: string | null;
};

export type CourseAssistant = {
  userId: string;
  name: string;
  email: string;
};

const TONE_VALUES: Record<CourseTone, string> = {
  sky: "#38bdf8",
  emerald: "#10b981",
  gold: "#f59e0b",
  red: "#e31b23",
  teal: "#0d9488",
  purple: "#8b5cf6",
};

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} no tiene un formato válido.`);
  }
  return value as Record<string, unknown>;
}

function text(
  value: unknown,
  label: string,
  options: { min?: number; max: number; optional?: boolean }
): string {
  if (typeof value !== "string") throw new Error(`${label} no es válido.`);
  const normalized = value.trim();
  if (!normalized && options.optional) return "";
  if (normalized.length < (options.min ?? 1) || normalized.length > options.max) {
    throw new Error(`${label} no es válido.`);
  }
  return normalized;
}

function id(value: unknown, label: string): string {
  const normalized = text(value, label, { max: 128 });
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(normalized)) {
    throw new Error(`${label} no es válido.`);
  }
  return normalized;
}

function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} no es válido.`);
  }
  return value;
}

function enumValue<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`${label} no es válido.`);
  }
  return value as T;
}

function assertKeys(input: Record<string, unknown>, allowed: readonly string[]): void {
  const allowedKeys = new Set(allowed);
  const unexpected = Object.keys(input).find((key) => !allowedKeys.has(key));
  if (unexpected) throw new Error(`El campo ${unexpected} no pertenece a la ficha del ramo.`);
}

export function parseCreateTeacherCourseInput(value: unknown): CreateTeacherCourseInput {
  const input = record(value, "La ficha del ramo");
  assertKeys(input, [
    "code",
    "name",
    "creditsSct",
    "departmentId",
    "periodId",
    "sectionNumber",
    "summary",
    "modality",
    "room",
    "tone",
  ]);
  const code = text(input.code, "El código del ramo", { min: 2, max: 24 }).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9 ._-]{0,23}$/.test(code)) {
    throw new Error("El código del ramo no es válido.");
  }
  return {
    code,
    name: text(input.name, "El nombre del ramo", { min: 2, max: 120 }),
    creditsSct: integer(input.creditsSct, "Los créditos SCT", 0, 30),
    departmentId: id(input.departmentId, "El departamento"),
    periodId: id(input.periodId, "El período"),
    sectionNumber: integer(input.sectionNumber, "El número de sección", 1, 99),
    summary: text(input.summary, "La descripción", { max: 2000, optional: true }),
    modality: enumValue(input.modality, COURSE_MODALITIES, "La modalidad"),
    room: text(input.room, "La sala", { max: 80, optional: true }),
    tone: enumValue(input.tone, COURSE_TONES, "El color académico"),
  };
}

export function parseUpdateTeacherCourseInput(value: unknown): UpdateTeacherCourseInput {
  const input = record(value, "La actualización del ramo");
  assertKeys(input, ["title", "summary", "modality", "room", "tone"]);
  const result: UpdateTeacherCourseInput = {};
  if ("title" in input)
    result.title = text(input.title, "El título del ramo", { min: 2, max: 120 });
  if ("summary" in input)
    result.summary = text(input.summary, "La descripción", { max: 2000, optional: true });
  if ("modality" in input)
    result.modality = enumValue(input.modality, COURSE_MODALITIES, "La modalidad");
  if ("room" in input) result.room = text(input.room, "La sala", { max: 80, optional: true });
  if ("tone" in input) result.tone = enumValue(input.tone, COURSE_TONES, "El color académico");
  if (Object.keys(result).length === 0) throw new Error("La ficha no contiene ningún cambio.");
  return result;
}

export function parseAssistantInput(value: unknown): AssistantInput {
  const input = record(value, "La ayudantía");
  assertKeys(input, ["email"]);
  const email = text(input.email, "El correo institucional", { max: 254 }).toLowerCase();
  if (!/^[^@\s]+@alumnos\.ubiobio\.cl$/.test(email)) {
    throw new Error("Usa el correo institucional @alumnos.ubiobio.cl de la ayudante.");
  }
  return { email };
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sectionIdFor(code: string, periodId: string, sectionNumber: number): string {
  const codePart = slug(code).slice(0, 32) || "ramo";
  const periodPart = slug(periodId).slice(0, 20) || "periodo";
  return `${codePart}-${periodPart}-s${Math.max(1, Math.trunc(sectionNumber))}`
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export function courseToneValue(tone: CourseTone): string {
  return TONE_VALUES[tone];
}

export function modalityLabel(modality: CourseModality): string {
  return modality === "hibrida" ? "Híbrida" : modality === "remota" ? "Remota" : "Presencial";
}

export function gradeSchemeError(
  items: readonly GradeItem[],
  exemption: number | null
): string | null {
  if (items.length === 0) return "Agrega al menos una evaluación.";
  const ids = new Set<string>();
  let total = 0;
  for (const item of items) {
    if (!item.id || ids.has(item.id)) return "Cada evaluación debe tener un identificador único.";
    ids.add(item.id);
    if (!item.name.trim() || item.name.trim().length > 120) {
      return "Cada evaluación necesita un nombre válido.";
    }
    if (!Number.isFinite(item.weight) || item.weight <= 0 || item.weight > 100) {
      return "Cada ponderación debe estar entre 0 y 100%.";
    }
    if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      return "Revisa la fecha de cada evaluación.";
    }
    total += item.weight;
  }
  if (Math.round(total * 10) !== 1000) return "La ponderación total debe sumar 100%.";
  if (
    typeof exemption !== "number" ||
    !Number.isFinite(exemption) ||
    exemption < 1 ||
    exemption > 7
  ) {
    return "La nota de eximición debe estar entre 1,0 y 7,0.";
  }
  return null;
}
