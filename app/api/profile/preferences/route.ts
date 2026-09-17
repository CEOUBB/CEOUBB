import { getSessionUser } from "../../../../lib/auth";
import {
  preferencesSchema,
  readPreferencesFromFirestore,
  writePreferencesToFirestore,
} from "../../../../lib/services/user-profile";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

// Implements: REQ-CFG-04 REQ-CFG-05
export async function GET(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor) return Response.json({ error: "Sesión no válida." }, { status: 401 });
  try {
    return Response.json(
      { preferences: await readPreferencesFromFirestore(actor.id) },
      { headers: privateHeaders }
    );
  } catch (cause) {
    console.error("[api/profile/preferences] GET", cause);
    return Response.json({ error: "No se pudieron leer las preferencias." }, { status: 500 });
  }
}

// Implements: REQ-CFG-04 REQ-CFG-05
export async function PUT(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Origen no autorizado." }, { status: 403 });
  }

  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > 16384) {
      return Response.json(
        { error: "El cuerpo de la solicitud es demasiado extenso." },
        { status: 413 }
      );
    }
  }

  const actor = await getSessionUser(request);
  if (!actor) return Response.json({ error: "Sesión no válida." }, { status: 401 });

  let payload: unknown;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 16384) {
      return Response.json(
        { error: "El cuerpo de la solicitud es demasiado extenso." },
        { status: 413 }
      );
    }
    payload = JSON.parse(rawBody);
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
    return Response.json({ preferences: parsed.data }, { headers: privateHeaders });
  } catch (cause) {
    console.error("[api/profile/preferences] PUT", cause);
    return Response.json({ error: "No se pudieron guardar las preferencias." }, { status: 500 });
  }
}
