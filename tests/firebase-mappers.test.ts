import assert from "node:assert/strict";
import test from "node:test";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import {
  personalEventError,
  personalKind,
  postKind,
  toFile,
  toGradebookState,
  toPersonalEvent,
  toPost,
} from "../lib/firebase-classroom-client.ts";
import { DEFAULT_FOLDER } from "../lib/courses.ts";

function mockDoc<T extends DocumentData>(id: string, data: T): QueryDocumentSnapshot<DocumentData> {
  return {
    id,
    data: () => data,
  } as unknown as QueryDocumentSnapshot<DocumentData>;
}

test("toPost maps Firestore document into ClassroomPost correctly", () => {
  const timestamp = new Date("2026-08-15T14:30:00.000Z");
  const doc = mockDoc("post-1", {
    authorId: "user-123",
    authorEmail: "profesor@ubiobio.cl",
    authorName: "Profesor Prueba",
    title: "Guía de Ejercicios 1",
    body: "Contenido de la guía",
    kind: "guia",
    folder: "Unidad 1",
    linkUrl: "https://ejemplo.cl/recurso",
    storagePath: "courses/c1/u1/guia.pdf",
    dueDate: "2026-08-20T23:59:00",
    createdAt: { toDate: () => timestamp },
  });

  const post = toPost(doc);
  assert.equal(post.id, "post-1");
  assert.equal(post.authorId, "user-123");
  assert.equal(post.authorEmail, "profesor@ubiobio.cl");
  assert.equal(post.authorName, "Profesor Prueba");
  assert.equal(post.authorRole, "teacher");
  assert.equal(post.title, "Guía de Ejercicios 1");
  assert.equal(post.body, "Contenido de la guía");
  assert.equal(post.kind, "guide");
  assert.equal(post.folder, "Unidad 1");
  assert.equal(post.linkUrl, "https://ejemplo.cl/recurso");
  assert.equal(post.storagePath, "courses/c1/u1/guia.pdf");
  assert.equal(post.dueDate, "2026-08-20T23:59");
  assert.equal(post.createdAt, "2026-08-15T14:30:00.000Z");
});

test("toPost handles missing optional fields and falls back gracefully", () => {
  const doc = mockDoc("post-2", {});
  const post = toPost(doc);

  assert.equal(post.id, "post-2");
  assert.equal(post.authorId, "");
  assert.equal(post.authorEmail, "");
  assert.equal(post.authorName, "Equipo docente");
  assert.equal(post.authorRole, "student");
  assert.equal(post.title, "Publicación");
  assert.equal(post.body, "");
  assert.equal(post.kind, "notice");
  assert.equal(post.folder, DEFAULT_FOLDER);
  assert.equal(post.linkUrl, null);
  assert.equal(post.storagePath, "");
  assert.equal(post.dueDate, "");
  assert.ok(typeof post.createdAt === "string" && post.createdAt.length > 0);
});

test("toPost derives authorRole according to institutional access policy", () => {
  const studentDoc = mockDoc("p-student", { authorEmail: "alumno@alumnos.ubiobio.cl" });
  assert.equal(toPost(studentDoc).authorRole, "student");

  const teacherDoc = mockDoc("p-teacher", { authorEmail: "docente@ubiobio.cl" });
  assert.equal(toPost(teacherDoc).authorRole, "teacher");

  const ownerDoc = mockDoc("p-owner", { authorEmail: "elpapijuaco325@gmail.com" });
  assert.equal(toPost(ownerDoc).authorRole, "owner");

  const collaboratorDoc = mockDoc("p-collab", { authorEmail: "felipearce.2004@gmail.com" });
  assert.equal(toPost(collaboratorDoc).authorRole, "owner");
});

test("toFile builds ClassroomFile metadata from post and raw document data", () => {
  const post = toPost(
    mockDoc("p-file", {
      authorId: "author-1",
      authorEmail: "docente@ubiobio.cl",
      authorName: "Docente",
      title: "Presentación",
      folder: "Clases",
      linkUrl: "https://storage.googleapis.com/download",
      storagePath: "courses/math/slides.pdf",
      createdAt: { toDate: () => new Date("2026-08-01T10:00:00.000Z") },
    })
  );

  const file = toFile(post, {
    fileName: "Clase_01.pdf",
    contentType: "application/pdf",
    fileSize: 1048576,
  });

  assert.equal(file.id, "p-file");
  assert.equal(file.authorId, "author-1");
  assert.equal(file.authorEmail, "docente@ubiobio.cl");
  assert.equal(file.authorName, "Docente");
  assert.equal(file.name, "Clase_01.pdf");
  assert.equal(file.folder, "Clases");
  assert.equal(file.contentType, "application/pdf");
  assert.equal(file.size, 1048576);
  assert.equal(file.storagePath, "courses/math/slides.pdf");
  assert.equal(file.url, "https://storage.googleapis.com/download");
  assert.equal(file.createdAt, "2026-08-01T10:00:00.000Z");
});

test("toFile falls back to post title, default mime type and 0 bytes if omitted", () => {
  const post = toPost(mockDoc("p-simple", { title: "Documento Sin Metadatos" }));
  const file = toFile(post, {});

  assert.equal(file.name, "Documento Sin Metadatos");
  assert.equal(file.contentType, "application/octet-stream");
  assert.equal(file.size, 0);
  assert.equal(file.url, "");
});

test("toPersonalEvent parses calendar event snapshot", () => {
  const doc = mockDoc("event-1", {
    title: "Estudiar Álgebra",
    detail: "Repasar matrices y determinantes",
    date: "2026-08-18",
    startTime: "09:00",
    endTime: "11:00",
    courseId: "algebra-lineal",
    kind: "study",
    completed: true,
  });

  const event = toPersonalEvent(doc);
  assert.equal(event.id, "event-1");
  assert.equal(event.title, "Estudiar Álgebra");
  assert.equal(event.detail, "Repasar matrices y determinantes");
  assert.equal(event.date, "2026-08-18");
  assert.equal(event.startTime, "09:00");
  assert.equal(event.endTime, "11:00");
  assert.equal(event.courseId, "algebra-lineal");
  assert.equal(event.kind, "study");
  assert.equal(event.completed, true);
});

test("toPersonalEvent defaults optional fields and normalizes kinds", () => {
  const doc = mockDoc("event-empty", {});
  const event = toPersonalEvent(doc);

  assert.equal(event.id, "event-empty");
  assert.equal(event.title, "Bloque");
  assert.equal(event.detail, "");
  assert.equal(event.date, "");
  assert.equal(event.startTime, "");
  assert.equal(event.endTime, "");
  assert.equal(event.courseId, null);
  assert.equal(event.kind, "study");
  assert.equal(event.completed, false);
});

test("personalKind normalizes kinds and postKind normalizes post kinds", () => {
  assert.equal(personalKind("personal"), "personal");
  assert.equal(personalKind("PERSONAL"), "personal");
  assert.equal(personalKind("task"), "task");
  assert.equal(personalKind("TASK"), "task");
  assert.equal(personalKind("study"), "study");
  assert.equal(personalKind("otro"), "study");
  assert.equal(personalKind(null), "study");

  assert.equal(postKind("assessment"), "assessment");
  assert.equal(postKind("evaluacion"), "assessment");
  assert.equal(postKind("dictamen"), "assessment");
  assert.equal(postKind("guide"), "guide");
  assert.equal(postKind("guia"), "guide");
  assert.equal(postKind("resource"), "resource");
  assert.equal(postKind("recurso"), "resource");
  assert.equal(postKind("notice"), "notice");
  assert.equal(postKind("otro"), "notice");
});

test("toGradebookState parses items and numeric exemption boundary conditions", () => {
  const stateWithExemption = toGradebookState({
    items: [
      { id: "c1", name: "Certamen 1", weight: 40, date: "2026-09-01" },
      { id: "c2", name: "Certamen 2", weight: 60, date: "2026-10-01" },
    ],
    exemption: 5.5,
  });
  assert.equal(stateWithExemption.gradebook.length, 2);
  assert.equal(stateWithExemption.exemption, 5.5);

  assert.equal(toGradebookState(null).exemption, null);
  assert.deepEqual(toGradebookState(null).gradebook, []);
  assert.equal(toGradebookState({ exemption: 0 }).exemption, null);
  assert.equal(toGradebookState({ exemption: -1 }).exemption, null);
  assert.equal(toGradebookState({ exemption: "no-numero" }).exemption, null);
  assert.equal(toGradebookState({ exemption: NaN }).exemption, null);
});

test("personalEventError translates Firestore error codes to user-friendly Spanish", () => {
  assert.equal(
    personalEventError({ code: "permission-denied" }, "leer"),
    "Tu calendario personal todavía no está habilitado en el servidor. Avisa al equipo de CEOUBB."
  );
  assert.equal(
    personalEventError({ code: "firestore/permission-denied" }, "guardar"),
    "Tu calendario personal todavía no está habilitado en el servidor. Avisa al equipo de CEOUBB."
  );
  assert.equal(
    personalEventError({ code: "unavailable" }, "leer"),
    "Sin conexión con el servidor. Revisa tu red e inténtalo otra vez."
  );
  assert.equal(
    personalEventError({ code: "network-request-failed" }, "guardar"),
    "Sin conexión con el servidor. Revisa tu red e inténtalo otra vez."
  );
  assert.equal(
    personalEventError({ code: "unauthenticated" }, "eliminar"),
    "Tu sesión expiró. Cierra sesión y vuelve a ingresar."
  );
  assert.equal(
    personalEventError(new Error("unknown"), "leer"),
    "No se pudieron sincronizar tus bloques de estudio."
  );
  assert.equal(
    personalEventError(new Error("unknown"), "guardar"),
    "No se pudo guardar el bloque."
  );
  assert.equal(
    personalEventError(new Error("unknown"), "eliminar"),
    "No se pudo eliminar el bloque."
  );
});
