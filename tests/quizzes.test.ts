import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  MAX_IMPORTED_QUESTIONS,
  QUIZ_REQUIREMENTS,
  parseGift,
  parseQuizCsv,
} from "../lib/quizzes.ts";

test("REQ-QUIZ-01 importa los cuatro tipos GIFT compatibles", () => {
  const result = parseGift(`
::Derivada::¿Cuál es la derivada de x^2?{=2x#Correcto ~x ~x^3}

::Afirmación::La aceleración es vectorial.{TRUE#Es una magnitud vectorial.}

::Unidad::Unidad SI de fuerza.{=newton =N}

::Constante::Valor aproximado de pi.{#3.14:0.01#Se acepta tolerancia de 0,01.}
`);
  assert.equal(result.warnings.length, 0);
  assert.deepEqual(
    result.questions.map((item) => item.question.kind),
    ["single_choice", "true_false", "short_answer", "numerical"]
  );
  assert.equal(result.questions[0].question.prompt, "¿Cuál es la derivada de x^2?");
  assert.equal(result.questions[0].answer.feedback, "Correcto");
  assert.deepEqual(result.questions[2].answer.acceptedAnswers, ["newton", "N"]);
  assert.equal(result.questions[3].answer.tolerance, 0.01);
});

test("REQ-QUIZ-01 conserva escapes GIFT como texto inerte", () => {
  const result = parseGift(String.raw`::Escape::Selecciona a\~b y evita \{x\}.{=a\~b ~x\=y}`);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.questions[0].question.options[0].label, "a~b");
  assert.equal(result.questions[0].question.options[1].label, "x=y");
});

test("REQ-QUIZ-02 informa preguntas GIFT no compatibles", () => {
  const result = parseGift(
    `::Ensayo::Desarrolle el teorema.{}\n\n::Asociación::Asocie.{=A -> 1 ~B -> 2}`
  );
  assert.equal(result.questions.length, 0);
  assert.equal(result.warnings.length, 2);
  assert.match(result.warnings[0].message, /ensayo/i);
  assert.match(result.warnings[1].message, /asociación/i);
});

test("REQ-QUIZ-01 importa CSV con comas y saltos de línea entre comillas", () => {
  const result = parseQuizCsv(
    "tipo,titulo,pregunta,respuesta_correcta,opcion_1,opcion_2,retroalimentacion\n" +
      'alternativa,"Vectores, I","Primera línea\nsegunda línea",B,Escalar,Vectorial,"Bien, es vectorial"\n' +
      "numerica,Raíz,Raíz de 4,2:0.01,,,Exacto"
  );
  assert.equal(result.warnings.length, 0);
  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[0].question.prompt, "Primera línea\nsegunda línea");
  assert.equal(result.questions[0].answer.correctOptionId, "q-1-o-2");
  assert.equal(result.questions[1].answer.numericalAnswer, 2);
});

test("REQ-QUIZ-02 limita bancos masivos", () => {
  const gift = Array.from(
    { length: MAX_IMPORTED_QUESTIONS + 1 },
    (_, index) => `::P${index}::Pregunta ${index}{TRUE}`
  ).join("\n\n");
  const result = parseGift(gift);
  assert.equal(result.questions.length, MAX_IMPORTED_QUESTIONS);
  assert.match(result.warnings.at(-1)?.message ?? "", /se detuvo/i);
});

test("REQ-QUIZ-03 protege la pauta y las escrituras de resultado en reglas", async () => {
  const rules = await readFile(new URL("../firebase/firestore.rules", import.meta.url), "utf8");
  assert.match(rules, /match \/courses\/\{courseId\}\/quizKeys\/\{quizId\}/);
  assert.match(rules, /match \/courses\/\{courseId\}\/quizzes\/\{quizId\}/);
  assert.match(rules, /match \/results\/\{userId\}/);
  assert.ok(QUIZ_REQUIREMENTS.includes("REQ-QUIZ-10"));
});
