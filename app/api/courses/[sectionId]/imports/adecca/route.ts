import { getSessionUser } from "../../../../../../lib/auth";
import { containsForbiddenSecretMaterial } from "../../../../../../lib/adecca/privacy";
import type {
  AdeccaImportPost,
  AdeccaImportSource,
  AdeccaRosterParticipant,
} from "../../../../../../lib/adecca/types";
import {
  AdeccaImportServiceError,
  type AdeccaImportWarningSummary,
  authorizeAdeccaImport,
  completeAdeccaImport,
  listAdeccaImports,
  purgeExpiredPendingAdeccaEnrollments,
  reconcileAdeccaRoster,
  startAdeccaImport,
  validateAdeccaImportPlan,
  writeAdeccaImportPosts,
} from "../../../../../../lib/services/adecca-import";

export const dynamic = "force-dynamic";

type AdeccaRouteContext = { params: Promise<{ sectionId: string }> };

function containsForbiddenSecretField(value: object): boolean {
  return Object.entries(value).some(([key, child]) =>
    key === "runToken"
      ? typeof child !== "string" || !/^[a-f0-9]{64}$/.test(child)
      : containsForbiddenSecretMaterial({ [key]: child })
  );
}

function failure(message: string, status: number, code: string) {
  return Response.json({ error: message, code }, { status });
}

function sourceFrom(value: unknown): AdeccaImportSource {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AdeccaImportServiceError(
      "El origen de la importación no es válido.",
      "INVALID_IMPORT_BATCH",
      400
    );
  }
  const source = value as Partial<AdeccaImportSource>;
  const sourceKeys = [
    "sourceKey",
    "fingerprint",
    "courseId",
    "courseName",
    "courseShortName",
    "adeccaVersion",
    "fileName",
    "sourceFormat",
  ];
  if (Object.keys(source).some((key) => !sourceKeys.includes(key))) {
    throw new AdeccaImportServiceError(
      "El origen contiene campos fuera del contrato.",
      "INVALID_IMPORT_BATCH",
      400
    );
  }
  const fields = [
    source.sourceKey,
    source.fingerprint,
    source.courseId,
    source.courseName,
    source.courseShortName,
    source.adeccaVersion,
    source.fileName,
    source.sourceFormat,
  ];
  if (fields.some((field) => typeof field !== "string" || field.length > 500)) {
    throw new AdeccaImportServiceError(
      "El origen de la importación no es válido.",
      "INVALID_IMPORT_BATCH",
      400
    );
  }
  if (
    !/^[a-f0-9]{64}$/i.test(source.sourceKey ?? "") ||
    !/^[a-f0-9]{64}$/i.test(source.fingerprint ?? "") ||
    !source.fileName?.trim() ||
    !["zip", "json", "csv"].includes(source.sourceFormat ?? "")
  ) {
    throw new AdeccaImportServiceError(
      "Faltan identificadores del paquete.",
      "INVALID_IMPORT_BATCH",
      400
    );
  }
  return source as AdeccaImportSource;
}

async function sessionAndSection(request: Request, context: AdeccaRouteContext) {
  const actor = await getSessionUser(request);
  if (!actor) {
    throw new AdeccaImportServiceError("Inicia sesión para continuar.", "UNAUTHENTICATED", 401);
  }
  const { sectionId } = await context.params;
  await authorizeAdeccaImport(actor, sectionId);
  return { actor, sectionId };
}

function handleError(error: unknown) {
  if (error instanceof AdeccaImportServiceError) {
    return failure(error.message, error.status, error.code);
  }
  console.error("[ADECCA Import API]:", error);
  return failure("No fue posible completar la importación.", 500, "IMPORT_INFRASTRUCTURE");
}

export async function GET(request: Request, context: AdeccaRouteContext) {
  try {
    const { actor, sectionId } = await sessionAndSection(request, context);
    const url = new URL(request.url);
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
    const before = url.searchParams.get("before") || undefined;
    const imports = await listAdeccaImports(
      actor,
      sectionId,
      Number.isFinite(limit) ? limit : 20,
      before
    );
    const last = imports.at(-1);
    return Response.json({
      imports,
      nextCursor: last ? `${last.updatedAt}|${last.id}` : null,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request, context: AdeccaRouteContext) {
  try {
    const { actor, sectionId } = await sessionAndSection(request, context);
    let input: {
      action?: string;
      source?: unknown;
      plan?: unknown;
      sourceKey?: string;
      fingerprint?: string;
      runToken?: string;
      posts?: AdeccaImportPost[];
      participants?: AdeccaRosterParticipant[];
      warningCount?: number;
      warningCategories?: AdeccaImportWarningSummary["warningCategories"];
    };
    try {
      const value: unknown = await request.json();
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return failure("El cuerpo de la petición no es válido.", 400, "INVALID_IMPORT_BATCH");
      }
      if (containsForbiddenSecretField(value)) {
        return failure(
          "La importación no admite credenciales ni secretos.",
          400,
          "INVALID_IMPORT_BATCH"
        );
      }
      input = value as typeof input;
    } catch {
      return failure("El cuerpo de la petición no es un JSON válido.", 400, "INVALID_JSON");
    }
    if (input.action === "start") {
      await purgeExpiredPendingAdeccaEnrollments();
      return Response.json(
        await startAdeccaImport(
          actor,
          sectionId,
          sourceFrom(input.source),
          validateAdeccaImportPlan(input.plan)
        )
      );
    }
    if (input.action === "content") {
      const sourceKey = typeof input.sourceKey === "string" ? input.sourceKey : "";
      const fingerprint = typeof input.fingerprint === "string" ? input.fingerprint : "";
      const runToken = typeof input.runToken === "string" ? input.runToken : "";
      if (!/^[a-f0-9]{64}$/i.test(sourceKey) || !/^[a-f0-9]{64}$/i.test(fingerprint)) {
        throw new AdeccaImportServiceError(
          "Faltan identificadores del paquete.",
          "INVALID_IMPORT_BATCH",
          400
        );
      }
      return Response.json(
        await writeAdeccaImportPosts(
          actor,
          sectionId,
          sourceKey,
          fingerprint,
          runToken,
          Array.isArray(input.posts) ? input.posts : []
        )
      );
    }
    if (input.action === "roster") {
      const sourceKey = typeof input.sourceKey === "string" ? input.sourceKey : "";
      const fingerprint = typeof input.fingerprint === "string" ? input.fingerprint : "";
      const runToken = typeof input.runToken === "string" ? input.runToken : "";
      if (!/^[a-f0-9]{64}$/i.test(sourceKey) || !/^[a-f0-9]{64}$/i.test(fingerprint)) {
        throw new AdeccaImportServiceError(
          "Faltan identificadores del paquete.",
          "INVALID_IMPORT_BATCH",
          400
        );
      }
      return Response.json(
        await reconcileAdeccaRoster(
          actor,
          sectionId,
          sourceKey,
          fingerprint,
          runToken,
          Array.isArray(input.participants) ? input.participants : []
        )
      );
    }
    if (input.action === "complete") {
      const sourceKey = typeof input.sourceKey === "string" ? input.sourceKey : "";
      const fingerprint = typeof input.fingerprint === "string" ? input.fingerprint : "";
      const runToken = typeof input.runToken === "string" ? input.runToken : "";
      return Response.json(
        await completeAdeccaImport(actor, sectionId, sourceKey, fingerprint, runToken, {
          warningCount: input.warningCount ?? Number.NaN,
          warningCategories: Array.isArray(input.warningCategories) ? input.warningCategories : [],
        })
      );
    }
    return failure("Acción de importación desconocida.", 400, "INVALID_IMPORT_BATCH");
  } catch (error) {
    return handleError(error);
  }
}
