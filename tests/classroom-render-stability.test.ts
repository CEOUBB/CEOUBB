import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/*
  REQ-PERF-08 memoiza cada fila del libro de notas docente con `React.memo`. El
  memo sólo acierta si las funciones que la fila recibe conservan su identidad
  entre renders. Todos los manejadores del aula nacen en `useClassroomHandlers` y
  bajan hasta la fila; si alguno vuelve a declararse como flecha suelta, cada
  patch de Firestore re-renderiza la grilla completa y el memo deja de servir.

  No hay renderizador de React en esta batería (`node --test` sin DOM ni
  `react-test-renderer`), así que la identidad no se mide en ejecución: se exige
  estructuralmente sobre el código fuente, igual que en
  `tests/publication-workflow.test.ts`.
*/

const HANDLERS_PATH = new URL("../app/views/classroom/use-classroom-handlers.ts", import.meta.url);
const GRADES_PATH = new URL("../app/views/classroom/GradesSection.tsx", import.meta.url);

const MEMOIZED_HANDLERS = [
  "note",
  "rejectReadOnly",
  "publish",
  "editPost",
  "deletePost",
  "openAttachment",
  "copyCourseReference",
  "saveLiveClass",
  "clearLiveClass",
];

test("REQ-PERF-08: cada manejador de useClassroomHandlers se declara con useCallback", async () => {
  const source = await readFile(HANDLERS_PATH, "utf8");
  for (const name of MEMOIZED_HANDLERS) {
    assert.match(
      source,
      new RegExp(`const ${name} = useCallback\\(`),
      `«${name}» debe declararse con useCallback para conservar su identidad entre renders.`
    );
    assert.doesNotMatch(
      source,
      new RegExp(`const ${name} = (async )?\\(`),
      `«${name}» no puede volver a ser una flecha suelta: rompe el memo de TeacherStudentRow.`
    );
  }
});

test("REQ-PERF-08: la fila del libro de notas docente sigue memoizada y con props estables", async () => {
  const source = await readFile(GRADES_PATH, "utf8");

  assert.match(source, /\/\/ Implements: REQ-PERF-08/);
  assert.match(source, /const TeacherStudentRow = React\.memo\(function TeacherStudentRow\(/);

  for (const name of ["handleSetScore", "openFeedback", "openHistory"]) {
    assert.match(
      source,
      new RegExp(`const ${name} = useCallback\\(`),
      `«${name}» debe seguir memoizado: viaja como prop hacia TeacherStudentRow.`
    );
  }

  /* Los objetos por defecto tienen que ser constantes de módulo; un `{}` en línea
     daría una identidad nueva por render y anularía el memo igual que una flecha. */
  assert.match(source, /^const EMPTY_SCORES: GradeScores = \{\};$/m);
  assert.match(source, /^const EMPTY_FEEDBACK: GradeFeedback = \{\};$/m);
});
