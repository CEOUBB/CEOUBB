import { EnrollmentImportError, MAX_ENROLLMENT_CSV_BYTES } from "../../../../lib/bulk-enrollment";

const MAX_JSON_OVERHEAD_BYTES = 1024 * 1024;

export async function enrollmentImportPayload(
  request: Request,
  requireFingerprint: boolean
): Promise<{
  sectionId: string;
  csv: string;
  page?: number;
  fingerprint?: string;
}> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_ENROLLMENT_CSV_BYTES + MAX_JSON_OVERHEAD_BYTES
  ) {
    throw new EnrollmentImportError("file_too_large", "El archivo supera el máximo de 5 MiB.", 413);
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new EnrollmentImportError(
      "invalid_request",
      "La solicitud no contiene JSON válido.",
      400
    );
  }
  if (!value || typeof value !== "object") {
    throw new EnrollmentImportError("invalid_request", "La solicitud no es válida.", 400);
  }
  const input = value as Record<string, unknown>;
  const sectionId = typeof input.sectionId === "string" ? input.sectionId.trim() : "";
  const csv = typeof input.csv === "string" ? input.csv : "";
  const page = typeof input.page === "number" && Number.isInteger(input.page) ? input.page : 1;
  const fingerprint = typeof input.fingerprint === "string" ? input.fingerprint : undefined;

  if (!sectionId || !csv || page < 1) {
    throw new EnrollmentImportError("invalid_request", "La solicitud no es válida.", 400);
  }
  if (requireFingerprint && !/^[a-f0-9]{64}$/.test(fingerprint ?? "")) {
    throw new EnrollmentImportError(
      "invalid_request",
      "Primero debes previsualizar el archivo.",
      400
    );
  }
  return { sectionId, csv, page, fingerprint };
}

export function enrollmentImportError(cause: unknown) {
  if (cause instanceof EnrollmentImportError) {
    return Response.json({ error: cause.message, code: cause.code }, { status: cause.status });
  }
  return Response.json(
    { error: "No fue posible procesar la carga de matrículas.", code: "internal_error" },
    { status: 500 }
  );
}
