import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { getBytes, ref, uploadBytes } from "firebase/storage";

const projectId = "demo-ceoubb-rules";
const sectionId = "audit-section";
const periodId = "audit-period";
const bucket = "gs://" + projectId + ".appspot.com";
const identities = {
  student: { uid: "audit-student", email: "audit.student@alumnos.ubiobio.cl", role: "student" },
  teammate: { uid: "audit-teammate", email: "audit.teammate@alumnos.ubiobio.cl", role: "student" },
  teacher: { uid: "audit-teacher", email: "audit.teacher@ubiobio.cl", role: "teacher" },
  external: { uid: "audit-external", email: "audit.external@example.test", role: "student" },
};
const items = ["individual", "team_free", "team_fixed"].map((submissionMode) => ({
  id: submissionMode,
  name: submissionMode,
  weight: 100,
  date: "",
  submissionMode,
}));
let environment;

function context(name) {
  const user = identities[name];
  return environment.authenticatedContext(user.uid, { email: user.email, email_verified: true });
}

function filePath(fileName) {
  return `courses/${sectionId}/submissions/team_free/${identities.student.uid}/${fileName}`;
}

function event(userId) {
  return {
    userId,
    title: "Synthetic event",
    detail: "",
    date: "2026-10-03",
    startTime: "10:00",
    endTime: "11:00",
    courseId: null,
    kind: "personal",
    completed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function receipt(item) {
  const uid = identities.student.uid;
  return {
    uid,
    courseId: sectionId,
    evalId: item.id,
    evaluation: item,
    authorName: "Synthetic student",
    fileName: "report.pdf",
    storagePath: `courses/${sectionId}/submissions/${item.id}/${uid}/report.pdf`,
    contentType: "application/pdf",
    size: 4,
    createdAt: serverTimestamp(),
  };
}

async function sendMessage(database) {
  const uid = identities.student.uid;
  const thread = doc(database, "courses", sectionId, "messageThreads", uid);
  const existing = await getDoc(thread);
  const batch = writeBatch(database);
  batch.set(thread, {
    courseId: sectionId,
    studentId: uid,
    studentName: "Synthetic student",
    studentEmail: identities.student.email,
    latestBody: "Synthetic message",
    latestAuthorId: uid,
    latestAuthorName: "Synthetic student",
    createdAt: existing.exists() ? existing.get("createdAt") : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(thread, "messages", existing.exists() ? "synthetic-next" : "synthetic"), {
    courseId: sectionId,
    threadId: uid,
    authorId: uid,
    authorName: "Synthetic student",
    body: "Synthetic message",
    createdAt: serverTimestamp(),
  });
  return batch.commit();
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: await readFile("firebase/firestore.rules", "utf8"),
    },
    storage: {
      host: "127.0.0.1",
      port: 9199,
      rules: await readFile("firebase/storage.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (admin) => {
    const database = admin.firestore();
    await Promise.all([
      ...Object.values(identities).map((user) =>
        setDoc(doc(database, "users", user.uid), { role: user.role })
      ),
      ...["student", "teammate", "teacher"].map((name) =>
        setDoc(doc(database, "enrollments", identities[name].uid, "sections", sectionId), {
          role: identities[name].role,
        })
      ),
      setDoc(doc(database, "academicSections", sectionId), { periodoId: periodId }),
      setDoc(doc(database, "academicPeriods", periodId), { status: "abierto" }),
      setDoc(doc(database, "courses", sectionId, "meta", "gradebook"), { items }),
      setDoc(
        doc(database, "courses", sectionId, "submissions", "team_free_" + identities.teammate.uid),
        {
          uid: identities.teammate.uid,
          submittedBy: identities.student.uid,
          storagePath: filePath("old.pdf"),
          memberIds: [identities.student.uid, identities.teammate.uid],
        }
      ),
      uploadBytes(ref(admin.storage(bucket), filePath("old.pdf")), new Uint8Array([1, 2, 3, 4]), {
        contentType: "application/pdf",
      }),
      uploadBytes(ref(admin.storage(bucket), filePath("new.pdf")), new Uint8Array([5, 6, 7, 8]), {
        contentType: "application/pdf",
      }),
    ]);
  });
});

after(async () => environment?.cleanup());

test("institutional personal writes remain allowed while verified external identities are rejected", async () => {
  for (const name of ["student", "teacher"]) {
    await assertSucceeds(
      setDoc(
        doc(context(name).firestore(), "users", identities[name].uid, "calendar_events", "event"),
        event(identities[name].uid)
      )
    );
    await assertSucceeds(
      uploadBytes(
        ref(context(name).storage(bucket), `avatars/${identities[name].uid}/photo.png`),
        new Uint8Array([1]),
        { contentType: "image/png" }
      )
    );
  }
  const external = context("external");
  await assertFails(
    setDoc(
      doc(external.firestore(), "users", identities.external.uid, "calendar_events", "event"),
      event(identities.external.uid)
    )
  );
});

test("verified external identities cannot upload avatars directly", async () => {
  const external = context("external");
  await assertFails(
    uploadBytes(
      ref(external.storage(bucket), `avatars/${identities.external.uid}/photo.png`),
      new Uint8Array([1]),
      { contentType: "image/png" }
    )
  );
});

test("a current teammate can read only the exact file bound to the receipt", async () => {
  const storage = context("teammate").storage(bucket);
  const data = await assertSucceeds(getBytes(ref(storage, filePath("old.pdf"))));
  assert.deepEqual([...new Uint8Array(data)], [1, 2, 3, 4]);
  await assertFails(getBytes(ref(storage, filePath("new.pdf"))));
});

test("withdrawal denies an authenticated exact-file read despite a retained team receipt", async () => {
  await environment.withSecurityRulesDisabled((admin) =>
    deleteDoc(doc(admin.firestore(), "enrollments", identities.teammate.uid, "sections", sectionId))
  );
  await assertFails(getBytes(ref(context("teammate").storage(bucket), filePath("old.pdf"))));
  await assertFails(
    getDoc(
      doc(
        context("teammate").firestore(),
        "courses",
        sectionId,
        "submissions",
        "team_free_" + identities.teammate.uid
      )
    )
  );
});

test("direct receipts preserve individual submissions and reject both team modalities", async () => {
  const database = context("student").firestore();
  await assertSucceeds(
    setDoc(
      doc(database, "courses", sectionId, "submissions", "individual_" + identities.student.uid),
      receipt(items[0])
    )
  );
  for (const item of items.slice(1)) {
    await assertFails(
      setDoc(
        doc(database, "courses", sectionId, "submissions", item.id + "_" + identities.student.uid),
        receipt(item)
      )
    );
  }
});

test("direct messages work in open periods and reject atomic writes after archival", async () => {
  await assertSucceeds(sendMessage(context("student").firestore()));
  await environment.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), "academicPeriods", periodId), { status: "archivado" });
  });
  await assertFails(sendMessage(context("student").firestore()));
  await assertSucceeds(
    getDoc(
      doc(
        context("student").firestore(),
        "courses",
        sectionId,
        "messageThreads",
        identities.student.uid
      )
    )
  );
});
