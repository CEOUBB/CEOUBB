import { getSessionUser } from "../../../../lib/auth";
import {
  CourseManagementError,
  createTeacherCourse,
  listManagedCourses,
  listTeacherCourseCatalog,
} from "../../../../lib/services/teacher-course-management";

function teacherError(cause: unknown) {
  if (cause instanceof CourseManagementError) {
    return Response.json({ error: cause.message, code: cause.code }, { status: cause.status });
  }
  return Response.json({ error: "No fue posible administrar el ramo." }, { status: 500 });
}

function boundedLimit(request: Request): number {
  const value = Number(new URL(request.url).searchParams.get("limit") ?? 50);
  return Number.isInteger(value) ? Math.max(1, Math.min(100, value)) : 50;
}

export async function GET(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor) return Response.json({ error: "Sesión no válida." }, { status: 401 });
  if (actor.role !== "teacher" && actor.role !== "owner") {
    return Response.json({ error: "Este espacio está reservado a docentes." }, { status: 403 });
  }
  const cursor = new URL(request.url).searchParams.get("cursor");
  try {
    const [result, catalog] = await Promise.all([
      listManagedCourses(actor, { limit: boundedLimit(request), cursor }),
      listTeacherCourseCatalog(actor),
    ]);
    return Response.json({
      courses: result.items,
      nextCursor: result.nextCursor,
      catalog,
    });
  } catch (cause) {
    return teacherError(cause);
  }
}

export async function POST(request: Request) {
  const actor = await getSessionUser(request);
  if (!actor) return Response.json({ error: "Sesión no válida." }, { status: 401 });
  if (actor.role !== "teacher" && actor.role !== "owner") {
    return Response.json({ error: "Este espacio está reservado a docentes." }, { status: 403 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "La ficha del ramo no es válida." }, { status: 400 });
  }
  try {
    const course = await createTeacherCourse(actor, payload);
    return Response.json({ course }, { status: 201 });
  } catch (cause) {
    return teacherError(cause);
  }
}
