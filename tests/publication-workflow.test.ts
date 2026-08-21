import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  CONTENT_TYPES,
  DEFAULT_EDITOR_STORAGE_KEY,
  EDITOR_MODES,
  NOTIFICATION_MODES,
  createPublicationDraft,
  persistDefaultEditor,
  readDefaultEditor,
  type PublicationPreferenceStorage,
} from "../lib/publication-workflow.ts";

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

test("REQ-PUB-01/03/05/08 composes the split action and accessible three-step wizard", () => {
  const launcher = fs.readFileSync(
    new URL("../app/views/classroom/PublicationLauncher.tsx", import.meta.url),
    "utf8"
  );
  const wizard = fs.readFileSync(
    new URL("../app/views/classroom/PublicationWizardDialog.tsx", import.meta.url),
    "utf8"
  );
  const composer = fs.readFileSync(
    new URL("../app/views/classroom/PublicationComposerDialog.tsx", import.meta.url),
    "utf8"
  );
  const materials = fs.readFileSync(
    new URL("../app/views/classroom/MaterialsSection.tsx", import.meta.url),
    "utf8"
  );

  assert.match(launcher, /<Plus size=\{17\}/);
  assert.match(launcher, /Nueva publicación/);
  assert.match(launcher, /readDefaultEditor\(window\.localStorage\)/);
  assert.match(launcher, /persistDefaultEditor\(window\.localStorage, mode\)/);
  assert.match(launcher, /aria-haspopup="menu"/);
  assert.match(launcher, /role="menu"/);
  assert.match(launcher, /Abrir asistente/);
  assert.doesNotMatch(launcher, /async function openPreferred|const openPreferred = async/);

  assert.match(wizard, /Tipo de contenido/);
  assert.match(wizard, /Modo de redacción/);
  assert.match(wizard, /Destino y alertas/);
  assert.match(wizard, /Recordar mi elección y usarla siempre por defecto/);
  assert.match(wizard, /aria-current=\{index === step \? "step" : undefined\}/);
  assert.match(wizard, /onCancel=\{close\}/);

  assert.match(composer, /data-editor-mode=\{draft\.editorMode\}/);
  assert.match(composer, /name="notificationMode"/);
  assert.match(composer, /name="folder"/);
  assert.match(materials, /<PublicationLauncher/);
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
