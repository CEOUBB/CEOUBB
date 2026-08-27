import assert from "node:assert/strict";
import test from "node:test";
import {
  filterMaterialsByQuery,
  filterRoster,
  normalizeSearchText,
  paginateList,
} from "../app/views/classroom/classroom-utils.ts";
import type { ClassroomFile, ClassroomStudent } from "../lib/firebase-classroom-client.ts";

test("normalizeSearchText recorta, pasa a minúsculas y elimina diacríticos/acentos", () => {
  assert.equal(normalizeSearchText("  González  "), "gonzalez");
  assert.equal(normalizeSearchText("ÁÉÍÓÚ ñ"), "aeiou n");
  assert.equal(normalizeSearchText("Cálculo I"), "calculo i");
  assert.equal(normalizeSearchText(""), "");
});

test("paginateList divide una nómina de 300 estudiantes en páginas exactas de 25", () => {
  const students = Array.from({ length: 300 }, (_, index) => ({
    userId: `user-${index + 1}`,
    name: `Estudiante ${index + 1}`,
    email: `estudiante${index + 1}@alumnos.ubiobio.cl`,
    completed: 0,
    total: 4,
    updatedAt: "2026-08-20T10:00:00.000Z",
  }));

  const page1 = paginateList(students, 1, 25);
  assert.equal(page1.totalPages, 12);
  assert.equal(page1.page, 1);
  assert.equal(page1.pageSize, 25);
  assert.equal(page1.totalItems, 300);
  assert.equal(page1.items.length, 25);
  assert.equal(page1.startIndex, 1);
  assert.equal(page1.endIndex, 25);
  assert.equal(page1.items[0].userId, "user-1");
  assert.equal(page1.items[24].userId, "user-25");

  const page2 = paginateList(students, 2, 25);
  assert.equal(page2.page, 2);
  assert.equal(page2.startIndex, 26);
  assert.equal(page2.endIndex, 50);
  assert.equal(page2.items[0].userId, "user-26");

  const pageLast = paginateList(students, 12, 25);
  assert.equal(pageLast.page, 12);
  assert.equal(pageLast.startIndex, 276);
  assert.equal(pageLast.endIndex, 300);
  assert.equal(pageLast.items[24].userId, "user-300");

  // Clamping de página fuera de rango
  const pageOverflow = paginateList(students, 999, 25);
  assert.equal(pageOverflow.page, 12);
  const pageUnderflow = paginateList(students, -5, 25);
  assert.equal(pageUnderflow.page, 1);
});

test("paginateList maneja listas vacías y tamaños personalizados", () => {
  const empty = paginateList([], 1, 25);
  assert.equal(empty.totalPages, 1);
  assert.equal(empty.totalItems, 0);
  assert.equal(empty.items.length, 0);
  assert.equal(empty.startIndex, 0);
  assert.equal(empty.endIndex, 0);

  const list50 = Array.from({ length: 75 }, (_, i) => i);
  const p50 = paginateList(list50, 2, 50);
  assert.equal(p50.totalPages, 2);
  assert.equal(p50.items.length, 25);
  assert.equal(p50.startIndex, 51);
  assert.equal(p50.endIndex, 75);
});

test("filterRoster busca insensible a mayúsculas y acentos por nombre o correo", () => {
  const students: ClassroomStudent[] = [
    {
      userId: "u1",
      name: "María González",
      email: "maria.gonzalez@alumnos.ubiobio.cl",
      completed: 2,
      total: 4,
      updatedAt: "",
    },
    {
      userId: "u2",
      name: "Carlos Pérez",
      email: "cperez@alumnos.ubiobio.cl",
      completed: 1,
      total: 4,
      updatedAt: "",
    },
    {
      userId: "u3",
      name: "Matías Soto",
      email: "msoto@alumnos.ubiobio.cl",
      completed: 3,
      total: 4,
      updatedAt: "",
    },
  ];

  // Búsqueda vacía retorna todo
  assert.equal(filterRoster(students, "").length, 3);
  assert.equal(filterRoster(students, "   ").length, 3);

  // Búsqueda por apellido sin acento
  const byName = filterRoster(students, "gonzalez");
  assert.equal(byName.length, 1);
  assert.equal(byName[0].userId, "u1");

  // Búsqueda por correo parcial
  const byEmail = filterRoster(students, "cperez");
  assert.equal(byEmail.length, 1);
  assert.equal(byEmail[0].userId, "u2");

  // Búsqueda sin coincidencias
  assert.equal(filterRoster(students, "inexistente").length, 0);
});

test("filterMaterialsByQuery filtra archivos preservando carpetas con coincidencias", () => {
  const file1: ClassroomFile = {
    id: "f1",
    name: "Guía 1 - Vectores.pdf",
    folder: "Unidad 1",
    size: 1024,
    createdAt: "2026-08-01",
    authorId: "auth-1",
    authorName: "Prof. Silva",
    authorEmail: "psilva@ubiobio.cl",
    storagePath: "path1",
    contentType: "application/pdf",
    url: "https://storage.mock/f1.pdf",
  };
  const file2: ClassroomFile = {
    id: "f2",
    name: "Certamen 1 - Pauta.pdf",
    folder: "Evaluaciones",
    size: 2048,
    createdAt: "2026-08-10",
    authorId: "auth-1",
    authorName: "Prof. Silva",
    authorEmail: "psilva@ubiobio.cl",
    storagePath: "path2",
    contentType: "application/pdf",
    url: "https://storage.mock/f2.pdf",
  };
  const file3: ClassroomFile = {
    id: "f3",
    name: "Guía 2 - Dinámica.pdf",
    folder: "Unidad 2",
    size: 4096,
    createdAt: "2026-08-15",
    authorId: "auth-2",
    authorName: "Ayudante Soto",
    authorEmail: "asoto@alumnos.ubiobio.cl",
    storagePath: "path3",
    contentType: "application/pdf",
    url: "https://storage.mock/f3.pdf",
  };

  const folders: [string, ClassroomFile[]][] = [
    ["Unidad 1", [file1]],
    ["Evaluaciones", [file2]],
    ["Unidad 2", [file3]],
  ];

  // Búsqueda vacía retorna todo
  assert.equal(filterMaterialsByQuery(folders, "").length, 3);

  // Búsqueda por 'guia' empareja f1 y f3 en Unidad 1 y Unidad 2
  const matchingGuia = filterMaterialsByQuery(folders, "guia");
  assert.equal(matchingGuia.length, 2);
  assert.equal(matchingGuia[0][0], "Unidad 1");
  assert.equal(matchingGuia[1][0], "Unidad 2");

  // Búsqueda por nombre de carpeta
  const matchingEvaluaciones = filterMaterialsByQuery(folders, "evaluaciones");
  assert.equal(matchingEvaluaciones.length, 1);
  assert.equal(matchingEvaluaciones[0][0], "Evaluaciones");

  // Búsqueda por autor
  const matchingAuthor = filterMaterialsByQuery(folders, "Ayudante");
  assert.equal(matchingAuthor.length, 1);
  assert.equal(matchingAuthor[0][1][0].id, "f3");
});
