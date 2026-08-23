import type {
  CourseAssistant,
  CourseCatalogOption,
  CreateTeacherCourseInput,
  ManagedCourse,
  TeacherCourseCatalog,
  UpdateTeacherCourseInput,
} from "./course-management.ts";

export type TeacherWorkspaceData = {
  courses: ManagedCourse[];
  nextCursor: string | null;
  catalog: TeacherCourseCatalog;
};

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function managedCourse(value: unknown): ManagedCourse | null {
  const item = object(value);
  if (!item) return null;
  const requiredStrings = [
    "id",
    "name",
    "code",
    "section",
    "teacher",
    "period",
    "tone",
    "eyebrow",
    "headline",
    "summary",
    "role",
    "modality",
    "room",
    "toneKey",
    "departmentId",
    "periodId",
  ];
  if (requiredStrings.some((key) => typeof item[key] !== "string")) return null;
  if (typeof item.creditsSct !== "number" || typeof item.canManage !== "boolean") return null;
  return {
    id: item.id as string,
    name: item.name as string,
    code: item.code as string,
    section: item.section as string,
    teacher: item.teacher as string,
    period: item.period as string,
    tone: item.tone as string,
    eyebrow: item.eyebrow as string,
    headline: item.headline as string,
    summary: item.summary as string,
    facts: strings(item.facts),
    units: [],
    evaluations: [],
    role: item.role as ManagedCourse["role"],
    modality: item.modality as ManagedCourse["modality"],
    room: item.room as string,
    toneKey: item.toneKey as ManagedCourse["toneKey"],
    creditsSct: item.creditsSct,
    departmentId: item.departmentId as string,
    periodId: item.periodId as string,
    canManage: item.canManage,
  };
}

function catalogOptions(value: unknown): CourseCatalogOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const item = object(entry);
    return item && typeof item.id === "string" && typeof item.label === "string"
      ? [{ id: item.id, label: item.label }]
      : [];
  });
}

function assistant(value: unknown): CourseAssistant | null {
  const item = object(value);
  return item &&
    typeof item.userId === "string" &&
    typeof item.name === "string" &&
    typeof item.email === "string"
    ? { userId: item.userId, name: item.name, email: item.email }
    : null;
}

async function json(request: Promise<Response>): Promise<Record<string, unknown>> {
  const response = await request;
  const payload: unknown = await response.json().catch(() => null);
  const data = object(payload);
  if (!response.ok) {
    throw new Error(
      data && typeof data.error === "string" ? data.error : "No fue posible continuar."
    );
  }
  if (!data) throw new Error("La respuesta del servidor no es válida.");
  return data;
}

export async function loadMyCourses(): Promise<ManagedCourse[]> {
  try {
    const data = await json(fetch("/api/courses/me?limit=100", { cache: "no-store" }));
    return Array.isArray(data.courses)
      ? data.courses.flatMap((entry) => {
          const course = managedCourse(entry);
          return course ? [course] : [];
        })
      : [];
  } catch {
    return [];
  }
}

export async function loadTeacherWorkspace(): Promise<TeacherWorkspaceData> {
  const data = await json(fetch("/api/teacher/courses?limit=100", { cache: "no-store" }));
  const catalog = object(data.catalog);
  return {
    courses: Array.isArray(data.courses)
      ? data.courses.flatMap((entry) => {
          const course = managedCourse(entry);
          return course ? [course] : [];
        })
      : [],
    nextCursor: typeof data.nextCursor === "string" ? data.nextCursor : null,
    catalog: {
      departments: catalogOptions(catalog?.departments),
      periods: catalogOptions(catalog?.periods),
    },
  };
}

export async function createManagedCourse(input: CreateTeacherCourseInput): Promise<ManagedCourse> {
  const data = await json(
    fetch("/api/teacher/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  const course = managedCourse(data.course);
  if (!course) throw new Error("El servidor no devolvió el ramo creado.");
  return course;
}

export async function updateManagedCourse(
  courseId: string,
  input: UpdateTeacherCourseInput
): Promise<ManagedCourse> {
  const data = await json(
    fetch(`/api/teacher/courses/${encodeURIComponent(courseId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  const course = managedCourse(data.course);
  if (!course) throw new Error("El servidor no devolvió la ficha actualizada.");
  return course;
}

export async function loadCourseAssistants(courseId: string): Promise<CourseAssistant[]> {
  const data = await json(
    fetch(`/api/teacher/courses/${encodeURIComponent(courseId)}/assistants?limit=100`, {
      cache: "no-store",
    })
  );
  return Array.isArray(data.assistants)
    ? data.assistants.flatMap((entry) => {
        const item = assistant(entry);
        return item ? [item] : [];
      })
    : [];
}

export async function assignManagedAssistant(
  courseId: string,
  email: string
): Promise<CourseAssistant> {
  const data = await json(
    fetch(`/api/teacher/courses/${encodeURIComponent(courseId)}/assistants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
  );
  const item = assistant(data.assistant);
  if (!item) throw new Error("El servidor no devolvió la ayudantía creada.");
  return item;
}

export async function removeManagedAssistant(courseId: string, userId: string): Promise<void> {
  await json(
    fetch(`/api/teacher/courses/${encodeURIComponent(courseId)}/assistants`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
  );
}
