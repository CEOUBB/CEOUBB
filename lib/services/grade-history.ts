import { z } from "zod";
import {
  GRADE_HISTORY_PAGE_SIZE,
  gradeHistoryEntrySchema,
  type GradeHistoryPage,
  type GradeHistoryQuery,
} from "../grade-history.ts";
import { FIREBASE_PROJECT_ID, googleAccessToken } from "./enrollment-projection.ts";

const firestoreValue = z.union([
  z.object({ stringValue: z.string() }).transform((value) => value.stringValue),
  z.object({ doubleValue: z.number() }).transform((value) => value.doubleValue),
  z
    .object({ integerValue: z.string().regex(/^-?\d+$/) })
    .transform((value) => Number(value.integerValue)),
  z.object({ timestampValue: z.string() }).transform((value) => value.timestampValue),
  z.object({ nullValue: z.null() }).transform(() => null),
]);
const queryResponse = z
  .array(
    z.union([
      z.object({
        document: z.object({ name: z.string(), fields: z.record(z.string(), firestoreValue) }),
      }),
      z.object({ readTime: z.iso.datetime() }).transform(() => ({ document: undefined })),
    ])
  )
  .max(GRADE_HISTORY_PAGE_SIZE + 1);

function documentRoot(projectId: string, sectionId: string) {
  return `projects/${projectId}/databases/(default)/documents/courses/${sectionId}`;
}

export function buildGradeHistoryQuery(query: GradeHistoryQuery, projectId: string) {
  return {
    from: [{ collectionId: "gradeAudit" }],
    where: {
      compositeFilter: {
        op: "AND",
        filters: [
          ["targetType", "score"],
          ["studentId", query.studentId],
          ["gradeItemId", query.gradeItemId],
        ].map(([fieldPath, value]) => ({
          fieldFilter: { field: { fieldPath }, op: "EQUAL", value: { stringValue: value } },
        })),
      },
    },
    orderBy: [
      { field: { fieldPath: "changedAt" }, direction: "DESCENDING" },
      { field: { fieldPath: "__name__" }, direction: "DESCENDING" },
    ],
    limit: GRADE_HISTORY_PAGE_SIZE + 1,
    ...(query.cursor
      ? {
          startAt: {
            before: false,
            values: [
              { timestampValue: query.cursor.changedAt },
              {
                referenceValue: `${documentRoot(projectId, query.sectionId)}/gradeAudit/${query.cursor.id}`,
              },
            ],
          },
        }
      : {}),
  };
}

export async function readGradeHistoryPage(
  query: GradeHistoryQuery,
  dependencies = {
    token: googleAccessToken,
    fetch: globalThis.fetch,
    projectId: FIREBASE_PROJECT_ID,
  }
): Promise<GradeHistoryPage> {
  const root = documentRoot(dependencies.projectId, query.sectionId);
  const token = await dependencies.token();
  const response = await dependencies.fetch(
    `https://firestore.googleapis.com/v1/${root}:runQuery`,
    {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: buildGradeHistoryQuery(query, dependencies.projectId),
      }),
    }
  );
  if (!response.ok) throw new Error("No se pudo consultar el historial.");
  const rows = queryResponse.parse(await response.json());
  const entries = rows.flatMap(({ document }) => {
    if (!document) return [];
    const fields = document.fields;
    const prefix = `${root}/gradeAudit/`;
    if (
      !document.name.startsWith(prefix) ||
      fields.targetType !== "score" ||
      fields.courseId !== query.sectionId ||
      fields.studentId !== query.studentId ||
      fields.gradeItemId !== query.gradeItemId
    ) {
      throw new Error("El historial contiene un registro fuera de la consulta.");
    }
    return [gradeHistoryEntrySchema.parse({ ...fields, id: document.name.slice(prefix.length) })];
  });
  const items = entries.slice(0, GRADE_HISTORY_PAGE_SIZE);
  const last = items.at(-1);
  const nextCursor =
    entries.length > GRADE_HISTORY_PAGE_SIZE && last
      ? JSON.stringify({
          sectionId: query.sectionId,
          studentId: query.studentId,
          gradeItemId: query.gradeItemId,
          changedAt: last.changedAt,
          id: last.id,
        })
      : null;
  return { items, nextCursor };
}
