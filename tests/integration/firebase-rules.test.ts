import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test, { before, after, beforeEach } from "node:test";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "centro-de-estudio-ubb-test",
    firestore: {
      rules: readFileSync(resolve("firebase/firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
    storage: {
      rules: readFileSync(resolve("firebase/storage.rules"), "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

// Implements: REQ-SEC-02
test("REQ-SEC-02 (AST): Estudiante matriculado accede a cursos/{id} y estudiante no matriculado es rechazado", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await adminDb.doc("enrollments/student_123/sections/sec_mat101").set({
      active: true,
      role: "student",
      seccionId: "sec_mat101",
    });
    await adminDb.doc("courses/sec_mat101").set({
      nombre: "Cálculo I",
      periodo: "2026-1",
    });
  });

  const enrolledContext = testEnv.authenticatedContext("student_123", {
    email: "alumno@alumnos.ubiobio.cl",
  });
  await assertSucceeds(enrolledContext.firestore().doc("courses/sec_mat101").get());

  const foreignContext = testEnv.authenticatedContext("student_999", {
    email: "otro@alumnos.ubiobio.cl",
  });
  await assertFails(foreignContext.firestore().doc("courses/sec_mat101").get());
});

// Implements: REQ-SEC-02
test("REQ-SEC-02 (AST): La proyección enrollments/{uid}/sections/{seccionId} es de sólo lectura para clientes", async () => {
  const studentContext = testEnv.authenticatedContext("student_123", {
    email: "alumno@alumnos.ubiobio.cl",
  });
  await assertFails(
    studentContext.firestore().doc("enrollments/student_123/sections/sec_fake").set({
      active: true,
      role: "student",
    })
  );
});
