import type { ImportedQuizQuestion, QuizImportResult } from "../quizzes.ts";
import { MAX_IMPORTED_QUESTIONS, MAX_QUIZ_FILE_BYTES } from "../quizzes.ts";
import { escapeXml, fail } from "./errors.ts";
import { child, children, descendants, nodeText, parseXml, type XmlNode } from "./xml.ts";
import { createZip, openPackageZip, safePackagePath } from "./zip.ts";

const QTI = "http://www.imsglobal.org/xsd/imsqti_v2p1";
const encoder = new TextEncoder();
const text = (node: XmlNode | undefined) => nodeText(node).trim();
const idPattern = /^[A-Za-z][A-Za-z0-9_-]{0,127}$/;

function plain(node: XmlNode | undefined) {
  if (!node) return "";
  const allowed = new Set(["p", "br", "span", "prompt", "simpleChoice", "modalFeedback"]);
  const walk = (item: XmlNode): string => {
    if (!allowed.has(item.name) || item.namespace !== QTI)
      fail("El ítem contiene marcado enriquecido no representable.");
    if (
      Object.keys(item.attributes).some(
        (key) => !["identifier", "fixed", "outcomeIdentifier", "showHide"].includes(key)
      )
    )
      fail("El ítem contiene atributos de presentación no representables.");
    return item.content
      .map((part) => (typeof part === "string" ? part : part.name === "br" ? "\n" : walk(part)))
      .join("");
  };
  return walk(node).trim();
}

function shape(node: XmlNode): string {
  return JSON.stringify([
    node.name,
    Object.entries(node.attributes)
      .filter(([k]) => !k.startsWith("xmlns"))
      .sort(([a], [b]) => a.localeCompare(b)),
    node.content
      .filter((p) => typeof p !== "string" || p.trim())
      .map((p) => (typeof p === "string" ? p.trim() : shape(p))),
  ]);
}

function scoring(entry: ImportedQuizQuestion) {
  const { question: q, answer: a } = entry;
  const variable = '<variable identifier="RESPONSE"/>';
  let expression: string;
  if (q.kind === "short_answer") {
    expression =
      "<or>" +
      a.acceptedAnswers
        .map(
          (answer) =>
            '<stringMatch caseSensitive="false" substring="false">' +
            variable +
            '<baseValue baseType="string">' +
            escapeXml(answer) +
            "</baseValue></stringMatch>"
        )
        .join("") +
      "</or>";
  } else if (q.kind === "numerical") {
    expression =
      '<equal toleranceMode="absolute" tolerance="' +
      a.tolerance +
      '">' +
      variable +
      '<correct identifier="RESPONSE"/></equal>';
  } else expression = "<match>" + variable + '<correct identifier="RESPONSE"/></match>';
  return (
    "<responseProcessing><responseCondition><responseIf>" +
    expression +
    '<setOutcomeValue identifier="SCORE"><baseValue baseType="float">' +
    q.points +
    '</baseValue></setOutcomeValue></responseIf><responseElse><setOutcomeValue identifier="SCORE"><baseValue baseType="float">0</baseValue></setOutcomeValue></responseElse></responseCondition></responseProcessing>'
  );
}

function itemXml(entry: ImportedQuizQuestion) {
  const { question: q, answer: a } = entry;
  if (!idPattern.test(q.id) || q.options.some((o) => !idPattern.test(o.id)))
    fail("QTI requiere identificadores alfanuméricos iniciados con letra.");
  if (
    !Number.isFinite(q.points) ||
    q.points <= 0 ||
    q.points > 100 ||
    q.id !== a.questionId ||
    q.kind !== a.kind
  )
    fail("La pauta QTI no corresponde a la pregunta.");
  const choice = q.kind === "single_choice" || q.kind === "true_false";
  const baseType = choice ? "identifier" : q.kind === "numerical" ? "float" : "string";
  const correct = choice
    ? a.correctOptionId
    : q.kind === "numerical"
      ? String(a.numericalAnswer)
      : a.acceptedAnswers[0];
  if (!correct || (choice && !q.options.some((o) => o.id === correct)))
    fail("La pregunta no tiene una respuesta correcta exportable.");
  const body = choice
    ? '<choiceInteraction responseIdentifier="RESPONSE" maxChoices="1" shuffle="false"><prompt>' +
      escapeXml(q.prompt) +
      "</prompt>" +
      q.options
        .map(
          (o) =>
            '<simpleChoice identifier="' +
            escapeXml(o.id) +
            '">' +
            escapeXml(o.label) +
            "</simpleChoice>"
        )
        .join("") +
      "</choiceInteraction>"
    : "<p>" + escapeXml(q.prompt) + '</p><textEntryInteraction responseIdentifier="RESPONSE"/>';
  const feedback = a.feedback
    ? '<outcomeDeclaration identifier="FEEDBACK" cardinality="single" baseType="identifier"><defaultValue><value>general</value></defaultValue></outcomeDeclaration>'
    : "";
  return (
    '<?xml version="1.0" encoding="UTF-8"?><assessmentItem xmlns="' +
    QTI +
    '" identifier="' +
    escapeXml(q.id) +
    '" title="' +
    escapeXml(q.title) +
    '" label="' +
    q.kind +
    '" adaptive="false" timeDependent="false"><responseDeclaration identifier="RESPONSE" cardinality="single" baseType="' +
    baseType +
    '"><correctResponse><value>' +
    escapeXml(correct) +
    '</value></correctResponse></responseDeclaration><outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float"/>' +
    feedback +
    "<itemBody>" +
    body +
    "</itemBody>" +
    scoring(entry) +
    (a.feedback
      ? '<modalFeedback outcomeIdentifier="FEEDBACK" identifier="general" showHide="show">' +
        escapeXml(a.feedback) +
        "</modalFeedback>"
      : "") +
    "</assessmentItem>"
  );
}

function parseItem(root: XmlNode, sourceLine: number): ImportedQuizQuestion {
  if (root.name !== "assessmentItem" || root.namespace !== QTI)
    fail("Sólo se admiten ítems QTI 2.1.");
  if (root.attributes.adaptive !== "false" || root.attributes.timeDependent !== "false")
    fail("Los ítems adaptativos o temporizados no están soportados.");
  const allowedRoot = new Set([
    "responseDeclaration",
    "outcomeDeclaration",
    "itemBody",
    "responseProcessing",
    "modalFeedback",
  ]);
  if (root.children.some((n) => n.namespace !== QTI || !allowedRoot.has(n.name)))
    fail("El ítem contiene elementos QTI no soportados.");
  const declarations = children(root, "responseDeclaration");
  const bodies = children(root, "itemBody");
  const processors = children(root, "responseProcessing");
  if (declarations.length !== 1 || bodies.length !== 1 || processors.length !== 1)
    fail("El ítem necesita una respuesta, un cuerpo y un procesamiento.");
  const declaration = declarations[0];
  if (
    declaration.attributes.cardinality !== "single" ||
    declaration.children.some((n) => n.name !== "correctResponse")
  )
    fail(
      "Las respuestas múltiples, valores por defecto y puntuaciones parciales no están soportados."
    );
  const correctValues = children(child(declaration, "correctResponse"), "value");
  if (correctValues.length !== 1) fail("Falta una respuesta correcta única.");
  const interactions = bodies[0].children.filter((n) => n.name.endsWith("Interaction"));
  if (interactions.length !== 1) fail("El ítem requiere una interacción simple.");
  const interaction = interactions[0];
  if (interaction.attributes.responseIdentifier !== declaration.attributes.identifier)
    fail("La interacción no coincide con la declaración de respuesta.");
  if (declaration.attributes.identifier !== "RESPONSE") {
    const original = declaration.attributes.identifier;
    if (!original) fail("Falta identificador de respuesta.");
    const rename = (n: XmlNode) => {
      if (n.attributes.responseIdentifier === original)
        n.attributes.responseIdentifier = "RESPONSE";
      if (
        ["responseDeclaration", "variable", "correct"].includes(n.name) &&
        n.attributes.identifier === original
      )
        n.attributes.identifier = "RESPONSE";
      n.children.forEach(rename);
    };
    rename(root);
  }
  const id = root.attributes.identifier;
  if (!idPattern.test(id ?? "")) fail("El identificador del ítem no es compatible.");
  const entry: ImportedQuizQuestion = {
    sourceLine,
    question: {
      id,
      title: root.attributes.title ?? "",
      prompt: "",
      kind: "single_choice",
      options: [],
      points: 1,
    },
    answer: {
      questionId: id,
      kind: "single_choice",
      acceptedAnswers: [],
      correctOptionId: null,
      numericalAnswer: null,
      tolerance: 0,
      feedback: "",
    },
  };
  const q = entry.question;
  const a = entry.answer;
  if (
    interaction.name === "choiceInteraction" &&
    declaration.attributes.baseType === "identifier"
  ) {
    if (
      interaction.attributes.maxChoices !== "1" ||
      (interaction.attributes.minChoices && !["0", "1"].includes(interaction.attributes.minChoices))
    )
      fail("Sólo se admite alternativa única.");
    if (
      bodies[0].children.length !== 1 ||
      interaction.children.some((n) => !["prompt", "simpleChoice"].includes(n.name))
    )
      fail("El contenido del ítem no es representable.");
    q.prompt = plain(child(interaction, "prompt"));
    q.options = children(interaction, "simpleChoice").map((n) => ({
      id: n.attributes.identifier,
      label: plain(n),
    }));
    if (
      q.options.length < 2 ||
      q.options.length > 10 ||
      new Set(q.options.map((o) => o.id)).size !== q.options.length ||
      q.options.some((o) => !idPattern.test(o.id ?? "") || !o.label || o.label.length > 1000)
    )
      fail("Las alternativas no son válidas.");
    a.correctOptionId = text(correctValues[0]);
    if (!q.options.some((o) => o.id === a.correctOptionId))
      fail("La respuesta correcta no aparece entre las alternativas.");
    if (root.attributes.label === "true_false" && q.options.length === 2)
      q.kind = a.kind = "true_false";
  } else if (
    interaction.name === "textEntryInteraction" &&
    ["string", "float", "integer"].includes(declaration.attributes.baseType)
  ) {
    if (
      bodies[0].children.some((n) => n !== interaction && n.name !== "p") ||
      interaction.children.length
    )
      fail("La respuesta contiene presentación no soportada.");
    q.prompt = bodies[0].children
      .filter((n) => n !== interaction)
      .map(plain)
      .join("\n");
    if (declaration.attributes.baseType === "string") {
      q.kind = a.kind = "short_answer";
      a.acceptedAnswers = descendants(processors[0], "stringMatch").map((n) =>
        nodeText(child(n, "baseValue"))
      );
      if (
        !a.acceptedAnswers.length ||
        a.acceptedAnswers.length > 50 ||
        a.acceptedAnswers.some((s) => !s.trim() || s.length > 500)
      )
        fail("La respuesta corta requiere stringMatch sin distinción de mayúsculas.");
    } else {
      q.kind = a.kind = "numerical";
      a.numericalAnswer = Number(text(correctValues[0]));
      const equal = descendants(processors[0], "equal");
      a.tolerance = equal.length ? Number(equal[0].attributes.tolerance) : 0;
      if (!Number.isFinite(a.numericalAnswer) || !Number.isFinite(a.tolerance) || a.tolerance < 0)
        fail("Respuesta numérica no válida.");
    }
  } else fail("La interacción QTI no está soportada por el motor de cuestionarios.");
  if (!q.title.trim() || q.title.length > 160 || !q.prompt || q.prompt.length > 3000)
    fail("El título o enunciado excede los límites del cuestionario.");
  const processor = processors[0];
  if (processor.attributes.template) {
    if (
      ![
        "http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct",
        "https://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct",
      ].includes(processor.attributes.template) ||
      processor.children.length ||
      q.kind === "short_answer"
    )
      fail("El procesamiento QTI no es compatible.");
  } else {
    const awarded = child(
      child(child(processor, "responseCondition"), "responseIf"),
      "setOutcomeValue"
    );
    q.points = Number(text(child(awarded, "baseValue")));
    if (!Number.isFinite(q.points) || q.points <= 0 || q.points > 100)
      fail("Puntaje QTI inválido.");
    const expected = parseXml(encoder.encode(scoring(entry)));
    if (shape(processor) !== shape(expected))
      fail("La lógica de corrección QTI no está soportada.");
  }
  const feedback = children(root, "modalFeedback");
  const outcomes = children(root, "outcomeDeclaration");
  if (
    outcomes.some((n) => !["SCORE", "FEEDBACK"].includes(n.attributes.identifier)) ||
    outcomes.filter((n) => n.attributes.identifier === "SCORE").length !== 1
  )
    fail("El ítem contiene resultados no soportados.");
  if (feedback.length) {
    const f = feedback[0];
    const declaration = outcomes.find((n) => n.attributes.identifier === "FEEDBACK");
    if (
      feedback.length !== 1 ||
      f.attributes.identifier !== "general" ||
      f.attributes.showHide !== "show" ||
      f.attributes.outcomeIdentifier !== "FEEDBACK" ||
      text(child(child(declaration, "defaultValue"), "value")) !== "general"
    )
      fail("La retroalimentación condicional no está soportada.");
    a.feedback = plain(f);
    if (a.feedback.length > 1000) fail("La retroalimentación excede 1000 caracteres.");
  }
  return entry;
}

export function exportQtiBank(questions: ImportedQuizQuestion[]) {
  if (
    !questions.length ||
    questions.length > MAX_IMPORTED_QUESTIONS ||
    new Set(questions.map((q) => q.question.id)).size !== questions.length
  )
    fail("El banco debe contener de 1 a 500 preguntas con identificadores únicos.");
  const entries = questions.map((q, i) => ({
    name: "items/item-" + (i + 1) + ".xml",
    bytes: encoder.encode(itemXml(q)),
  }));
  const manifest =
    '<?xml version="1.0" encoding="UTF-8"?><manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" identifier="ceoubb-bank"><organizations/><resources>' +
    entries
      .map(
        (e, i) =>
          '<resource identifier="r' +
          i +
          '" type="imsqti_item_xmlv2p1" href="' +
          e.name +
          '"><file href="' +
          e.name +
          '"/></resource>'
      )
      .join("") +
    "</resources></manifest>";
  const zip = createZip([{ name: "imsmanifest.xml", bytes: encoder.encode(manifest) }, ...entries]);
  if (zip.length > MAX_QUIZ_FILE_BYTES)
    fail("El banco QTI exportado supera 2 MiB. Divide las preguntas en bancos más pequeños.", 413);
  return zip;
}

export async function importQtiBank(bytes: Uint8Array): Promise<QuizImportResult> {
  if (bytes.length > MAX_QUIZ_FILE_BYTES) fail("El banco QTI supera 2 MiB.", 413);
  const result: QuizImportResult = { questions: [], warnings: [] };
  const ids = new Set<string>();
  const append = (root: XmlNode, index: number) => {
    try {
      const parsed = parseItem(root, index + 1);
      if (ids.has(parsed.question.id)) fail("El banco repite un identificador de pregunta.");
      ids.add(parsed.question.id);
      result.questions.push(parsed);
    } catch (error) {
      result.warnings.push({
        sourceLine: index + 1,
        message:
          (root.attributes.title || root.attributes.identifier || "Ítem") +
          ": " +
          (error instanceof Error ? error.message : "Ítem no compatible."),
      });
    }
  };
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    append(parseXml(bytes), 0);
  } else {
    const archive = await openPackageZip(bytes);
    if (!archive.has("imsmanifest.xml")) fail("El banco ZIP no contiene imsmanifest.xml.");
    if (archive.entries.reduce((n, e) => n + e.size, 0) > MAX_QUIZ_FILE_BYTES)
      fail("El banco QTI expandido supera 2 MiB.", 413);
    const manifest = parseXml(await archive.read("imsmanifest.xml", 1024 * 1024));
    if (manifest.name !== "manifest") fail("Manifiesto QTI inválido.");
    const resources = children(child(manifest, "resources"), "resource");
    if (resources.length > MAX_IMPORTED_QUESTIONS) fail("El banco supera 500 ítems.");
    for (const [index, resource] of resources.entries()) {
      if (resource.attributes.type !== "imsqti_item_xmlv2p1") {
        result.warnings.push({
          sourceLine: index + 1,
          message: "El recurso no es un ítem QTI 2.1.",
        });
        continue;
      }
      const path = safePackagePath(resource.attributes.href ?? "");
      if (!archive.has(path)) fail("El manifiesto QTI referencia un archivo ausente.");
      append(parseXml(await archive.read(path, 1024 * 1024)), index);
    }
  }
  return result;
}
