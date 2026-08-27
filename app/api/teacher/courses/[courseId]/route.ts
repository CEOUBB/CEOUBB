import { getSessionUser } from "../../../../../lib/auth";
import { isSectionId } from "../../../../../lib/section-roles";
import {
  CourseManagementError,
  updateTeacherCourse,
} from "../../../../../lib/services/teacher-course-management";

type CourseContext = { params: Promise<{ courseId: string }> };

// Implements: REQ-SEC-17
export async function PATCH(request: Request, context: CourseContext) {
  const actor = await getSessionUser(request);
  if (!actor) return Response.json({ error: "Sesión no válida." }, { status: 401 });
  if (actor.role !== "teacher" && actor.role !== "owner") {
    return Response.json({ error: "Este espacio está reservado a docentes." }, { status: 403 });
  }
  const { courseId } = await context.params;
  if (!courseId || courseId.length > 100 || !isSectionId(courseId)) {
    return Response.json({ error: "El ramo no es válido." }, { status: 400 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "La ficha del ramo no es válida." }, { status: 400 });
  }
  try {
    const course = await updateTeacherCourse(actor, courseId, payload);
    return Response.json({ course });
  } catch (cause) {
    if (cause instanceof CourseManagementError) {
      return Response.json({ error: cause.message, code: cause.code }, { status: cause.status });
    }
    return Response.json({ error: "No fue posible actualizar el ramo." }, { status: 500 });
  }
}
