// Implements: REQ-URL-01, REQ-URL-02, REQ-URL-03
import { parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs";
import { createSearchParamsCache, createSerializer } from "nuqs/server";

/**
 * Parámetros de búsqueda y paginación para la vista de Administración (AdminView).
 */
export const adminSearchParams = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

export const adminSearchParamsCache = createSearchParamsCache(adminSearchParams);
export const serializeAdminSearchParams = createSerializer(adminSearchParams);

/**
 * Parámetros para pestañas en el panel de gestión docente (TeacherCoursesView).
 */
export const teacherTabs = ["data", "evaluations", "assistants"] as const;
export type TeacherTab = (typeof teacherTabs)[number];

export const teacherCoursesSearchParams = {
  tab: parseAsStringLiteral(teacherTabs).withDefault("data"),
  courseId: parseAsString.withDefault(""),
};

export const teacherCoursesSearchParamsCache = createSearchParamsCache(teacherCoursesSearchParams);
export const serializeTeacherCoursesSearchParams = createSerializer(teacherCoursesSearchParams);

/**
 * Parámetros de filtrado para el catálogo de ramos (CoursesDashboard).
 */
export const courseStates = ["todos", "activo", "archivado"] as const;
export type CourseState = (typeof courseStates)[number];

export const coursesSearchParams = {
  periodo: parseAsString.withDefault(""),
  filtro: parseAsStringLiteral(courseStates).withDefault("todos"),
  busqueda: parseAsString.withDefault(""),
};

export const coursesSearchParamsCache = createSearchParamsCache(coursesSearchParams);
export const serializeCoursesSearchParams = createSerializer(coursesSearchParams);
