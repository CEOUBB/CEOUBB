import { getSessionUser } from "../../../../lib/auth";
import {
  preferencesSchema,
  readPreferencesFromFirestore,
  writePreferencesToFirestore,
} from "../../../../lib/services/user-profile";

// Implements: REQ-CFG-04 REQ-CFG-05
export async function GET(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor) return Response.json({ error: "Sesión no válida." }, { status: 401 });
  try {
    return Response.json({ preferences: await readPreferencesFromFirestore(actor.id) });
  } catch (cause) {
    console.error("[api/profile/preferences] GET", cause);
    return Response.json({ error: "No se pudieron leer las preferencias." }, { status: 500 });
  }
}

// Implements: REQ-CFG-04 REQ-CFG-05
export async function PUT(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor) return Response.json({ error: "Sesión no válida." }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo de la petición no es JSON." }, { status: 400 });
  }

  const parsed = preferencesSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Las preferencias enviadas no son válidas.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 }
    );
  }

  try {
    await writePreferencesToFirestore(actor.id, parsed.data);
    return Response.json({ preferences: parsed.data });
  } catch (cause) {
    console.error("[api/profile/preferences] PUT", cause);
    return Response.json({ error: "No se pudieron guardar las preferencias." }, { status: 500 });
  }
}
