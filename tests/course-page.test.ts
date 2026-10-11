import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  CONTENT_FIELDS,
  EMPTY_HISTORY,
  PAGE_POSTS_LIMIT,
  POSITION_STEP,
  TRASH_FIELDS,
  TRASH_RETENTION_DAYS,
  UNDO_LIMIT,
  announcementDraftFor,
  attachmentPathsOf,
  buildCoursePage,
  cleanLink,
  cleanSectionTitle,
  displayName,
  fileKind,
  itemTypeFor,
  locationFor,
  materializationPlan,
  moveId,
  pageErrorText,
  movedEntry,
  pickContentFields,
  placementFor,
  plainExcerpt,
  positionBetween,
  positionForIndex,
  recordEntry,
  renumber,
  stepBack,
  stepForward,
  trashDaysLeft,
  type PageSection,
  type UndoEntry,
} from "../lib/course-page.ts";
import type { CoursePost } from "../lib/firebase/mappers.ts";
import { toPost } from "../lib/firebase/mappers.ts";

function post(id: string, overrides: Partial<CoursePost> = {}): CoursePost {
  return {
    id,
    authorId: "t1",
    authorEmail: "docente@ubiobio.cl",
    authorName: "Docente",
    authorRole: "teacher",
    title: `Elemento ${id}`,
    body: "Cuerpo",
    kind: "resource",
    folder: "General",
    linkUrl: null,
    storagePath: "",
    attachments: [],
    dueDate: "",
    createdAt: "2026-10-01T10:00:00.000Z",
    placement: "page",
    sectionId: "",
    position: POSITION_STEP,
    itemType: "text",
    hidden: false,
    publishAt: "",
    location: "posts",
    ...overrides,
  };
}

function section(id: string, overrides: Partial<PageSection> = {}): PageSection {
  return {
    id,
    title: `Sección ${id}`,
    position: POSITION_STEP,
    hidden: false,
    publishAt: "",
    virtual: false,
    ...overrides,
  };
}

function snapshot(id: string, data: Record<string, unknown>) {
  return { id, data: () => data } as unknown as Parameters<typeof toPost>[0];
}

test("REQ-PAGE-11 classifies historical posts without a placement", () => {
  assert.equal(placementFor({ kind: "notice", storagePath: "" }), "notice");
  assert.equal(placementFor({ kind: "guide", storagePath: "" }), "page");
  assert.equal(placementFor({ kind: "assessment", storagePath: "" }), "page");
  assert.equal(placementFor({ kind: "notice", storagePath: "courses/a/u/f.pdf" }), "page");
  assert.equal(placementFor({ kind: "notice", storagePath: "", sourceSystem: "moodle" }), "page");
  assert.equal(placementFor({ placement: "notice", kind: "guide", storagePath: "x" }), "notice");
  assert.equal(placementFor({ placement: "otro", kind: "notice", storagePath: "" }), "notice");
});

test("REQ-PAGE-02 derives the item type of historical posts", () => {
  const base = { storagePath: "", attachments: [], linkUrl: null, body: "" };
  assert.equal(itemTypeFor({ ...base, itemType: "link" }), "link");
  assert.equal(itemTypeFor({ ...base, storagePath: "courses/a/u/f.pdf", body: "x" }), "file");
  assert.equal(itemTypeFor({ ...base, body: "texto" }), "text");
  assert.equal(itemTypeFor({ ...base, linkUrl: "https://ubiobio.cl" }), "link");
  const image = { name: "a.png", storagePath: "p", contentType: "image/png", size: 1 };
  const pdf = { name: "a.pdf", storagePath: "q", contentType: "application/pdf", size: 1 };
  assert.equal(itemTypeFor({ ...base, attachments: [image] }), "image");
  assert.equal(itemTypeFor({ ...base, attachments: [pdf] }), "file");
  assert.equal(itemTypeFor({ ...base, attachments: [pdf, image] }), "text");
});

test("REQ-PAGE-11 maps location, placement and hidden flags from Firestore", () => {
  const legacy = toPost(snapshot("old", { kind: "guia", title: "Guía", createdAt: "2026-03-01" }));
  assert.equal(legacy.placement, "page");
  assert.equal(legacy.sectionId, "");
  assert.equal(legacy.position, Date.parse(legacy.createdAt));
  assert.equal(legacy.location, "posts");

  const visible = toPost(snapshot("v", { placement: "page", hidden: true, position: 7 }));
  assert.equal(visible.hidden, false, "only the teacher-only collection can carry hidden content");
  assert.equal(visible.position, 7);

  const staged = toPost(snapshot("h", { placement: "page", hidden: true }), "hiddenItems");
  assert.equal(staged.hidden, true);
  assert.equal(staged.location, "hiddenItems");
});

test("REQ-PAGE-04 computes fractional positions and detects the dragged entry", () => {
  assert.equal(positionBetween(undefined, undefined), POSITION_STEP);
  assert.equal(positionBetween(2048, undefined), 2048 + POSITION_STEP);
  assert.equal(positionBetween(undefined, 2048), 2048 - POSITION_STEP);
  assert.equal(positionBetween(1024, 2048), 1536);

  const list = [
    { id: "a", position: 1024 },
    { id: "b", position: 2048 },
    { id: "c", position: 3072 },
  ];
  assert.equal(positionForIndex(list, "c", 0), 0);
  assert.equal(positionForIndex(list, "a", 2), 3072 + POSITION_STEP);
  assert.equal(positionForIndex(list, "a", 1), 2560);
  const tight = [
    { id: "a", position: 1 },
    { id: "b", position: 1 + Number.EPSILON },
    { id: "c", position: 5 },
  ];
  assert.equal(positionForIndex(tight, "c", 1), null, "exhausted precision asks for a renumber");
  assert.deepEqual(
    [...renumber(["x", "y"])],
    [
      ["x", POSITION_STEP],
      ["y", POSITION_STEP * 2],
    ]
  );

  assert.deepEqual(movedEntry(["a", "b", "c", "d"], ["b", "c", "a", "d"]), { id: "a", index: 2 });
  assert.deepEqual(movedEntry(["a", "b", "c", "d"], ["a", "d", "b", "c"]), { id: "d", index: 1 });
  assert.deepEqual(movedEntry(["a", "b"], ["b", "a"]), { id: "b", index: 0 });
  assert.equal(movedEntry(["a", "b"], ["a", "b"]), null);
  assert.equal(movedEntry(["a"], ["a", "b"]), null);
  assert.deepEqual(moveId(["a", "b", "c"], "a", 2), ["b", "c", "a"]);
  assert.deepEqual(moveId(["a", "b", "c"], "c", -4), ["c", "a", "b"]);
});

test("REQ-PAGE-01/05/09 builds the page each audience may see", () => {
  const sections = [
    section("unit-2", { title: "Unidad 2", position: 2048 }),
    section("unit-1", { title: "Unidad 1", position: 1024 }),
    section("solutions", { title: "Pautas", position: 3072, hidden: true }),
  ];
  const posts = [
    post("n-old", { placement: "notice", createdAt: "2026-09-01T00:00:00.000Z" }),
    post("n-new", { placement: "notice", createdAt: "2026-10-01T00:00:00.000Z" }),
    post("u1-b", { sectionId: "unit-1", position: 2048 }),
    post("u1-a", { sectionId: "unit-1", position: 1024 }),
    post("legacy-guide", { folder: "Guías", createdAt: "2026-08-01T00:00:00.000Z" }),
    post("legacy-general", { folder: "General", createdAt: "2026-07-01T00:00:00.000Z" }),
    post("orphan", { sectionId: "deleted-section" }),
  ];
  const hiddenItems = [
    post("pauta", { sectionId: "solutions", location: "hiddenItems" }),
    post("draft", { sectionId: "unit-1", hidden: true, position: 3072, location: "hiddenItems" }),
  ];

  const student = buildCoursePage({ sections, posts, hiddenItems, audience: "student" });
  assert.deepEqual(
    student.announcements.map((entry) => entry.id),
    ["n-new", "n-old"]
  );
  assert.deepEqual(
    student.sections.map((entry) => entry.id),
    ["unit-1", "virtual:General", "virtual:Guías"]
  );
  assert.deepEqual(
    student.sections[0]?.items.map((entry) => entry.id),
    ["u1-a", "u1-b"]
  );
  const studentIds = student.sections.flatMap((entry) => entry.items.map((item) => item.id));
  assert.ok(!studentIds.includes("pauta") && !studentIds.includes("draft"));
  assert.ok(!studentIds.includes("orphan"), "an item of an unknown section never leaks");

  const team = buildCoursePage({ sections, posts, hiddenItems, audience: "team" });
  assert.deepEqual(
    team.sections.map((entry) => entry.id),
    ["unit-1", "unit-2", "solutions", "virtual:General", "virtual:Guías", "virtual:orphan"]
  );
  assert.deepEqual(
    team.sections[0]?.items.map((entry) => entry.id),
    ["u1-a", "u1-b", "draft"]
  );
  assert.equal(team.sections.find((entry) => entry.id === "unit-2")?.items.length, 0);
  assert.equal(team.sections.at(-1)?.title, "Sin sección");
});

test("REQ-PAGE-11 turns folder groups into real sections in their visible order", () => {
  const page = buildCoursePage({
    sections: [section("intro", { position: 1024 })],
    posts: [
      post("b", { folder: "Clases", createdAt: "2026-05-02T00:00:00.000Z" }),
      post("a", { folder: "Clases", createdAt: "2026-05-01T00:00:00.000Z" }),
    ],
    hiddenItems: [],
    audience: "team",
  });
  const plan = materializationPlan(page);
  assert.equal(plan.length, 1);
  assert.equal(plan[0]?.title, "Clases");
  assert.equal(plan[0]?.position, 1024 + POSITION_STEP);
  assert.deepEqual(plan[0]?.items, [
    { id: "a", location: "posts", position: POSITION_STEP },
    { id: "b", location: "posts", position: POSITION_STEP * 2 },
  ]);
});

test("REQ-PAGE-05 stores hidden or hidden-section content outside the student collection", () => {
  assert.equal(locationFor(false, false), "posts");
  assert.equal(locationFor(true, false), "hiddenItems");
  assert.equal(locationFor(false, true), "hiddenItems");
});

test("REQ-PAGE-06/13 keeps only known content fields when a document moves", () => {
  const picked = pickContentFields({
    title: "Guía",
    legacyField: "x",
    deletedAt: "now",
    trashKind: "item",
    hidden: false,
  });
  assert.deepEqual(picked, { title: "Guía", hidden: false });
  assert.deepEqual(
    attachmentPathsOf({
      storagePath: "courses/a/u/1.pdf",
      attachments: [{ storagePath: "courses/a/u/2.pdf" }, { storagePath: "courses/a/u/1.pdf" }, 3],
    }),
    ["courses/a/u/1.pdf", "courses/a/u/2.pdf"]
  );

  const rules = fs.readFileSync(new URL("../firebase/firestore.rules", import.meta.url), "utf8");
  const listed = (name: string) => {
    const body = rules.slice(rules.indexOf(`function ${name}()`));
    return [...body.slice(0, body.indexOf("}")).matchAll(/'([A-Za-z]+)'/g)].map(
      (match) => match[1]
    );
  };
  assert.deepEqual(listed("contentFields"), [...CONTENT_FIELDS]);
  assert.deepEqual(listed("trashFields"), [...TRASH_FIELDS]);
});

test("REQ-PAGE-01/02 validates section names and links", () => {
  assert.equal(cleanSectionTitle("  Unidad 1  "), "Unidad 1");
  assert.throws(() => cleanSectionTitle("   "), /necesita un nombre/);
  assert.equal(cleanSectionTitle("x".repeat(400)).length, 120);
  assert.equal(cleanLink(" https://ubiobio.cl/curso "), "https://ubiobio.cl/curso");
  assert.throws(() => cleanLink("javascript:alert(1)"), /http/);
  assert.throws(() => cleanLink("mailto:docente@ubiobio.cl"), /http/);
});

test("REQ-PAGE-10 drafts an aviso that lists what was added", () => {
  const single = announcementDraftFor([
    { sectionTitle: "Unidad 1", title: "Guía 1" },
    { sectionTitle: "Unidad 1", title: "Apuntes" },
  ]);
  assert.equal(single.title, "Nuevo material en Unidad 1");
  assert.equal(single.body, "**Unidad 1**\n\n- Guía 1\n- Apuntes");
  const many = announcementDraftFor([
    { sectionTitle: "Unidad 1", title: "Guía 1" },
    { sectionTitle: "Evaluaciones", title: "Pauta" },
  ]);
  assert.equal(many.title, "Nuevo material en el ramo");
  assert.match(many.body, /\*\*Evaluaciones\*\*\n\n- Pauta/);
});

test("REQ-PAGE-06 counts down the trash retention", () => {
  const now = Date.parse("2026-10-11T12:00:00.000Z");
  assert.equal(trashDaysLeft("2026-10-11T08:00:00.000Z", now), TRASH_RETENTION_DAYS);
  assert.equal(trashDaysLeft("2026-10-01T12:00:00.000Z", now), TRASH_RETENTION_DAYS - 10);
  assert.equal(trashDaysLeft("2026-08-01T12:00:00.000Z", now), 0);
  assert.equal(trashDaysLeft("no es fecha", now), TRASH_RETENTION_DAYS);
});

test("REQ-PAGE-07 keeps a bounded undo and redo history", () => {
  const entry = (label: string): UndoEntry => ({
    label,
    undo: async () => undefined,
    redo: async () => undefined,
  });
  let history = recordEntry(EMPTY_HISTORY, entry("a"));
  history = recordEntry(history, entry("b"));
  const back = stepBack(history);
  assert.equal(back?.entry.label, "b");
  assert.deepEqual(
    back?.history.future.map((item) => item.label),
    ["b"]
  );
  const forward = stepForward(back?.history ?? EMPTY_HISTORY);
  assert.equal(forward?.entry.label, "b");
  assert.equal(forward?.history.future.length, 0);
  assert.equal(recordEntry(back?.history ?? EMPTY_HISTORY, entry("c")).future.length, 0);
  assert.equal(stepBack(EMPTY_HISTORY), null);
  assert.equal(stepForward(EMPTY_HISTORY), null);
  let long = EMPTY_HISTORY;
  for (let index = 0; index < UNDO_LIMIT + 10; index += 1)
    long = recordEntry(long, entry(String(index)));
  assert.equal(long.past.length, UNDO_LIMIT);
  assert.equal(long.past[0]?.label, "10");
});

test("REQ-PAGE-02/09 describes files and excerpts without markup", () => {
  assert.equal(fileKind("application/pdf", "x"), "pdf");
  assert.equal(fileKind("", "courses/a/u/123_programa.pptx"), "slides");
  assert.equal(fileKind("image/webp", "foto"), "image");
  assert.equal(fileKind("application/octet-stream", "datos.csv"), "sheet");
  assert.equal(fileKind("", "notas"), "file");
  assert.equal(displayName("Guía 1.pdf"), "Guía 1");
  assert.equal(displayName("README"), "README");
  assert.equal(
    plainExcerpt("## Certamen\n\n> [!NOTE]\n> Traer **calculadora** y [pauta](https://x.cl)"),
    "Certamen Traer calculadora y pauta"
  );
  assert.equal(plainExcerpt("palabra ".repeat(60), 20).length, 20);
});

test("REQ-PAGE-12 bounds every page query and reports overflow", () => {
  const posts = fs.readFileSync(new URL("../lib/firebase/posts.ts", import.meta.url), "utf8");
  const page = fs.readFileSync(new URL("../lib/firebase/course-page.ts", import.meta.url), "utf8");
  assert.equal(PAGE_POSTS_LIMIT, 300);
  assert.match(posts, /sdk\.limit\(PAGE_POSTS_LIMIT\)/);
  assert.match(posts, /postsOverflow = snapshot\.size >= PAGE_POSTS_LIMIT/);
  assert.match(posts, /sdk\.where\("hidden", "==", false\),\s*sdk\.limit\(PAGE_SECTIONS_LIMIT\)/);
  assert.match(posts, /if \(managing\) \{[\s\S]*?sdk\.limit\(HIDDEN_ITEMS_LIMIT\)/);
  assert.match(page, /sdk\.orderBy\("deletedAt", "desc"\),\s*sdk\.limit\(TRASH_LIMIT\)/);
  for (const query of page.matchAll(/sdk\.query\(([\s\S]*?)\)\s*\)/g))
    assert.match(query[1] ?? "", /sdk\.limit\(/, "every page query carries a limit");
});

test("REQ-PAGE-05/06 keeps hidden content and trash out of student reach", () => {
  const rules = fs.readFileSync(new URL("../firebase/firestore.rules", import.meta.url), "utf8");
  const storage = fs.readFileSync(new URL("../firebase/storage.rules", import.meta.url), "utf8");
  const block = (path: string) => rules.slice(rules.indexOf(`match ${path}`)).split("\n    }")[0];
  assert.match(
    block("/courses/{courseId}/hiddenItems/{itemId}"),
    /allow read: if isOwner\(\) \|\| managesSectionContent\(courseId\);/
  );
  assert.match(
    block("/courses/{courseId}/trash/{entryId}"),
    /allow read: if isOwner\(\) \|\| managesSectionContent\(courseId\);/
  );
  assert.match(
    block("/courses/{courseId}/pageSections/{sectionId}"),
    /isMember\(\) && isEnrolled\(courseId\) && resource\.data\.hidden == false/
  );
  assert.match(
    block("/courses/{courseId}/posts/{postId}"),
    /allow update: if \(isOwner\(\) \|\| managesSectionContent\(courseId\)\) && validCourseContent/
  );
  assert.match(rules, /data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(allowed\)/);
  assert.match(
    storage,
    /allow delete: if \(isOwner\(\) \|\| managesSectionContent\(courseId\)\) && sectionIsWritable\(courseId\);/
  );
});

test("REQ-PAGE-05/06/14 publishes scheduled content silently and imports into the page", () => {
  const schedule = fs.readFileSync(
    new URL("../firebase/functions/course-page-schedule.js", import.meta.url),
    "utf8"
  );
  const functions = fs.readFileSync(
    new URL("../firebase/functions/index.js", import.meta.url),
    "utf8"
  );
  const moodle = fs.readFileSync(
    new URL("../lib/services/moodle-import.ts", import.meta.url),
    "utf8"
  );
  const adecca = fs.readFileSync(
    new URL("../lib/services/adecca-import.ts", import.meta.url),
    "utf8"
  );
  assert.match(functions, /exports\.publishScheduledCourseContent = onSchedule\(/);
  assert.equal((schedule.match(/notifyStudents: false/g) ?? []).length, 2);
  assert.match(schedule, /path\.startsWith\(`courses\/\$\{course\.id\}\/`\)/);
  assert.match(schedule, /if \(await referenced\(course, path\)\) continue;/);
  assert.match(schedule, /RETENTION_DAYS = 30/);
  assert.match(moodle, /placement: \{ stringValue: "page" \}/);
  assert.match(adecca, /placement: \{\s*stringValue: placementFor\(/);
});

test("REQ-PAGE-03 nunca muestra el mensaje crudo del SDK", () => {
  const denied = Object.assign(new Error("Missing or insufficient permissions."), {
    code: "permission-denied",
  });
  const offline = Object.assign(
    new Error("Failed to get document because the client is offline."),
    {
      code: "unavailable",
    }
  );
  assert.equal(
    pageErrorText(denied, "No se pudo mover la sección."),
    "No tienes permiso para modificar el contenido de este ramo."
  );
  assert.equal(
    pageErrorText(offline, "No se pudo mover la sección."),
    "No se pudo mover la sección."
  );
  assert.equal(
    pageErrorText(new Error("La sección ya no está en la papelera."), "x"),
    "La sección ya no está en la papelera."
  );
  assert.equal(pageErrorText("texto", "Respaldo"), "Respaldo");
});
