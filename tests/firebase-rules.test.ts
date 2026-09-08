import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { deleteObject, getBytes, listAll, ref, uploadBytes } from "firebase/storage";

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
      setDoc(doc(database, "courses", ENROLLED_SECTION_ID, "meta", "gradebook"), {
        items: [{ id: "eval-1", name: "Informe", weight: 100, date: "2026-09-04" }],
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
  // clearStorage() del SDK sólo elimina objetos en la raíz, no los prefijos anidados.
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const directory = ref(
      context.storage(BUCKET_URL),
      `courses/${ENROLLED_SECTION_ID}/submissions/eval-1/${users.student.uid}`
    );
    const files = await listAll(directory);
    await Promise.all(files.items.map((file) => deleteObject(file)));
  });
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
  await assertSucceeds(
    setDoc(
      doc(database, "courses", ENROLLED_SECTION_ID, "submissions", `eval-1_${users.student.uid}`),
      submission()
    )
  );
});

function submission() {
  return {
    uid: users.student.uid,
    courseId: ENROLLED_SECTION_ID,
    evalId: "eval-1",
    evaluation: { id: "eval-1", name: "Informe", weight: 100, date: "2026-09-04" },
    authorName: "Estudiante",
    fileName: "report.pdf",
    contentType: "application/pdf",
    size: 7,
    storagePath: `courses/${ENROLLED_SECTION_ID}/submissions/eval-1/${users.student.uid}/report.pdf`,
    createdAt: serverTimestamp(),
  };
}

test("SEC-02/04: comprobante exige identidad, evaluación y fecha de servidor", async () => {
  const db = authenticated(users.student).firestore();
  const own = doc(db, "courses", ENROLLED_SECTION_ID, "submissions", `eval-1_${users.student.uid}`);
  await assertFails(setDoc(own, { uid: users.student.uid }));
  await assertFails(setDoc(own, { ...submission(), createdAt: Timestamp.fromMillis(1) }));
  await assertFails(
    setDoc(
      doc(db, "courses", ENROLLED_SECTION_ID, "submissions", `eval-1_${users.otherStudent.uid}`),
      submission()
    )
  );
  await assertFails(setDoc(own, { ...submission(), evalId: "missing" }));
  await assertFails(
    setDoc(own, {
      ...submission(),
      storagePath: `courses/${ENROLLED_SECTION_ID}/submissions/eval-1/${users.otherStudent.uid}/report.pdf`,
    })
  );
  await assertSucceeds(setDoc(own, submission()));
  await assertFails(updateDoc(own, { fileName: "nuevo.pdf" }));
  await assertSucceeds(setDoc(own, { ...submission(), fileName: "nuevo.pdf" }));
});

test("SEC-05: retirar matrícula impide leer y borrar entrega y progreso propios", async () => {
  const ctx = authenticated(users.student);
  const receipt = doc(
    ctx.firestore(),
    "courses",
    ENROLLED_SECTION_ID,
    "submissions",
    `eval-1_${users.student.uid}`
  );
  const progress = doc(
    ctx.firestore(),
    "courses",
    ENROLLED_SECTION_ID,
    "progress",
    users.student.uid
  );
  const file = ref(ctx.storage(BUCKET_URL), submission().storagePath);
  await assertSucceeds(setDoc(progress, { uid: users.student.uid }));
  await assertSucceeds(
    uploadBytes(file, new TextEncoder().encode("entrega"), { contentType: "application/pdf" })
  );
  await assertSucceeds(setDoc(receipt, submission()));
  await assertFails(
    uploadBytes(file, new TextEncoder().encode("sustitución"), { contentType: "application/pdf" })
  );
  await assertSucceeds(getBytes(file));
  await testEnvironment.withSecurityRulesDisabled((admin) =>
    deleteDoc(
      doc(admin.firestore(), "enrollments", users.student.uid, "sections", ENROLLED_SECTION_ID)
    )
  );
  for (const target of [receipt, progress]) {
    await assertFails(getDoc(target));
    await assertFails(deleteDoc(target));
  }
  await assertFails(getBytes(file));
  await assertFails(deleteObject(file));
});

test("SEC-02: un comprobante previo no permite cargar contenido posteriormente con su fecha", async () => {
  const ctx = authenticated(users.student);
  await assertSucceeds(
    setDoc(
      doc(
        ctx.firestore(),
        "courses",
        ENROLLED_SECTION_ID,
        "submissions",
        `eval-1_${users.student.uid}`
      ),
      submission()
    )
  );
  await assertFails(
    uploadBytes(
      ref(ctx.storage(BUCKET_URL), submission().storagePath),
      new TextEncoder().encode("tardío"),
      { contentType: "application/pdf" }
    )
  );
});

test("SEC-01: ID token anterior pierde Firestore y Storage, sólo reautenticación restaura acceso", async () => {
  const authTime = Math.floor(Date.now() / 1000) - 10;
  const old = testEnvironment.authenticatedContext(users.student.uid, {
    email: users.student.email,
    email_verified: true,
    auth_time: authTime,
  });
  const filePath = submission().storagePath;
  await assertSucceeds(
    uploadBytes(ref(old.storage(BUCKET_URL), filePath), new TextEncoder().encode("entrega"), {
      contentType: "application/pdf",
    })
  );
  await testEnvironment.withSecurityRulesDisabled((admin) =>
    setDoc(doc(admin.firestore(), "authRevocations", users.student.uid), {
      revokedAt: authTime,
      disabled: false,
    })
  );
  await assertFails(
    getDoc(doc(old.firestore(), "courses", ENROLLED_SECTION_ID, "posts", "welcome"))
  );
  await assertFails(getBytes(ref(old.storage(BUCKET_URL), filePath)));
  await assertFails(
    setDoc(doc(old.firestore(), "authRevocations", users.student.uid), {
      revokedAt: 0,
      disabled: false,
    })
  );
  const fresh = testEnvironment.authenticatedContext(users.student.uid, {
    email: users.student.email,
    email_verified: true,
    auth_time: authTime + 1,
  });
  await assertSucceeds(
    getDoc(doc(fresh.firestore(), "courses", ENROLLED_SECTION_ID, "posts", "welcome"))
  );
  await assertSucceeds(getBytes(ref(fresh.storage(BUCKET_URL), filePath)));
  await testEnvironment.withSecurityRulesDisabled((admin) =>
    setDoc(doc(admin.firestore(), "authRevocations", users.student.uid), {
      revokedAt: authTime,
      disabled: true,
    })
  );
  await assertFails(
    getDoc(doc(fresh.firestore(), "courses", ENROLLED_SECTION_ID, "posts", "welcome"))
  );
  await assertFails(getBytes(ref(fresh.storage(BUCKET_URL), filePath)));
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
