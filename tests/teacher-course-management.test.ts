import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import * as schema from "../db/schema.ts";
import {
  assistantAssignments,
  matriculas,
  sectionProfiles,
  secciones,
  users,
} from "../db/schema.ts";
import {
  COURSE_TONES,
  gradeSchemeError,
  parseAssistantInput,
  parseCreateTeacherCourseInput,
  parseUpdateTeacherCourseInput,
  sectionIdFor,
} from "../lib/course-management.ts";
import {
  CourseManagementError,
  assignCourseAssistant,
  createTeacherCourse,
  listManagedCourses,
  listUserCourses,
  removeCourseAssistant,
  updateTeacherCourse,
} from "../lib/services/teacher-course-management.ts";

const TEACHER = {
  id: "firebase:teacher-one",
  email: "docente@ubiobio.cl",
  name: "Ana Docente",
  role: "teacher" as const,
};
const OTHER_TEACHER = {
  id: "firebase:teacher-two",
  email: "otro@ubiobio.cl",
  name: "Otro Docente",
  role: "teacher" as const,
};
const STUDENT = {
  id: "firebase:student-one",
  email: "ayudante@alumnos.ubiobio.cl",
  name: "Sofía Ayudante",
  role: "student" as const,
};

async function memoryDatabase() {
  const client = createClient({ url: "file::memory:" });
  const files = (await readdir(new URL("../drizzle/", import.meta.url)))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim().replace(/;$/, "");
      if (trimmed) await client.execute(trimmed);
    }
  }
  const db = drizzle(client, { schema });
  await db.insert(users).values([
    { ...TEACHER, createdAt: "2026-08-23T10:00:00.000Z" },
    { ...OTHER_TEACHER, createdAt: "2026-08-23T10:00:00.000Z" },
    { ...STUDENT, createdAt: "2026-08-23T10:00:00.000Z" },
  ]);
  return { client, db };
}

const validCourse = {
  code: " 440299 ",
  name: " Estática ",
  creditsSct: 6,
  departmentId: "dep-ceoubb-general",
  periodId: "2026-2",
  sectionNumber: 1,
  summary: " Equilibrio de cuerpos rígidos. ",
  modality: "presencial",
  room: " Aula AB-12 ",
  tone: "sky",
};

test("CEO-27 materializes section profiles and reversible assistant assignments", () => {
  assert.equal(getTableConfig(sectionProfiles).name, "section_profiles");
  assert.equal(getTableConfig(assistantAssignments).name, "assistant_assignments");
  assert.deepEqual(
    getTableConfig(sectionProfiles)
      .columns.map((column) => column.name)
      .sort(),
    ["description", "modality", "room", "section_id", "title", "tone", "updated_at"]
  );
  const assistantIndexes = getTableConfig(assistantAssignments).indexes.map(
    (entry) => entry.config.name
  );
  assert.ok(assistantIndexes.includes("idx_assistant_section_user"));
  assert.ok(assistantIndexes.includes("idx_assistant_section"));
});

test("CEO-27 normalizes valid course data and derives a Firestore-safe section identity", () => {
  const parsed = parseCreateTeacherCourseInput(validCourse);
  assert.deepEqual(parsed, {
    code: "440299",
    name: "Estática",
    creditsSct: 6,
    departmentId: "dep-ceoubb-general",
    periodId: "2026-2",
    sectionNumber: 1,
    summary: "Equilibrio de cuerpos rígidos.",
    modality: "presencial",
    room: "Aula AB-12",
    tone: "sky",
  });
  assert.equal(
    sectionIdFor(parsed.code, parsed.periodId, parsed.sectionNumber),
    "440299-2026-2-s1"
  );
  assert.match(sectionIdFor("Álgebra I", "2026 Primavera", 12), /^[a-z0-9][a-z0-9-]{1,60}$/);
  assert.ok(COURSE_TONES.includes(parsed.tone));
});

test("CEO-27 rejects malformed create, update and assistant payloads", () => {
  for (const payload of [
    { ...validCourse, code: "" },
    { ...validCourse, name: "" },
    { ...validCourse, creditsSct: 31 },
    { ...validCourse, sectionNumber: 0 },
    { ...validCourse, summary: "x".repeat(2001) },
    { ...validCourse, modality: "telepatica" },
    { ...validCourse, tone: "neon" },
  ]) {
    assert.throws(
      () => parseCreateTeacherCourseInput(payload),
      /ramo|créditos|sección|descripción|modalidad|color/i
    );
  }
  assert.throws(() => parseUpdateTeacherCourseInput({}), /cambio/i);
  assert.throws(() => parseAssistantInput({ email: "ayudante@gmail.com" }), /institucional/i);
  assert.deepEqual(parseAssistantInput({ email: " AYUDANTE@ALUMNOS.UBIOBIO.CL " }), {
    email: "ayudante@alumnos.ubiobio.cl",
  });
});

test("CEO-27 accepts only a complete one-hundred-percent grade scheme", () => {
  assert.equal(
    gradeSchemeError(
      [
        { id: "c1", name: "Certamen 1", weight: 40, date: "2026-09-10" },
        { id: "c2", name: "Certamen 2", weight: 60, date: "2026-11-20" },
      ],
      5.5
    ),
    null
  );
  assert.match(
    gradeSchemeError(
      [
        { id: "c1", name: "Certamen 1", weight: 40, date: "" },
        { id: "c2", name: "Certamen 2", weight: 50, date: "" },
      ],
      5.5
    ) ?? "",
    /100%/
  );
  assert.match(
    gradeSchemeError([{ id: "c1", name: "", weight: 100, date: "" }], 5.5) ?? "",
    /nombre/i
  );
  assert.match(
    gradeSchemeError([{ id: "c1", name: "Certamen", weight: 100, date: "" }], 8) ?? "",
    /eximición/i
  );
});

test("CEO-27 creates a complete section, projects the teacher and lists only active enrollments", async () => {
  const { client, db } = await memoryDatabase();
  const projected: Array<{ sectionId: string; userId: string; role: string; status: string }> = [];
  try {
    const created = await createTeacherCourse(TEACHER, validCourse, {
      db,
      now: () => new Date("2026-08-23T12:00:00.000Z"),
      projectEnrollment: async (sectionId, userId, role, status) => {
        projected.push({ sectionId, userId, role, status });
      },
    });
    assert.equal(created.id, "440299-2026-2-s1");
    assert.equal(created.teacher, TEACHER.name);
    assert.equal(created.role, "teacher");
    assert.deepEqual(projected, [
      {
        sectionId: created.id,
        userId: TEACHER.id,
        role: "teacher",
        status: "activa",
      },
    ]);
    assert.equal((await db.select().from(secciones)).length, 1);
    assert.equal((await db.select().from(sectionProfiles)).length, 1);
    assert.equal((await db.select().from(matriculas)).length, 1);
    assert.deepEqual(
      (await listManagedCourses(TEACHER, { db })).items.map((row) => row.id),
      [created.id]
    );
    assert.deepEqual(
      (await listUserCourses(TEACHER.id, { db })).items.map((row) => row.id),
      [created.id]
    );
    await db
      .update(matriculas)
      .set({ estado: "retirada" })
      .where(eq(matriculas.usuarioId, TEACHER.id));
    assert.deepEqual((await listUserCourses(TEACHER.id, { db })).items, []);
  } finally {
    client.close();
  }
});

test("CEO-27 compensates a new section when its Firestore projection fails", async () => {
  const { client, db } = await memoryDatabase();
  try {
    await assert.rejects(
      createTeacherCourse(TEACHER, validCourse, {
        db,
        projectEnrollment: async () => {
          throw new Error("credentials unavailable");
        },
      }),
      (cause: unknown) =>
        cause instanceof CourseManagementError &&
        cause.code === "PROJECTION_UNAVAILABLE" &&
        cause.status === 503
    );
    assert.equal((await db.select().from(secciones)).length, 0);
    assert.equal((await db.select().from(sectionProfiles)).length, 0);
    assert.equal((await db.select().from(matriculas)).length, 0);
  } finally {
    client.close();
  }
});

test("CEO-27 blocks foreign profile edits and saves owned presentation data", async () => {
  const { client, db } = await memoryDatabase();
  const projectEnrollment = async () => undefined;
  try {
    const created = await createTeacherCourse(TEACHER, validCourse, {
      db,
      projectEnrollment,
    });
    await assert.rejects(
      updateTeacherCourse(OTHER_TEACHER, created.id, { title: "Título ajeno" }, { db }),
      (cause: unknown) => cause instanceof CourseManagementError && cause.status === 403
    );
    const updated = await updateTeacherCourse(
      TEACHER,
      created.id,
      {
        title: "Estática aplicada",
        summary: "Nueva ficha docente",
        modality: "hibrida",
        room: "AB-22",
        tone: "emerald",
      },
      { db }
    );
    assert.equal(updated.name, "Estática aplicada");
    assert.equal(updated.modality, "hibrida");
    assert.equal(updated.room, "AB-22");
  } finally {
    client.close();
  }
});

test("CEO-27 designates and removes an assistant without losing the previous enrollment", async () => {
  const { client, db } = await memoryDatabase();
  const projected: string[] = [];
  const projectEnrollment = async (
    sectionId: string,
    userId: string,
    role: "teacher" | "student" | "assistant" | "coordinator",
    status: "activa" | "retirada" | "congelada"
  ) => {
    projected.push(`${sectionId}:${userId}:${role}:${status}`);
  };
  try {
    const created = await createTeacherCourse(TEACHER, validCourse, {
      db,
      projectEnrollment,
    });
    await db.insert(matriculas).values({
      id: "enrollment-student",
      seccionId: created.id,
      usuarioId: STUDENT.id,
      rolSeccion: "student",
      estado: "activa",
      createdAt: "2026-08-23T12:00:00.000Z",
    });
    const assigned = await assignCourseAssistant(
      TEACHER,
      created.id,
      { email: STUDENT.email },
      { db, projectEnrollment }
    );
    assert.equal(assigned.email, STUDENT.email);
    assert.equal(
      (
        await db
          .select({ role: matriculas.rolSeccion })
          .from(matriculas)
          .where(eq(matriculas.usuarioId, STUDENT.id))
          .limit(1)
      )[0]?.role,
      "assistant"
    );
    assert.equal((await db.select().from(assistantAssignments)).length, 1);
    await removeCourseAssistant(TEACHER, created.id, STUDENT.id, {
      db,
      projectEnrollment,
    });
    assert.deepEqual(
      (
        await db
          .select({ role: matriculas.rolSeccion, status: matriculas.estado })
          .from(matriculas)
          .where(eq(matriculas.usuarioId, STUDENT.id))
          .limit(1)
      )[0],
      { role: "student", status: "activa" }
    );
    assert.equal((await db.select().from(assistantAssignments)).length, 0);
    assert.ok(projected.some((value) => value.endsWith(":assistant:activa")));
    assert.ok(projected.some((value) => value.endsWith(":student:activa")));
  } finally {
    client.close();
  }
});

test("CEO-27 keeps routes authorized, lists bounded and the gradebook listener exact", async () => {
  const files = {
    service: await readFile(
      new URL("../lib/services/teacher-course-management.ts", import.meta.url),
      "utf8"
    ),
    ownCourses: await readFile(new URL("../app/api/courses/me/route.ts", import.meta.url), "utf8"),
    teacherCourses: await readFile(
      new URL("../app/api/teacher/courses/route.ts", import.meta.url),
      "utf8"
    ),
    assistants: await readFile(
      new URL("../app/api/teacher/courses/[courseId]/assistants/route.ts", import.meta.url),
      "utf8"
    ),
    grades: await readFile(new URL("../lib/firebase/grades.ts", import.meta.url), "utf8"),
    portal: await readFile(new URL("../app/Portal.tsx", import.meta.url), "utf8"),
    workspace: await readFile(
      new URL("../app/views/TeacherCoursesView.tsx", import.meta.url),
      "utf8"
    ),
  };
  for (const route of [files.ownCourses, files.teacherCourses, files.assistants]) {
    assert.match(route, /getSessionUser\(request\)/);
  }
  assert.match(files.teacherCourses, /actor\.role !== "teacher" && actor\.role !== "owner"/);
  assert.match(files.assistants, /await context\.params/);
  for (const query of files.service.split(".select(").slice(1)) {
    const statement = query.slice(0, query.indexOf(";"));
    assert.ok(statement.includes(".limit("), `unbounded query: .select(${statement}`);
  }
  assert.match(files.grades, /export function watchGradebook\(/);
  assert.match(files.grades, /sdk\.doc\(db, "courses", courseId, "meta", "gradebook"\)/);
  assert.match(files.portal, /loadMyCourses/);
  assert.doesNotMatch(files.portal, /useMemo\(\(\) => COURSES/);
  assert.match(files.workspace, /Administrar ramos/);
  assert.match(files.workspace, /Datos del ramo/);
  assert.match(files.workspace, /Evaluaciones/);
  assert.match(files.workspace, /Ayudantes/);
  assert.match(files.workspace, /aria-live="polite"/);
});
