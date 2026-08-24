import { getSessionUser } from "../../../../../lib/auth";
import { applyEnrollmentImport } from "../../../../../lib/services/bulk-enrollment";
import { enrollmentImportError, enrollmentImportPayload } from "../route-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor) {
    return Response.json(
      { error: "Inicia sesión para continuar.", code: "unauthenticated" },
      { status: 401 }
    );
  }
  try {
    const input = await enrollmentImportPayload(request, true);
    const result = await applyEnrollmentImport(actor, input);
    if (result.projectionPending) {
      return Response.json(
        {
          ...result,
          error:
            "Las matrículas quedaron guardadas, pero su acceso al aula sigue pendiente. Reintenta esta misma carga.",
          code: "projection_pending",
        },
        { status: 502 }
      );
    }
    return Response.json(result);
  } catch (cause) {
    return enrollmentImportError(cause);
  }
}
