import { z } from "zod";
import { isValidGrade } from "./grades.ts";
import { isSectionId } from "./section-roles.ts";
export { canReadGradeHistory } from "./section-roles.ts";

export const GRADE_HISTORY_PAGE_SIZE = 25;
const entityId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
const timestamp = z.iso.datetime({ offset: true });
const score = z.number().refine(isValidGrade).nullable();
const scopeSchema = z.object({
  sectionId: z.string().refine(isSectionId),
  studentId: entityId,
  gradeItemId: entityId,
});
const cursorSchema = scopeSchema.extend({ id: entityId, changedAt: timestamp });

export const gradeHistoryEntrySchema = z.object({
  id: entityId,
  actorUid: entityId,
  actorName: z.string().max(160),
  actorEmail: z.string().max(254),
  changedAt: timestamp,
  previousValue: score,
  newValue: score,
});
export const gradeHistoryPageSchema = z.object({
  items: z.array(gradeHistoryEntrySchema).max(GRADE_HISTORY_PAGE_SIZE),
  nextCursor: z.string().max(1024).nullable(),
});
export type GradeHistoryEntry = z.infer<typeof gradeHistoryEntrySchema>;
export type GradeHistoryPage = z.infer<typeof gradeHistoryPageSchema>;
export type GradeHistoryQuery = z.infer<typeof scopeSchema> & {
  cursor: z.infer<typeof cursorSchema> | null;
};

export function parseGradeHistoryQuery(url: string, sectionId: string): GradeHistoryQuery {
  const params = new URL(url).searchParams;
  const scope = scopeSchema.parse({
    sectionId,
    studentId: params.get("studentId")?.replace(/^firebase:/, ""),
    gradeItemId: params.get("gradeItemId"),
  });
  const rawCursor = params.get("cursor");
  if (rawCursor && rawCursor.length > 1024) throw new Error("Cursor inválido.");
  const cursor = rawCursor ? cursorSchema.parse(JSON.parse(rawCursor)) : null;
  if (
    cursor &&
    (cursor.sectionId !== scope.sectionId ||
      cursor.studentId !== scope.studentId ||
      cursor.gradeItemId !== scope.gradeItemId)
  ) {
    throw new Error("El cursor no pertenece a esta nota.");
  }
  return { ...scope, cursor };
}

export async function loadGradeHistoryPage(
  sectionId: string,
  studentId: string,
  gradeItemId: string,
  cursor: string | null,
  signal: AbortSignal
): Promise<GradeHistoryPage> {
  const params = new URLSearchParams({ studentId, gradeItemId });
  if (cursor) params.set("cursor", cursor);
  const response = await fetch(
    `/api/sections/${encodeURIComponent(sectionId)}/grade-history?${params}`,
    {
      cache: "no-store",
      credentials: "same-origin",
      signal,
    }
  ).catch(() => {
    throw new Error("No se pudo conectar. Revisa tu conexión e inténtalo nuevamente.");
  });
  if (!response.ok) {
    if (response.status === 401)
      throw new Error("Tu sesión expiró. Vuelve a ingresar para consultar el historial.");
    if (response.status === 403)
      throw new Error("No tienes permiso para consultar el historial de esta sección.");
    throw new Error("No se pudo cargar el historial. Inténtalo nuevamente.");
  }
  const parsed = gradeHistoryPageSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success)
    throw new Error("El historial recibió una respuesta no válida. Inténtalo nuevamente.");
  return parsed.data;
}

const dateFormat = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZoneName: "shortOffset",
});

export function formatGradeHistoryDate(value: string) {
  const fraction = value.match(/\.(\d+)(?:Z|[+-])/u)?.[1];
  return dateFormat
    .formatToParts(new Date(value))
    .map((part) => (part.type === "second" && fraction ? `${part.value},${fraction}` : part.value))
    .join("");
}
