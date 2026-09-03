import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";

const PROJECT_ID = "demo-ceoubb-rules";
const BUCKET_URL = "gs://" + PROJECT_ID + ".appspot.com";
const OPEN_PERIOD_ID = "2026-2";
const ENROLLED_SECTION_ID = "mat-2026-2-1";
const OTHER_SECTION_ID = "fis-2026-2-1";

const users = {
  student: {
    uid: "student-1",
    email: "student.1@alumnos.ubiobio.cl",
    role: "student",
  },
  otherStudent: {
    uid: "student-2",
    email: "student.2@alumnos.ubiobio.cl",
    role: "student",
  },
  teacher: {
    uid: "teacher-1",
    email: "teacher.1@ubiobio.cl",
    role: "teacher",
  },
  assistant: {
    uid: "assistant-1",
    email: "assistant.1@alumnos.ubiobio.cl",
    role: "student",
  },
  outsider: {
    uid: "outsider-1",
    email: "outsider.1@alumnos.ubiobio.cl",
    role: "student",
  },
  external: {
    uid: "external-1",
    email: "external@example.com",
    role: "student",
  },
  unverified: {
    uid: "unverified-1",
    email: "unverified.1@alumnos.ubiobio.cl",
    role: "student",
  },
} as const;

let testEnvironment: RulesTestEnvironment;

function authenticated(
  user: (typeof users)[keyof typeof users],
  emailVerified = true
): RulesTestContext {
  return testEnvironment.authenticatedContext(user.uid, {
    email: user.email,
    email_verified: emailVerified,
  });
}

async function seedBaseState(): Promise<void> {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    const userWrites = Object.values(users).map((user) =>
      setDoc(doc(database, "users", user.uid), { role: user.role })
    );

    await Promise.all([
      ...userWrites,
      setDoc(doc(database, "academicPeriods", OPEN_PERIOD_ID), { status: "abierto" }),
      setDoc(doc(database, "academicSections", ENROLLED_SECTION_ID), {
        periodoId: OPEN_PERIOD_ID,
      }),
      setDoc(doc(database, "academicSections", OTHER_SECTION_ID), {
        periodoId: OPEN_PERIOD_ID,
      }),
      setDoc(doc(database, "enrollments", users.student.uid, "sections", ENROLLED_SECTION_ID), {
        role: "student",
      }),
      setDoc(
        doc(database, "enrollments", users.otherStudent.uid, "sections", ENROLLED_SECTION_ID),
        { role: "student" }
      ),
      setDoc(doc(database, "enrollments", users.teacher.uid, "sections", ENROLLED_SECTION_ID), {
        role: "teacher",
      }),
      setDoc(doc(database, "enrollments", users.assistant.uid, "sections", ENROLLED_SECTION_ID), {
        role: "assistant",
      }),
      setDoc(doc(database, "courses", ENROLLED_SECTION_ID, "posts", "welcome"), {
        authorId: users.teacher.uid,
        title: "Bienvenida",
      }),
      setDoc(doc(database, "courses", OTHER_SECTION_ID, "posts", "private"), {
        authorId: users.teacher.uid,
        title: "Otra sección",
      }),
      setDoc(doc(database, "courses", ENROLLED_SECTION_ID, "meta", "classroom"), {
        title: "Álgebra",
      }),
      setDoc(doc(database, "courses", ENROLLED_SECTION_ID, "grades", users.student.uid), {
        uid: users.student.uid,
        scores: { quiz1: 6.2 },
      }),
      setDoc(doc(database, "courses", ENROLLED_SECTION_ID, "grades", users.otherStudent.uid), {
        uid: users.otherStudent.uid,
        scores: { quiz1: 5.8 },
      }),
      setDoc(doc(database, "courses", ENROLLED_SECTION_ID, "submissions", "student-2-report"), {
        uid: users.otherStudent.uid,
      }),
    ]);
  });
}

before(async () => {
  const [firestoreRules, storageRules] = await Promise.all([
    readFile("firebase/firestore.rules", "utf8"),
    readFile("firebase/storage.rules", "utf8"),
  ]);

  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: firestoreRules,
    },
    storage: {
      host: "127.0.0.1",
      port: 9199,
      rules: storageRules,
    },
  });
});

beforeEach(async () => {
  await Promise.all([testEnvironment.clearFirestore(), testEnvironment.clearStorage()]);
  await seedBaseState();
});

after(async () => {
  await testEnvironment.cleanup();
});

test("REQ-EMU-02: estudiante matriculado usa sólo su sección y su UID", async () => {
  const context = authenticated(users.student);
  const database = context.firestore();
  const storage = context.storage(BUCKET_URL);

  await assertSucceeds(getDoc(doc(database, "courses", ENROLLED_SECTION_ID, "posts", "welcome")));
  await assertFails(getDoc(doc(database, "courses", OTHER_SECTION_ID, "posts", "private")));
  await assertSucceeds(
    setDoc(doc(database, "courses", ENROLLED_SECTION_ID, "submissions", "student-1-report"), {
      uid: users.student.uid,
    })
  );
  await assertFails(
    setDoc(doc(database, "courses", ENROLLED_SECTION_ID, "submissions", "forged-report"), {
      uid: users.otherStudent.uid,
    })
  );
  await assertSucceeds(
    uploadBytes(
      ref(
        storage,
        "courses/" +
          ENROLLED_SECTION_ID +
          "/submissions/eval-1/" +
          users.student.uid +
          "/report.pdf"
      ),
      new TextEncoder().encode("entrega"),
      { contentType: "application/pdf" }
    )
  );
  await assertFails(
    uploadBytes(
      ref(
        storage,
        "courses/" +
          ENROLLED_SECTION_ID +
          "/submissions/eval-1/" +
          users.otherStudent.uid +
          "/forged.pdf"
      ),
      new TextEncoder().encode("entrega"),
      { contentType: "application/pdf" }
    )
  );
});

test("REQ-EMU-03: docente administra el aula sin escribir notas directamente", async () => {
  const context = authenticated(users.teacher);
  const database = context.firestore();

  await assertSucceeds(
    setDoc(doc(database, "courses", ENROLLED_SECTION_ID, "posts", "teacher-post"), {
      authorId: users.teacher.uid,
      title: "Aviso docente",
    })
  );
  await assertSucceeds(
    updateDoc(doc(database, "courses", ENROLLED_SECTION_ID, "meta", "classroom"), {
      title: "Álgebra actualizada",
    })
  );
  await assertSucceeds(
    getDoc(doc(database, "courses", ENROLLED_SECTION_ID, "grades", users.student.uid))
  );
  await assertFails(
    updateDoc(doc(database, "courses", ENROLLED_SECTION_ID, "grades", users.student.uid), {
      scores: { quiz1: 7 },
    })
  );
  await assertFails(
    setDoc(doc(database, "courses", ENROLLED_SECTION_ID, "meta", "gradebook"), {
      items: [],
    })
  );
  await assertFails(
    setDoc(doc(database, "courses", ENROLLED_SECTION_ID, "gradeAudit", "forged"), {
      studentId: users.student.uid,
      targetType: "score",
    })
  );
});

test("REQ-EMU-04: ayudante gestiona contenido sin privilegios docentes", async () => {
  const context = authenticated(users.assistant);
  const database = context.firestore();
  const storage = context.storage(BUCKET_URL);

  await assertSucceeds(
    setDoc(doc(database, "courses", ENROLLED_SECTION_ID, "posts", "assistant-post"), {
      authorId: users.assistant.uid,
      title: "Material de ayudantía",
    })
  );
  await assertSucceeds(
    uploadBytes(
      ref(storage, "courses/" + ENROLLED_SECTION_ID + "/" + users.assistant.uid + "/guia.pdf"),
      new TextEncoder().encode("guía"),
      { contentType: "application/pdf" }
    )
  );
  await assertFails(
    updateDoc(doc(database, "courses", ENROLLED_SECTION_ID, "meta", "classroom"), {
      title: "Cambio indebido",
    })
  );
  await assertFails(
    getDoc(doc(database, "courses", ENROLLED_SECTION_ID, "grades", users.otherStudent.uid))
  );
  await assertFails(
    getDoc(doc(database, "courses", ENROLLED_SECTION_ID, "submissions", "student-2-report"))
  );
});

test("REQ-EMU-05: sesiones ajenas o incompletas reciben rechazo predeterminado", async () => {
  const deniedActors = [
    { context: testEnvironment.unauthenticatedContext(), uid: "anonymous" },
    { context: authenticated(users.outsider), uid: users.outsider.uid },
    { context: authenticated(users.external), uid: users.external.uid },
    { context: authenticated(users.unverified, false), uid: users.unverified.uid },
  ];

  for (const { context, uid } of deniedActors) {
    await assertFails(
      getDoc(doc(context.firestore(), "courses", ENROLLED_SECTION_ID, "posts", "welcome"))
    );
    await assertFails(
      uploadBytes(
        ref(
          context.storage(BUCKET_URL),
          "courses/" + ENROLLED_SECTION_ID + "/submissions/eval-1/" + uid + "/blocked.pdf"
        ),
        new TextEncoder().encode("bloqueado"),
        { contentType: "application/pdf" }
      )
    );
  }
});
