import { getSessionUser } from "../../../../../lib/auth";
import { previewEnrollmentImport } from "../../../../../lib/services/bulk-enrollment";
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
    const input = await enrollmentImportPayload(request, false);
    return Response.json(await previewEnrollmentImport(actor, input));
  } catch (cause) {
    return enrollmentImportError(cause);
  }
}
