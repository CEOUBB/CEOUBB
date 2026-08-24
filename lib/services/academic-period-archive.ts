import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { periodos, secciones } from "../../db/schema.ts";
import { boundedLimit, MAX_PAGE_SIZE, type Page } from "./academic-catalog.ts";
import {
  isValidPathSegment,
  projectAcademicPeriodToFirestore,
  projectAcademicSectionsToFirestore,
  type AcademicSectionProjection,
  type PeriodStatus,
} from "./enrollment-projection.ts";

export type AcademicPeriodSummary = {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: PeriodStatus;
};

export type PeriodArchiveResult = {
  period: AcademicPeriodSummary;
  sectionCount: number;
  alreadyArchived: boolean;
};

export type PeriodSyncResult = {
  period: AcademicPeriodSummary;
  sectionCount: number;
};

export class PeriodArchiveError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_period" | "not_found" | "projection_failed"
  ) {
    super(message);
  }
}

export async function listAcademicPeriods(
  options: { limit?: number; cursor?: string | null } = {}
): Promise<Page<AcademicPeriodSummary>> {
  const limit = boundedLimit(options.limit);
  const rows = await getDb()
    .select()
    .from(periodos)
    .where(options.cursor ? lt(periodos.id, options.cursor) : undefined)
    .orderBy(desc(periodos.id))
    .limit(limit + 1);
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > limit && last ? last.id : null,
  };
}

export async function listPeriodSectionProjections(
  periodoId: string,
  options: { limit?: number; cursor?: string | null } = {}
): Promise<Page<AcademicSectionProjection>> {
  const limit = boundedLimit(options.limit);
  const rows = await getDb()
    .select({ seccionId: secciones.id, periodoId: secciones.periodoId })
    .from(secciones)
    .where(
      and(
        eq(secciones.periodoId, periodoId),
        options.cursor ? gt(secciones.id, options.cursor) : undefined
      )
    )
    .orderBy(asc(secciones.id))
    .limit(limit + 1);
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > limit && last ? last.seccionId : null,
  };
}

async function loadPeriodAccess(periodId: string) {
  if (!isValidPathSegment(periodId)) {
    throw new PeriodArchiveError("El identificador del período no es válido.", "invalid_period");
  }
  const [period] = await getDb().select().from(periodos).where(eq(periodos.id, periodId)).limit(1);
  if (!period) {
    throw new PeriodArchiveError("El período académico no existe.", "not_found");
  }

  const sections: AcademicSectionProjection[] = [];
  let cursor: string | null = null;
  do {
    const page = await listPeriodSectionProjections(periodId, {
      limit: MAX_PAGE_SIZE,
      cursor,
    });
    sections.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);

  return { period, sections };
}

async function projectPeriodAccess(
  periodId: string,
  sections: AcademicSectionProjection[],
  status: PeriodStatus,
  failureMessage: string
) {
  try {
    await projectAcademicSectionsToFirestore(sections);
    await projectAcademicPeriodToFirestore({ periodoId: periodId, status });
  } catch {
    throw new PeriodArchiveError(failureMessage, "projection_failed");
  }
}

export async function archiveAcademicPeriod(periodId: string): Promise<PeriodArchiveResult> {
  const { period, sections } = await loadPeriodAccess(periodId);

  await projectPeriodAccess(
    periodId,
    sections,
    "archivado",
    "Firebase no confirmó el modo de solo lectura del período."
  );

  const alreadyArchived = period.estado === "archivado";
  if (!alreadyArchived) {
    await getDb().update(periodos).set({ estado: "archivado" }).where(eq(periodos.id, periodId));
  }
  return {
    period: { ...period, estado: "archivado" },
    sectionCount: sections.length,
    alreadyArchived,
  };
}

export async function synchronizeAcademicPeriod(periodId: string): Promise<PeriodSyncResult> {
  const { period, sections } = await loadPeriodAccess(periodId);
  await projectPeriodAccess(
    periodId,
    sections,
    period.estado,
    "Firebase no confirmó la proyección de acceso del período."
  );
  return { period, sectionCount: sections.length };
}
