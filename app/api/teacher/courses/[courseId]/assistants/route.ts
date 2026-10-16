import { getSessionUser } from "../../../../../../lib/auth";
import { isSectionId } from "../../../../../../lib/section-roles";
import {
  CourseManagementError,
  assignCourseAssistant,
  listCourseAssistants,
  removeCourseAssistant,
} from "../../../../../../lib/services/teacher-course-management";

type CourseContext = { params: Promise<{ courseId: string }> };

function routeError(cause: unknown) {
  if (cause instanceof CourseManagementError) {
    return Response.json({ error: cause.message, code: cause.code }, { status: cause.status });
  }
  return Response.json({ error: "No fue posible actualizar las ayudantías." }, { status: 500 });
}

async function teacher(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor) return { response: Response.json({ error: "Sesión no válida." }, { status: 401 }) };
  if (actor.role !== "teacher" && actor.role !== "owner") {
    return {
      response: Response.json(
        { error: "Este espacio está reservado a docentes." },
        { status: 403 }
      ),
    };
  }
  return { actor };
}

// Implements: REQ-SEC-17
export async function GET(request: Request, context: CourseContext) {
  const session = await teacher(request);
  if ("response" in session) return session.response;
  const { courseId } = await context.params;
  if (!courseId || courseId.length > 100 || !isSectionId(courseId)) {
    return Response.json({ error: "El ramo no es válido." }, { status: 400 });
  }
  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? 50);
  const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(100, rawLimit)) : 50;
  try {
    const result = await listCourseAssistants(session.actor, courseId, {
      limit,
      cursor: url.searchParams.get("cursor"),
    });
    return Response.json({ assistants: result.items, nextCursor: result.nextCursor });
  } catch (cause) {
    return routeError(cause);
  }
}

function validateMutationRequest(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Origen no autorizado." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 65536) {
    return Response.json(
      { error: "El cuerpo de la solicitud es demasiado extenso." },
      { status: 413 }
    );
  }

  return null;
}

async function readMutationBody(request: Request): Promise<{ body?: string; error?: Response }> {
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 65536) {
      return {
        error: Response.json(
          { error: "El cuerpo de la solicitud es demasiado extenso." },
          { status: 413 }
        ),
      };
    }
    return { body: rawBody };
  } catch {
    return {
      error: Response.json({ error: "No fue posible leer la solicitud." }, { status: 400 }),
    };
  }
}

// Implements: REQ-SEC-17
export async function POST(request: Request, context: CourseContext) {
  const validationError = validateMutationRequest(request);
  if (validationError) return validationError;

  const session = await teacher(request);
  if ("response" in session) return session.response;
  const { courseId } = await context.params;
  if (!courseId || courseId.length > 100 || !isSectionId(courseId)) {
    return Response.json({ error: "El ramo no es válido." }, { status: 400 });
  }

  const bodyResult = await readMutationBody(request);
  if (bodyResult.error) return bodyResult.error;

  let payload: unknown;
  try {
    payload = JSON.parse(bodyResult.body ?? "");
  } catch {
    return Response.json({ error: "El correo de la ayudante no es válido." }, { status: 400 });
  }
  try {
    const assistant = await assignCourseAssistant(session.actor, courseId, payload);
    return Response.json({ assistant }, { status: 201 });
  } catch (cause) {
    return routeError(cause);
  }
}

// Implements: REQ-SEC-17
export async function DELETE(request: Request, context: CourseContext) {
  const validationError = validateMutationRequest(request);
  if (validationError) return validationError;

  const session = await teacher(request);
  if ("response" in session) return session.response;
  const { courseId } = await context.params;
  if (!courseId || courseId.length > 100 || !isSectionId(courseId)) {
    return Response.json({ error: "El ramo no es válido." }, { status: 400 });
  }

  const bodyResult = await readMutationBody(request);
  if (bodyResult.error) return bodyResult.error;

  let payload: unknown;
  try {
    payload = JSON.parse(bodyResult.body ?? "");
  } catch {
    return Response.json({ error: "La ayudantía no es válida." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ error: "La ayudantía no es válida." }, { status: 400 });
  }
  const userId = (payload as Record<string, unknown>).userId;
  if (typeof userId !== "string") {
    return Response.json({ error: "La ayudantía no es válida." }, { status: 400 });
  }
  try {
    await removeCourseAssistant(session.actor, courseId, userId);
    return Response.json({ removed: true });
  } catch (cause) {
    return routeError(cause);
  }
}
