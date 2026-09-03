import assert from "node:assert/strict";
import test from "node:test";
import { parseXml, nodeText } from "../lib/interop/xml.ts";
import { createZip, openPackageZip } from "../lib/interop/zip.ts";
import { inspectLearningPackage } from "../lib/interop/packages.ts";
import { exportQtiBank, importQtiBank } from "../lib/interop/qti.ts";
import { createScormRuntime, validateScormData } from "../lib/interop/scorm.ts";
import { validateStatement } from "../lib/interop/xapi.ts";
import { parseGift } from "../lib/quizzes.ts";

const bytes = (s: string) => new TextEncoder().encode(s);

test("REQ-IO-09 exportación respeta el límite que permite reimportar el banco", () => {
  const [entry] = parseGift("::Título::Pregunta {=Correcta~Incorrecta}").questions;
  const bank = Array.from({ length: 500 }, (_, i) => ({
    ...entry,
    question: {
      ...entry.question,
      id: "q" + i,
      prompt: "x".repeat(3000),
      options: entry.question.options.map((o) => ({ ...o, label: "y".repeat(1000) })),
    },
    answer: { ...entry.answer, questionId: "q" + i },
  }));
  assert.throws(() => exportQtiBank(bank), /exportado supera 2 MiB/);
});

test("REQ-IO-05 rechaza nombres ambiguos y enlaces simbólicos antes de extraer ZIP", async () => {
  const original = createZip([{ name: "index.html", bytes: bytes("prueba") }]);
  const central = new DataView(original.buffer).getUint32(original.length - 6, true);
  const nul = original.slice();
  nul[35] = 0;
  nul[central + 51] = 0;
  await assert.rejects(() => openPackageZip(nul));
  const mismatch = original.slice();
  mismatch[30] = 120;
  await assert.rejects(() => openPackageZip(mismatch));
  const symlink = original.slice();
  new DataView(symlink.buffer).setUint32(central + 38, 0xa1ff0000, true);
  await assert.rejects(() => openPackageZip(symlink));
});

test("REQ-IO-07 primer commit conserva avance aunque las puntuaciones sigan sin informar", () => {
  for (const kind of ["scorm12", "scorm2004"] as const) {
    let saved: Record<string, string> = {};
    const runtime = createScormRuntime(kind, {}, (data) => {
      saved = validateScormData(kind, data);
      return true;
    });
    assert.equal(runtime.Initialize(""), "true");
    assert.equal(runtime.SetValue("cmi.suspend_data", "primera página"), "true");
    assert.equal(runtime.Commit(""), "true");
    assert.equal(saved["cmi.suspend_data"], "primera página");
    assert.equal(
      Object.keys(saved).some((key) => key.includes("score")),
      false
    );
  }
});
const scorm = (items = '<item identifier="i" identifierref="s"/>') =>
  bytes(
    '<manifest xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" identifier="m"><metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata><organizations default="o"><organization identifier="o"><title>Prueba</title>' +
      items +
      '</organization></organizations><resources><resource identifier="s" type="webcontent" adlcp:scormtype="sco" href="index.html"><file href="index.html"/></resource></resources></manifest>'
  );

test("REQ-IO-05/09 XML conserva texto mixto y rechaza DTD, entidades, prefijos y cierres inválidos", () => {
  assert.equal(
    nodeText(parseXml(bytes('<p xmlns="urn:test">Antes <b>del</b> final</p>'))),
    "Antes del final"
  );
  for (const source of [
    "<!DOCTYPE p><p/>",
    "<p>&evil;</p>",
    "<p>&</p>",
    "<a:p/>",
    "<p><b></p>",
    "<p/>basura",
    '<p x="1" x="2"/>',
  ]) {
    assert.throws(() => parseXml(bytes(source)));
  }
});

test("REQ-IO-05 ZIP canónico, traversal, CRC y límites", async () => {
  const zip = createZip([{ name: "carpeta/prueba.txt", bytes: bytes("hola") }]);
  const archive = await openPackageZip(zip);
  assert.equal(new TextDecoder().decode(await archive.read("carpeta/prueba.txt")), "hola");
  for (const name of ["../escape", "/absolute", "x/%2e%2e/a", "a\\b", "a?b"]) {
    assert.throws(() => createZip([{ name, bytes: bytes("x") }]));
  }
  const corrupted = zip.slice();
  corrupted[30 + "carpeta/prueba.txt".length] ^= 1;
  const broken = await openPackageZip(corrupted);
  await assert.rejects(() => broken.read("carpeta/prueba.txt"));
  await assert.rejects(() => openPackageZip(new Uint8Array(50 * 1024 * 1024 + 1)));
});

test("REQ-IO-05 SCORM detecta versión, recurso y rechaza múltiples SCO o destinos externos", async () => {
  const make = (manifest: Uint8Array) =>
    createZip([
      { name: "imsmanifest.xml", bytes: manifest },
      { name: "index.html", bytes: bytes("<h1>Hola</h1>") },
    ]);
  const result = await inspectLearningPackage(make(scorm()));
  assert.equal(result.manifest.kind, "scorm12");
  assert.equal(result.manifest.launchPath, "index.html");
  await assert.rejects(() =>
    inspectLearningPackage(
      make(
        scorm('<item identifier="i" identifierref="s"/><item identifier="j" identifierref="s"/>')
      )
    )
  );
  await assert.rejects(() =>
    inspectLearningPackage(
      make(
        bytes(
          new TextDecoder()
            .decode(scorm())
            .replace('href="index.html"', 'href="https://evil.test/a"')
        )
      )
    )
  );
});

test("REQ-IO-09 QTI round-trip conserva alternativas, respuesta corta, numérica, puntos y feedback", async () => {
  const bank = parseGift(
    "::Capital::Capital de Chile {=Santiago~Lima}\n\n::Texto::Saludo {=hola=Hola}\n\n::Valor::Resultado {#3.14:0.01}"
  );
  assert.equal(bank.questions.length, 3);
  bank.questions[0].question.points = 2;
  bank.questions[0].answer.feedback = "Revisa el mapa.";
  const result = await importQtiBank(exportQtiBank(bank.questions));
  assert.deepEqual(result.warnings, []);
  assert.equal(result.questions.length, 3);
  for (let i = 0; i < 3; i++) {
    assert.deepEqual(result.questions[i].question, bank.questions[i].question);
    assert.deepEqual(result.questions[i].answer, bank.questions[i].answer);
  }
});

test("REQ-IO-09 QTI externo válido y omisión explícita de interacciones incompatibles", async () => {
  const item =
    '<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1" identifier="external" title="Pregunta" adaptive="false" timeDependent="false"><responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier"><correctResponse><value>b</value></correctResponse></responseDeclaration><outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float"/><itemBody><choiceInteraction responseIdentifier="RESPONSE" maxChoices="1"><prompt>¿Cuál?</prompt><simpleChoice identifier="a">Uno</simpleChoice><simpleChoice identifier="b">Dos</simpleChoice></choiceInteraction></itemBody><responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct"/></assessmentItem>';
  const result = await importQtiBank(bytes(item));
  assert.equal(result.questions[0].answer.correctOptionId, "b");
  const omitted = await importQtiBank(
    bytes(item.replaceAll("choiceInteraction", "orderInteraction"))
  );
  assert.equal(omitted.questions.length, 0);
  assert.equal(omitted.warnings.length, 1);
  await assert.rejects(() =>
    importQtiBank(bytes('<!DOCTYPE p [<!ENTITY x SYSTEM "file:///etc/passwd">]><p/>'))
  );
});

test("REQ-IO-07 SCORM ciclo, límites, errores y persistencia", () => {
  const saved: Record<string, string>[] = [];
  const runtime = createScormRuntime(
    "scorm12",
    { "cmi.core.lesson_location": "pagina2" },
    (data) => {
      saved.push(data);
      return true;
    }
  );
  assert.equal(runtime.LMSGetValue("cmi.core.lesson_location"), "");
  assert.equal(runtime.LMSGetLastError(), "301");
  assert.equal(runtime.LMSInitialize(""), "true");
  assert.equal(runtime.LMSGetValue("cmi.core.lesson_location"), "pagina2");
  assert.equal(runtime.LMSSetValue("cmi.core.lesson_status", "completed"), "true");
  assert.equal(runtime.LMSSetValue("cmi.suspend_data", "x".repeat(4097)), "false");
  assert.equal(runtime.LMSSetValue("cmi.core.student_id", "otro"), "false");
  assert.equal(runtime.LMSSetValue("cmi.core.score.raw", "NaN"), "false");
  assert.equal(runtime.LMSCommit(""), "true");
  assert.equal(saved[0]["cmi.core.lesson_status"], "completed");
  assert.equal(runtime.LMSFinish(""), "true");
  assert.equal(runtime.LMSCommit(""), "false");
});

test("REQ-IO-08 xAPI exige actor, actividad y resultado coherentes", () => {
  const context = {
    actorId: "u1",
    activityId: "https://example.test/activity",
    registration: "52d6a976-61c7-43af-a02e-45574ae6922b",
    platformOrigin: "https://portal.test",
  };
  const statement = {
    id: "5383a07c-bb63-45fb-85e1-fc608b54e88c",
    actor: { objectType: "Agent", account: { homePage: context.platformOrigin, name: "u1" } },
    verb: { id: "http://adlnet.gov/expapi/verbs/completed" },
    object: { objectType: "Activity", id: context.activityId },
    context: { registration: context.registration },
    result: { completion: true, score: { scaled: 1, raw: 10, min: 0, max: 10 } },
  };
  assert.equal(validateStatement(statement, context).id, statement.id);
  assert.throws(() =>
    validateStatement({ ...statement, actor: { mbox: "mailto:other@example.test" } }, context)
  );
  assert.throws(() =>
    validateStatement({ ...statement, result: { score: { scaled: 2 } } }, context)
  );
  assert.throws(() =>
    validateStatement({ ...statement, object: { id: "https://other.test" } }, context)
  );
});
