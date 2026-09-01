import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  CONTENT_TYPES,
  DEFAULT_EDITOR_STORAGE_KEY,
  EDITOR_MODES,
  NOTIFICATION_MODES,
  clearPublicationDraft,
  createPublicationDraft,
  draftStorageKey,
  persistDefaultEditor,
  persistPublicationDraft,
  readDefaultEditor,
  readPublicationDraft,
  readingStats,
  templateForContentType,
  type PublicationPreferenceStorage,
} from "../lib/publication-workflow.ts";
import { MAX_POST_ATTACHMENTS, toAttachments } from "../lib/firebase/mappers.ts";

function memoryStorage(initial: Record<string, string> = {}): PublicationPreferenceStorage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

test("REQ-PUB-01/02/04 validates and persists only supported editor modes", () => {
  const storage = memoryStorage({ [DEFAULT_EDITOR_STORAGE_KEY]: "markdown" });
  assert.equal(DEFAULT_EDITOR_STORAGE_KEY, "ceoubb_default_editor");
  assert.equal(readDefaultEditor(storage), "markdown");

  storage.setItem(DEFAULT_EDITOR_STORAGE_KEY, "legacy-editor");
  assert.equal(readDefaultEditor(storage), null);
  assert.equal(readDefaultEditor(null), null);
  assert.equal(
    readDefaultEditor({
      getItem() {
        throw new Error("blocked");
      },
      setItem() {},
      removeItem() {},
    }),
    null
  );

  assert.equal(persistDefaultEditor(storage, "html"), true);
  assert.equal(readDefaultEditor(storage), "html");
  assert.equal(persistDefaultEditor(storage, null), true);
  assert.equal(readDefaultEditor(storage), null);

  const blockedStorage: PublicationPreferenceStorage = {
    getItem: () => null,
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(persistDefaultEditor(blockedStorage, "visual"), false);
  assert.equal(persistDefaultEditor(blockedStorage, null), false);
});

test("REQ-PUB-03/06 maps the wizard choices to a bounded publication draft", () => {
  assert.deepEqual(
    EDITOR_MODES.map(({ value }) => value),
    ["visual", "markdown", "html"]
  );
  assert.deepEqual(
    CONTENT_TYPES.map(({ value }) => value),
    ["notice", "assessment", "guide", "blank"]
  );
  assert.deepEqual(
    NOTIFICATION_MODES.map(({ value }) => value),
    ["push", "silent"]
  );
  assert.deepEqual(
    createPublicationDraft({
      contentType: "assessment",
      editorMode: "markdown",
      folder: "Evaluaciones",
      notificationMode: "silent",
    }),
    {
      contentType: "assessment",
      editorMode: "markdown",
      folder: "Evaluaciones",
      kind: "assessment",
      notificationMode: "silent",
    }
  );
  assert.equal(
    createPublicationDraft({
      contentType: "blank",
      editorMode: "visual",
      folder: "",
      notificationMode: "push",
    }).kind,
    "notice"
  );
});

test("REQ-PUB-01/05/08 exposes the publication studio as a full page reached from the course header", () => {
  const studio = fs.readFileSync(
    new URL("../app/views/classroom/PublishView.tsx", import.meta.url),
    "utf8"
  );
  const view = fs.readFileSync(
    new URL("../app/views/classroom/ClassroomView.tsx", import.meta.url),
    "utf8"
  );

  /* La acción vive en el encabezado del ramo y abre una pantalla, no un diálogo. */
  assert.match(view, /<Plus size=\{17\}/);
  assert.match(view, /Nueva publicación/);
  assert.match(view, /const \[composing, setComposing\] = useState\(false\)/);
  assert.match(view, /if \(composing\) \{/);
  assert.match(view, /<PublishView/);
  assert.doesNotMatch(view, /MaterialsSection|PublicationLauncher|PublicationComposerDialog/);

  assert.doesNotMatch(studio, /<dialog/);
  assert.match(studio, /readDefaultEditor\(browserStorage\(\)\)/);
  assert.match(studio, /persistDefaultEditor\(browserStorage\(\), mode\)/);
  assert.match(studio, /data-hardware-back="publish"/);
  assert.match(studio, /name="notificationMode"/);
  assert.match(studio, /name="folder"/);
  assert.match(studio, /templateForContentType\(value\)/);
});

test("REQ-PUB-10 seeds each preset with a structured Spanish template", () => {
  assert.equal(templateForContentType("blank"), "");
  for (const contentType of ["notice", "assessment", "guide"] as const) {
    const template = templateForContentType(contentType);
    assert.ok(template.length > 40, `${contentType} debe traer estructura`);
    assert.match(template, /^## /m);
  }
  assert.match(templateForContentType("assessment"), /\| Ítem \| Criterio \| Puntaje \|/);
  assert.match(templateForContentType("assessment"), /> \[!ASSESSMENT\]/);
  assert.match(templateForContentType("guide"), /^---$/m);
  assert.match(templateForContentType("notice"), /> \[!NOTE\]/);
});

test("REQ-PUB-11 keeps a per-section draft and drops it once it is empty", () => {
  const storage = memoryStorage();
  const draft = {
    contentType: "guide" as const,
    editorMode: "markdown" as const,
    notificationMode: "silent" as const,
    title: "Guía 3",
    body: "## Objetivos",
    folder: "Guías",
    dueDate: "",
    linkUrl: "",
    savedAt: "2026-09-01T12:00:00.000Z",
  };

  assert.equal(draftStorageKey("INF3101-1"), "ceoubb_publication_draft:INF3101-1");
  assert.equal(persistPublicationDraft(storage, "INF3101-1", draft), true);
  assert.deepEqual(readPublicationDraft(storage, "INF3101-1"), draft);
  /* El borrador es local a la sección: otro ramo no lo ve. */
  assert.equal(readPublicationDraft(storage, "MAT2201-2"), null);

  /* Un borrador sin título ni cuerpo se descarta en vez de ocupar espacio. */
  assert.equal(
    persistPublicationDraft(storage, "INF3101-1", { ...draft, title: " ", body: "" }),
    true
  );
  assert.equal(readPublicationDraft(storage, "INF3101-1"), null);

  /* Valores corruptos degradan a los seguros sin lanzar. */
  storage.setItem(
    draftStorageKey("INF3101-1"),
    JSON.stringify({ title: "Aviso", body: "x", editorMode: "wysiwyg", contentType: "otro" })
  );
  assert.equal(readPublicationDraft(storage, "INF3101-1")?.editorMode, "visual");
  assert.equal(readPublicationDraft(storage, "INF3101-1")?.contentType, "blank");
  storage.setItem(draftStorageKey("INF3101-1"), "{no-json");
  assert.equal(readPublicationDraft(storage, "INF3101-1"), null);
  assert.equal(clearPublicationDraft(storage, "INF3101-1"), true);
  assert.equal(readPublicationDraft(null, "INF3101-1"), null);
});

test("REQ-PUB-12 reports reading effort without counting code or formulas as prose", () => {
  assert.deepEqual(readingStats(""), { words: 0, characters: 0, minutes: 0 });
  const prose = readingStats(`${"palabra ".repeat(200)}`);
  assert.equal(prose.words, 200);
  assert.equal(prose.minutes, 1);
  const withCode = readingStats("hola mundo\n```python\n" + "x = 1\n".repeat(50) + "```");
  assert.equal(withCode.words, 2);
  assert.equal(readingStats("una sola").minutes, 1);
});

test("REQ-PUB-09 attaches uploaded files to the publication document itself", () => {
  const posts = fs.readFileSync(new URL("../lib/firebase/posts.ts", import.meta.url), "utf8");
  const storage = fs.readFileSync(new URL("../lib/firebase/storage.ts", import.meta.url), "utf8");
  const mappers = fs.readFileSync(new URL("../lib/firebase/mappers.ts", import.meta.url), "utf8");

  assert.match(posts, /attachments = toAttachments\(input\.attachments \?\? \[\]\)/);
  assert.match(posts, /\n\s{4}attachments,\n/);
  /* La subida no escribe en Firestore: el documento lo crea la publicación. */
  assert.match(storage, /export async function uploadPostAttachment/);
  assert.doesNotMatch(
    storage.slice(
      storage.indexOf("uploadPostAttachment"),
      storage.indexOf("export async function uploadClassroomFile")
    ),
    /addDoc/
  );
  assert.match(mappers, /export const MAX_POST_ATTACHMENTS = 6/);
});

test("REQ-PUB-09 rejects attachment entries without a storage path and caps the list", () => {
  assert.deepEqual(toAttachments(null), []);
  assert.deepEqual(toAttachments([{ name: "sin ruta" }]), []);
  assert.deepEqual(toAttachments(["texto suelto", 7]), []);
  assert.deepEqual(toAttachments([{ storagePath: "courses/a/b.pdf" }]), [
    {
      name: "Archivo adjunto",
      storagePath: "courses/a/b.pdf",
      contentType: "application/octet-stream",
      size: 0,
    },
  ]);
  assert.deepEqual(toAttachments([{ storagePath: "p", size: -3 }])[0].size, 0);
  const many = Array.from({ length: 12 }, (_, index) => ({ storagePath: `p${index}` }));
  assert.equal(toAttachments(many).length, MAX_POST_ATTACHMENTS);
});

test("REQ-PUB-13 removes the Materiales tab and centralises publications on the cover", () => {
  const utils = fs.readFileSync(
    new URL("../app/views/classroom/classroom-utils.ts", import.meta.url),
    "utf8"
  );
  const postsSection = fs.readFileSync(
    new URL("../app/views/classroom/PostsSection.tsx", import.meta.url),
    "utf8"
  );

  const tabs = utils.slice(
    utils.indexOf("export const COURSE_TABS"),
    utils.indexOf("export type Note")
  );
  assert.doesNotMatch(utils, /Tab = [^;]*"materials"/);
  assert.doesNotMatch(tabs, /Materiales/);
  assert.match(tabs, /label: "Portada"/);
  assert.equal(
    fs.existsSync(new URL("../app/views/classroom/MaterialsSection.tsx", import.meta.url)),
    false
  );
  /* Los adjuntos y el buscador viven ahora en la Portada. */
  assert.match(postsSection, /post-attachments/);
  assert.match(postsSection, /filterPostsByQuery/);
  assert.match(postsSection, /openAttachment\(attachment\)/);
});

test("REQ-PUB-06/07 writes the alert choice and skips FCM only for explicit false", () => {
  const posts = fs.readFileSync(new URL("../lib/firebase/posts.ts", import.meta.url), "utf8");
  const functions = fs.readFileSync(
    new URL("../firebase/functions/index.js", import.meta.url),
    "utf8"
  );
  const handlers = fs.readFileSync(
    new URL("../app/views/classroom/use-classroom-handlers.ts", import.meta.url),
    "utf8"
  );

  assert.match(posts, /notifyStudents: input\.notifyStudents/);
  assert.match(functions, /if \(post\.notifyStudents === false\) return;/);
  assert.match(
    handlers,
    /const notifyStudents = String\(form\.get\("notificationMode"\)\) !== "silent"/
  );
  assert.match(handlers, /dueDate:[\s\S]*?notifyStudents,/);
});
