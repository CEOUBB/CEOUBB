import { getSessionUser } from "../../../../../../lib/auth";
import type {
  MoodleImportPost,
  MoodleImportReport,
  MoodleImportSource,
  MoodleRosterParticipant,
} from "../../../../../../lib/moodle/types";
import {
  authorizeMoodleImport,
  completeMoodleImport,
  listMoodleImports,
  MoodleImportServiceError,
  purgeExpiredPendingMoodleEnrollments,
  reconcileMoodleRoster,
  startMoodleImport,
  writeMoodleImportPosts,
} from "../../../../../../lib/services/moodle-import";

export const dynamic = "force-dynamic";

type MoodleRouteContext = { params: Promise<{ sectionId: string }> };

function failure(message: string, status: number, code: string) {
  return Response.json({ error: message, code }, { status });
}

function sourceFrom(value: unknown): MoodleImportSource {
  const source = (value ?? {}) as Partial<MoodleImportSource>;
  const fields = [
    source.sourceKey,
    source.fingerprint,
    source.courseId,
    source.courseName,
    source.courseShortName,
    source.moodleVersion,
    source.fileName,
  ];
  if (fields.some((field) => typeof field !== "string" || field.length > 500)) {
    throw new MoodleImportServiceError(
      "El origen de la importación no es válido.",
      "INVALID_IMPORT_BATCH",
      400
    );
  }
  if (
    !/^[a-f0-9]{64}$/i.test(source.sourceKey ?? "") ||
    !/^[a-f0-9]{64}$/i.test(source.fingerprint ?? "") ||
    !source.fileName
  ) {
    throw new MoodleImportServiceError(
      "Faltan identificadores del respaldo.",
      "INVALID_IMPORT_BATCH",
      400
    );
  }
  return source as MoodleImportSource;
}

function reportIsValid(report: MoodleImportReport, warningCount: number | undefined) {
  const counters = [
    report.contentImported,
    report.filesImported,
    report.participantsMatched,
    report.participantsPending,
  ];
  return (
    ["completed", "partial"].includes(report.status) &&
    counters.every((value) => Number.isInteger(value) && value >= 0 && value <= 20_000) &&
    typeof report.finishedAt === "string" &&
    !Number.isNaN(Date.parse(report.finishedAt)) &&
    Array.isArray(report.warnings) &&
    report.warnings.length <= 100 &&
    report.warnings.every(
      (warning) =>
        typeof warning?.category === "string" &&
        warning.category.length <= 80 &&
        typeof warning.title === "string" &&
        warning.title.length <= 140 &&
        typeof warning.reason === "string" &&
        warning.reason.length <= 500
    ) &&
    Number.isInteger(warningCount) &&
    (warningCount ?? 0) >= report.warnings.length &&
    (warningCount ?? 0) <= 20_000
  );
}

async function sessionAndSection(request: Request, context: MoodleRouteContext) {
  const actor = await getSessionUser(request);
  if (!actor) {
    throw new MoodleImportServiceError("Inicia sesión para continuar.", "UNAUTHENTICATED", 401);
  }
  const { sectionId } = await context.params;
  await authorizeMoodleImport(actor, sectionId);
  return { actor, sectionId };
}

function handleError(error: unknown) {
  if (error instanceof MoodleImportServiceError) {
    return failure(error.message, error.status, error.code);
  }
  console.error("[Moodle Import API]:", error);
  return failure("No fue posible completar la importación.", 500, "IMPORT_INFRASTRUCTURE");
}

// Implements: REQ-MOODLE-07, REQ-MOODLE-08, REQ-MOODLE-09
export async function GET(request: Request, context: MoodleRouteContext) {
  try {
    const { sectionId } = await sessionAndSection(request, context);
    const url = new URL(request.url);
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
    const before = url.searchParams.get("before") || undefined;
    const imports = await listMoodleImports(sectionId, Number.isFinite(limit) ? limit : 20, before);
    return Response.json({ imports });
  } catch (error) {
    return handleError(error);
  }
}

// Implements: REQ-MOODLE-05, REQ-MOODLE-06, REQ-MOODLE-07, REQ-MOODLE-08
export async function POST(request: Request, context: MoodleRouteContext) {
  try {
    const { actor, sectionId } = await sessionAndSection(request, context);
    const input = (await request.json()) as {
      action?: string;
      source?: unknown;
      sourceKey?: string;
      fingerprint?: string;
      posts?: MoodleImportPost[];
      participants?: MoodleRosterParticipant[];
      report?: MoodleImportReport;
      warningCount?: number;
    };
    if (input.action === "start") {
      await purgeExpiredPendingMoodleEnrollments();
      return Response.json(await startMoodleImport(actor, sectionId, sourceFrom(input.source)));
    }
    if (input.action === "content") {
      const sourceKey = typeof input.sourceKey === "string" ? input.sourceKey : "";
      const fingerprint = typeof input.fingerprint === "string" ? input.fingerprint : "";
      if (!/^[a-f0-9]{64}$/i.test(sourceKey) || !/^[a-f0-9]{64}$/i.test(fingerprint)) {
        throw new MoodleImportServiceError(
          "Faltan identificadores del respaldo.",
          "INVALID_IMPORT_BATCH",
          400
        );
      }
      return Response.json(
        await writeMoodleImportPosts(actor, sectionId, sourceKey, fingerprint, input.posts ?? [])
      );
    }
    if (input.action === "roster") {
      if (typeof input.fingerprint !== "string" || !/^[a-f0-9]{64}$/i.test(input.fingerprint)) {
        throw new MoodleImportServiceError(
          "Falta el identificador del respaldo.",
          "INVALID_IMPORT_BATCH",
          400
        );
      }
      return Response.json(
        await reconcileMoodleRoster(sectionId, input.fingerprint, input.participants ?? [])
      );
    }
    if (input.action === "complete" && input.report) {
      const reportSource = sourceFrom(input.report.source);
      if (
        input.report.destinationSectionId !== sectionId ||
        !reportIsValid(input.report, input.warningCount) ||
        reportSource.fingerprint !== input.report.source.fingerprint
      ) {
        throw new MoodleImportServiceError(
          "El reporte no pertenece a la sección de destino.",
          "INVALID_IMPORT_BATCH",
          400
        );
      }
      return Response.json(await completeMoodleImport(sectionId, input.report, input.warningCount));
    }
    return failure("Acción de importación desconocida.", 400, "INVALID_IMPORT_BATCH");
  } catch (error) {
    return handleError(error);
  }
}
