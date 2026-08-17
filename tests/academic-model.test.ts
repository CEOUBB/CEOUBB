import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import {
  asignaturas,
  carreras,
  departamentos,
  facultades,
  gradeAuditLogs,
  matriculas,
  periodos,
  secciones,
} from "../db/schema.ts";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  boundedLimit,
} from "../lib/services/academic-catalog.ts";

function columns(table: Parameters<typeof getTableConfig>[0]) {
  return new Set(getTableConfig(table).columns.map((column) => column.name));
}

function indexNames(table: Parameters<typeof getTableConfig>[0]) {
  return new Set(getTableConfig(table).indexes.map((entry) => entry.config.name));
}

function foreignTargets(table: Parameters<typeof getTableConfig>[0]) {
  return new Set(
    getTableConfig(table).foreignKeys.map(
      (key) => getTableConfig(key.reference().foreignTable).name
    )
  );
}

test("the academic hierarchy declares every institutional table", () => {
  assert.equal(getTableConfig(facultades).name, "facultades");
  assert.equal(getTableConfig(departamentos).name, "departamentos");
  assert.equal(getTableConfig(carreras).name, "carreras");
  assert.equal(getTableConfig(asignaturas).name, "asignaturas");
  assert.equal(getTableConfig(periodos).name, "periodos");
  assert.equal(getTableConfig(secciones).name, "secciones");
  assert.equal(getTableConfig(matriculas).name, "matriculas");
  assert.equal(getTableConfig(gradeAuditLogs).name, "grade_audit_logs");
});

test("faculties, departments and degree programs chain by foreign key", () => {
  assert.deepEqual([...columns(facultades)].sort(), ["id", "nombre", "sede"]);
  assert.ok(foreignTargets(departamentos).has("facultades"));
  assert.ok(foreignTargets(carreras).has("departamentos"));
  assert.ok(foreignTargets(asignaturas).has("departamentos"));
});

test("a section is asignatura x periodo x numero and cannot repeat", () => {
  const config = getTableConfig(secciones);
  const unique = config.indexes.find(
    (entry) => entry.config.name === "idx_seccion_asignatura_periodo_num"
  );
  assert.ok(unique, "the compound section index is missing");
  assert.equal(unique.config.unique, true);
  assert.deepEqual(
    unique.config.columns.map((column) => (column as { name: string }).name),
    ["asignatura_id", "periodo_id", "numero_seccion"]
  );
  assert.deepEqual(foreignTargets(secciones), new Set(["asignaturas", "periodos", "users"]));
});

test("an enrollment is unique per section and user and carries a lifecycle state", () => {
  const config = getTableConfig(matriculas);
  const unique = config.indexes.find(
    (entry) => entry.config.name === "idx_matriculas_seccion_usuario"
  );
  assert.ok(unique, "the unique enrollment index is missing");
  assert.equal(unique.config.unique, true);
  assert.ok(indexNames(matriculas).has("idx_matriculas_usuario"));

  const estado = config.columns.find((column) => column.name === "estado");
  assert.deepEqual(estado?.enumValues, ["activa", "retirada", "congelada"]);
  const rol = config.columns.find((column) => column.name === "rol_seccion");
  assert.deepEqual(rol?.enumValues, ["teacher", "student", "assistant", "coordinator"]);
});

test("the grade audit log records the full mutation tuple", () => {
  assert.deepEqual([...columns(gradeAuditLogs)].sort(), [
    "actor_id",
    "evaluacion_id",
    "id",
    "ip_address",
    "new_score",
    "prev_score",
    "seccion_id",
    "student_id",
    "timestamp",
  ]);
  assert.ok(indexNames(gradeAuditLogs).has("idx_grade_audit_seccion_student"));
  const prevScore = getTableConfig(gradeAuditLogs).columns.find(
    (column) => column.name === "prev_score"
  );
  assert.equal(prevScore?.notNull, false, "a first grade has no previous score");
});

test("deleting a section cascades to its enrollments but never to its teacher", () => {
  const cascades = getTableConfig(matriculas).foreignKeys.map((key) => ({
    table: getTableConfig(key.reference().foreignTable).name,
    onDelete: key.onDelete,
  }));
  assert.deepEqual(
    cascades.sort((a, b) => a.table.localeCompare(b.table)),
    [
      { table: "secciones", onDelete: "cascade" },
      { table: "users", onDelete: "cascade" },
    ]
  );
  const docente = getTableConfig(secciones).foreignKeys.find(
    (key) => getTableConfig(key.reference().foreignTable).name === "users"
  );
  assert.equal(docente?.onDelete, undefined, "removing a teacher must not delete their sections");
});

test("every page size is clamped so no query can run unbounded", () => {
  assert.equal(boundedLimit(undefined), DEFAULT_PAGE_SIZE);
  assert.equal(boundedLimit(Number.NaN), DEFAULT_PAGE_SIZE);
  assert.equal(boundedLimit(0), 1);
  assert.equal(boundedLimit(-40), 1);
  assert.equal(boundedLimit(10.9), 10);
  assert.equal(boundedLimit(MAX_PAGE_SIZE), MAX_PAGE_SIZE);
  assert.equal(boundedLimit(100000), MAX_PAGE_SIZE);
});

test("the academic catalog never issues a query without a limit", async () => {
  const source = await readFile(
    new URL("../lib/services/academic-catalog.ts", import.meta.url),
    "utf8"
  );
  const queries = source.split(".select(").slice(1);
  assert.ok(queries.length > 0, "the catalog declares no query at all");
  for (const query of queries) {
    const statement = query.slice(0, query.indexOf(";"));
    assert.ok(statement.includes(".limit("), `an unbounded query survives: .select(${statement}`);
  }
});

test("the academic tables are materialized in a generated migration", async () => {
  const dir = new URL("../drizzle/", import.meta.url);
  const files = (await readdir(dir)).filter((name) => name.endsWith(".sql"));
  const sql = (await Promise.all(files.map((name) => readFile(new URL(name, dir), "utf8")))).join(
    "\n"
  );
  for (const table of [
    "facultades",
    "departamentos",
    "carreras",
    "asignaturas",
    "periodos",
    "secciones",
    "matriculas",
    "grade_audit_logs",
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE \`${table}\``));
  }
  assert.match(sql, /CREATE UNIQUE INDEX `idx_seccion_asignatura_periodo_num`/);
  assert.match(sql, /CREATE UNIQUE INDEX `idx_matriculas_seccion_usuario`/);
});
