import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@libsql/client";
import {
  DEMO_EMPTY_SECTION,
  DEMO_FULL_SECTION,
  DEMO_FIXTURES,
  assertDemoTargets,
} from "../scripts/preview-demo-environment.mjs";
import { demoFirestoreDocuments, seedDemoTursoWithClient } from "../scripts/seed-preview-demo.mjs";

test("el sembrado de demo rechaza cualquier objetivo de producción", () => {
  assert.throws(
    () =>
      assertDemoTargets({
        environment: "production",
        firebaseProjectId: "centro-de-estudio-ubb-staging",
        tursoDatabaseUrl: "libsql://ceoubb-staging.example.turso.io",
      }),
    /PREVIEW_ENV_REQUIRED/
  );
  assert.throws(
    () =>
      assertDemoTargets({
        environment: "preview",
        firebaseProjectId: "centro-de-estudio-ubb",
        tursoDatabaseUrl: "libsql://ceoubb-staging.example.turso.io",
      }),
    /PRODUCTION_TARGET_REJECTED/
  );
  assert.throws(
    () =>
      assertDemoTargets({
        environment: "preview",
        firebaseProjectId: "centro-de-estudio-ubb-staging",
        tursoDatabaseUrl: "libsql://ceoubb-ceoubb.example.turso.io",
      }),
    /PRODUCTION_TARGET_REJECTED/
  );
  for (const environment of ["preview", "staging"]) {
    assert.doesNotThrow(() =>
      assertDemoTargets({
        environment,
        firebaseProjectId: "centro-de-estudio-ubb-staging",
        tursoDatabaseUrl: "libsql://ceoubb-staging.example.turso.io",
      })
    );
  }
});

test("el sembrado de demo es idempotente y acotado", async () => {
  const client = createClient({ url: "file::memory:" });
  try {
    const first = await seedDemoTursoWithClient(client);
    const second = await seedDemoTursoWithClient(client);
    assert.deepEqual(first, second);
    assert.deepEqual(second, {
      users: DEMO_FIXTURES.users.length,
      sections: DEMO_FIXTURES.sections.length,
      enrollments: DEMO_FIXTURES.enrollments.length,
    });
    assert.ok(second.users < 20);
    assert.ok(second.sections < 20);

    // La ficha de cada sección debe existir para que el portal muestre su nombre.
    const profiles = await client.execute("SELECT section_id, title FROM section_profiles");
    assert.equal(profiles.rows.length, 2);
  } finally {
    await client.close();
  }
});

test("sólo la sección poblada recibe contenido; la vacía se queda sin nada", () => {
  const documents = demoFirestoreDocuments();
  const paths = documents.map((document) => document.path);

  assert.ok(paths.some((path) => path.startsWith(`courses/${DEMO_FULL_SECTION}/posts/`)));
  assert.ok(paths.includes(`courses/${DEMO_FULL_SECTION}/meta/gradebook`));
  assert.ok(paths.some((path) => path.startsWith(`courses/${DEMO_FULL_SECTION}/grades/`)));

  // Ni una sola escritura puede caer sobre la sección que debe verse vacía.
  assert.ok(!paths.some((path) => path.startsWith(`courses/${DEMO_EMPTY_SECTION}/`)));

  // La sección vacía sí existe como matrícula del docente, sin estudiantes.
  const emptyEnrollments = DEMO_FIXTURES.enrollments.filter(
    (item) => item.seccionId === DEMO_EMPTY_SECTION
  );
  assert.equal(emptyEnrollments.length, 1);
  assert.equal(emptyEnrollments[0]?.rolSeccion, "teacher");
});

test("las ponderaciones del ramo poblado suman 100", () => {
  const total = DEMO_FIXTURES.evaluations.reduce((sum, item) => sum + item.weight, 0);
  assert.equal(total, 100);
});
