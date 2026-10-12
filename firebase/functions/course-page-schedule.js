const { FieldValue, Timestamp } = require("firebase-admin/firestore");

const RETENTION_DAYS = 30;
const DUE_LIMIT = 200;
const SECTION_ITEMS_LIMIT = 300;
const CONTENT_COLLECTIONS = ["posts", "hiddenItems", "trash"];

function attachmentPaths(data) {
  const paths = new Set();
  if (typeof data.storagePath === "string" && data.storagePath) paths.add(data.storagePath);
  if (Array.isArray(data.attachments)) {
    for (const entry of data.attachments) {
      if (entry && typeof entry.storagePath === "string" && entry.storagePath)
        paths.add(entry.storagePath);
    }
  }
  return [...paths];
}

function isDue(value, now) {
  return value instanceof Timestamp && value.toMillis() <= now.toMillis();
}

function published() {
  return {
    hidden: false,
    publishAt: null,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: "scheduler",
  };
}

// Implements: REQ-PAGE-05
async function publishDueSections(db, now) {
  const due = await db
    .collectionGroup("pageSections")
    .where("publishAt", "<=", now)
    .limit(DUE_LIMIT)
    .get();
  for (const section of due.docs) {
    const course = section.ref.parent.parent;
    const members = await course
      .collection("hiddenItems")
      .where("sectionId", "==", section.id)
      .limit(SECTION_ITEMS_LIMIT)
      .get();
    await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(section.ref);
      const items = await Promise.all(members.docs.map((member) => transaction.get(member.ref)));
      if (!fresh.exists || !isDue(fresh.get("publishAt"), now)) return;
      for (const item of items) {
        if (!item.exists || item.get("hidden") === true) continue;
        transaction.set(course.collection("posts").doc(item.id), {
          ...item.data(),
          ...published(),
          notifyStudents: false,
        });
        transaction.delete(item.ref);
      }
      transaction.update(section.ref, published());
    });
  }
  return due.size;
}

// Implements: REQ-PAGE-05
async function publishDueItems(db, now) {
  const due = await db
    .collectionGroup("hiddenItems")
    .where("publishAt", "<=", now)
    .limit(DUE_LIMIT)
    .get();
  for (const candidate of due.docs) {
    const course = candidate.ref.parent.parent;
    await db.runTransaction(async (transaction) => {
      const item = await transaction.get(candidate.ref);
      if (!item.exists || !isDue(item.get("publishAt"), now)) return;
      const sectionId = typeof item.get("sectionId") === "string" ? item.get("sectionId") : "";
      const section = sectionId
        ? await transaction.get(course.collection("pageSections").doc(sectionId))
        : null;
      if (section?.exists && section.get("hidden") === true) {
        transaction.update(item.ref, published());
        return;
      }
      transaction.set(course.collection("posts").doc(item.id), {
        ...item.data(),
        ...published(),
        notifyStudents: false,
      });
      transaction.delete(item.ref);
    });
  }
  return due.size;
}

async function referenced(course, path) {
  const matches = await Promise.all(
    CONTENT_COLLECTIONS.map((name) =>
      course.collection(name).where("attachmentPaths", "array-contains", path).limit(1).get()
    )
  );
  return matches.some((snapshot) => !snapshot.empty);
}

// Implements: REQ-PAGE-06
async function purgeExpiredTrash(db, bucket, now) {
  const cutoff = Timestamp.fromMillis(now.toMillis() - RETENTION_DAYS * 86_400_000);
  const expired = await db
    .collectionGroup("trash")
    .where("deletedAt", "<=", cutoff)
    .limit(DUE_LIMIT)
    .get();
  const filesByCourse = new Map();
  const writer = db.bulkWriter();
  for (const entry of expired.docs) {
    const course = entry.ref.parent.parent;
    const files = filesByCourse.get(course.path) ?? { course, paths: new Set() };
    for (const path of attachmentPaths(entry.data())) {
      if (path.startsWith(`courses/${course.id}/`)) files.paths.add(path);
    }
    filesByCourse.set(course.path, files);
    writer.delete(entry.ref);
  }
  await writer.close();
  for (const { course, paths } of filesByCourse.values()) {
    for (const path of paths) {
      if (await referenced(course, path)) continue;
      await bucket.file(path).delete({ ignoreNotFound: true });
    }
  }
  return expired.size;
}

// Implements: REQ-PAGE-05, REQ-PAGE-06
async function runCoursePageSchedule(db, bucket, now = Timestamp.now()) {
  const sections = await publishDueSections(db, now);
  const items = await publishDueItems(db, now);
  const purged = await purgeExpiredTrash(db, bucket, now);
  return { sections, items, purged };
}

module.exports = { attachmentPaths, runCoursePageSchedule, RETENTION_DAYS };
