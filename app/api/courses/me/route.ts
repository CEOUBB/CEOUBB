import { getSessionUser } from "../../../../lib/auth";
import {
  CourseManagementError,
  listUserCourses,
} from "../../../../lib/services/teacher-course-management";

function limitFrom(request: Request): number {
  const value = Number(new URL(request.url).searchParams.get("limit") ?? 50);
  return Number.isInteger(value) ? Math.max(1, Math.min(100, value)) : 50;
}

export async function GET(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor) return Response.json({ error: "Sesión no válida." }, { status: 401 });
  const cursor = new URL(request.url).searchParams.get("cursor");
  try {
    const result = await listUserCourses(actor.id, { limit: limitFrom(request), cursor });
    return Response.json({ courses: result.items, nextCursor: result.nextCursor });
  } catch (cause) {
    if (cause instanceof CourseManagementError) {
      return Response.json({ error: cause.message }, { status: cause.status });
    }
    return Response.json({ error: "No se pudieron cargar tus ramos." }, { status: 500 });
  }
}
