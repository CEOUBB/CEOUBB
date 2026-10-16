import type { GradeItem } from "../lib/grades.ts";
import type { QuizAnswerKey, QuizQuestion } from "../lib/quizzes.ts";

// Implements: REQ-QA-02, REQ-QA-03, REQ-QA-05
export const QA_PROJECT = "demo-ceoubb-qa";
export const QA_PASSWORD = "Qa-local-2026!only";
export const QA_NOW = "2026-09-22T12:00:00.000Z";
export const QA_SUPPORT_SUBJECT = "QA browser contact deferred";
export const QA_ASSETS = {
  moodle: "qa/assets/course.mbz",
  adecca: "qa/assets/adecca.json",
  enrollments: "qa/assets/enrollments.csv",
  questions: "qa/assets/questions.gift",
} as const;
export const QA_USERS = {
  student: {
    uid: "qa-student",
    id: "firebase:qa-student",
    email: "qa.student@alumnos.ubiobio.cl",
    password: QA_PASSWORD,
    name: "Estudiante QA",
    role: "student",
  },
  teacher: {
    uid: "qa-teacher",
    id: "firebase:qa-teacher",
    email: "qa.teacher@ubiobio.cl",
    password: QA_PASSWORD,
    name: "Docente QA",
    role: "teacher",
  },
  owner: {
    uid: "qa-owner",
    id: "firebase:qa-owner",
    email: "qa.owner@ubiobio.cl",
    password: QA_PASSWORD,
    name: "Administración QA",
    role: "owner",
  },
  assistant: {
    uid: "qa-assistant",
    id: "firebase:qa-assistant",
    email: "qa.assistant@alumnos.ubiobio.cl",
    password: QA_PASSWORD,
    name: "Ayudante QA",
    role: "student",
  },
  coordinator: {
    uid: "qa-coordinator",
    id: "firebase:qa-coordinator",
    email: "qa.coordinator@ubiobio.cl",
    password: QA_PASSWORD,
    name: "Coordinación QA",
    role: "teacher",
  },
  outsider: {
    uid: "qa-outsider",
    id: "firebase:qa-outsider",
    email: "qa.outsider@alumnos.ubiobio.cl",
    password: QA_PASSWORD,
    name: "Estudiante de otra sección QA",
    role: "student",
  },
} as const;
export type QaRole = keyof typeof QA_USERS;
export const QA_TEAMMATE = {
  uid: "qa-teammate",
  id: "firebase:qa-teammate",
  email: "qa.teammate@alumnos.ubiobio.cl",
  password: QA_PASSWORD,
  name: "Compañera QA",
  role: "student",
} as const;
export const QA_USER_FIXTURES = [...Object.values(QA_USERS), QA_TEAMMATE];
export const QA_SECTIONS = {
  active: "qa-active",
  empty: "qa-empty",
  archived: "qa-archived",
  other: "qa-other",
  additional: "qa-additional",
} as const;
export const QA_SECTION_NAMES = {
  active: "QA Aula activa",
  empty: "QA Aula vacía",
  archived: "QA Aula archivada",
  other: "QA Otra aula",
  additional: "QA Aula complementaria",
} as const;
export const QA_IDS = {
  report: "qa-eval-report",
  quizEvaluation: "qa-eval-quiz",
  team: "qa-eval-team",
  quiz: "qa-quiz",
  apiQuiz: "qa-api-quiz",
  question: "qa-question",
  correctAnswer: "qa-answer-four",
  notice: "qa-notice",
  guide: "qa-guide",
  assessment: "qa-assessment",
  resource: "qa-resource",
  scorm: "11111111-1111-4111-8111-111111111111",
  xapi: "22222222-2222-4222-8222-222222222222",
  lti: "33333333-3333-4333-8333-333333333333",
  ltiTool: "44444444-4444-4444-8444-444444444444",
  filePath: "courses/qa-active/qa-teacher/material.pdf",
  submissionPath: "courses/qa-active/submissions/qa-eval-report/qa-student/informe.pdf",
} as const;

export const QA_GRADE_ITEMS: GradeItem[] = [
  {
    id: QA_IDS.report,
    name: "Informe individual QA",
    weight: 40,
    date: "2026-09-24",
    submissionMode: "individual",
  },
  {
    id: QA_IDS.quizEvaluation,
    name: "Cuestionario QA",
    weight: 30,
    date: "2026-09-25",
    submissionMode: "individual",
  },
  {
    id: QA_IDS.team,
    name: "Proyecto en equipo QA",
    weight: 30,
    date: "2026-09-28",
    submissionMode: "team_free",
  },
];
export const QA_QUESTION: QuizQuestion = {
  id: QA_IDS.question,
  title: "Suma básica",
  prompt: "¿Cuánto es 2 + 2?",
  kind: "single_choice",
  options: [
    { id: "qa-answer-three", label: "3" },
    { id: QA_IDS.correctAnswer, label: "4" },
  ],
  points: 1,
};
export const QA_ANSWER: QuizAnswerKey = {
  questionId: QA_IDS.question,
  kind: "single_choice",
  acceptedAnswers: [],
  correctOptionId: QA_IDS.correctAnswer,
  numericalAnswer: null,
  tolerance: 0,
  feedback: "La suma de dos y dos es cuatro.",
};

export const QA_ENROLLMENTS = [
  ...Object.entries(QA_SECTIONS).flatMap(([kind, seccionId]) =>
    (Object.keys(QA_USERS) as QaRole[]).flatMap((key) => {
      if (kind === "other" ? key !== "outsider" : key === "outsider") return [];
      const rolSeccion = key === "owner" ? "coordinator" : key === "outsider" ? "student" : key;
      return [
        {
          id: `${seccionId}-${key}`,
          seccionId,
          usuarioId: QA_USERS[key].id,
          rolSeccion,
          estado: "activa" as const,
          createdAt: QA_NOW,
        },
      ];
    })
  ),
  ...[QA_SECTIONS.active, QA_SECTIONS.archived].map((seccionId) => ({
    id: `${seccionId}-teammate`,
    seccionId,
    usuarioId: QA_TEAMMATE.id,
    rolSeccion: "student" as const,
    estado: "activa" as const,
    createdAt: QA_NOW,
  })),
];

type FixtureValue =
  string | number | boolean | null | Date | FixtureValue[] | { [key: string]: FixtureValue };
export type QaDocument = { path: string; data: Record<string, FixtureValue> };

export function qaFirestoreDocuments(pdfSize: number, pdfSha256: string): QaDocument[] {
  const stamp = new Date(QA_NOW);
  const docs: QaDocument[] = QA_USER_FIXTURES.map((user) => ({
    path: `users/${user.uid}`,
    data: {
      uid: user.uid,
      email: user.email,
      displayName: user.name,
      role: user.role,
      photoUrl: "",
      domain: user.email.split("@")[1],
      createdAt: stamp,
      lastSeen: stamp,
      teacherRequested: false,
    },
  }));
  docs.push(
    {
      path: `courses/${QA_SECTIONS.active}/progress/${QA_TEAMMATE.uid}`,
      data: { displayName: QA_TEAMMATE.name, email: QA_TEAMMATE.email, lastSeen: stamp },
    },
    {
      path: `courses/${QA_SECTIONS.active}/grades/${QA_TEAMMATE.uid}`,
      data: {
        uid: QA_TEAMMATE.uid,
        scores: { [QA_IDS.report]: 4.8 },
        feedback: {},
        updatedAt: stamp,
      },
    },
    {
      path: `courses/${QA_SECTIONS.active}/gradeAudit/qa-initial-grade`,
      data: {
        targetType: "score",
        source: "teacher",
        courseId: QA_SECTIONS.active,
        studentId: QA_USERS.student.uid,
        gradeItemId: QA_IDS.report,
        previousValue: null,
        newValue: 5.5,
        actorUid: QA_USERS.teacher.uid,
        actorName: QA_USERS.teacher.name,
        actorEmail: QA_USERS.teacher.email,
        changedAt: stamp,
      },
    },
    ...QA_ENROLLMENTS.map((enrollment) => ({
      path: `enrollments/${enrollment.usuarioId.replace("firebase:", "")}/sections/${enrollment.seccionId}`,
      data: {
        seccionId: enrollment.seccionId,
        role: enrollment.rolSeccion,
        status: enrollment.estado,
        updatedAt: QA_NOW,
      },
    }))
  );
  for (const [key, section] of Object.entries(QA_SECTIONS)) {
    docs.push({
      path: `academicSections/${section}`,
      data: {
        seccionId: section,
        periodoId: key === "archived" ? "qa-period-archived" : "qa-period-current",
      },
    });
  }
  docs.push(
    {
      path: "academicPeriods/qa-period-current",
      data: { periodoId: "qa-period-current", status: "abierto", updatedAt: QA_NOW },
    },
    {
      path: "academicPeriods/qa-period-archived",
      data: { periodoId: "qa-period-archived", status: "archivado", updatedAt: QA_NOW },
    }
  );
  for (const section of [QA_SECTIONS.active, QA_SECTIONS.archived, QA_SECTIONS.other]) {
    const author = {
      authorId: QA_USERS.teacher.uid,
      authorEmail: QA_USERS.teacher.email,
      authorName: QA_USERS.teacher.name,
      courseId: section,
      folder: "Unidad 1",
      createdAt: stamp,
    };
    docs.push(
      {
        path: `courses/${section}/posts/${QA_IDS.notice}`,
        data: {
          ...author,
          title: "Bienvenida al aula QA",
          body: "Aviso institucional sintético para comprobar publicaciones y lectura.",
          kind: "notice",
          dueDate: "",
        },
      },
      {
        path: `courses/${section}/posts/${QA_IDS.guide}`,
        data: {
          ...author,
          title: "Guía de estudio QA",
          body: "Revisa el material y prepara tus preguntas para la próxima clase.",
          kind: "guide",
          dueDate: "",
        },
      },
      {
        path: `courses/${section}/posts/${QA_IDS.assessment}`,
        data: {
          ...author,
          title: "Informe individual QA",
          body: "Entrega un informe con tus resultados.",
          kind: "assessment",
          dueDate: "2026-09-24",
        },
      },
      {
        path: `courses/${section}/meta/gradebook`,
        data: {
          items: QA_GRADE_ITEMS.map((item) => ({ ...item })),
          exemption: 5,
          updatedAt: stamp,
        },
      },
      {
        path: `courses/${section}/meta/live-class`,
        data: {
          courseId: section,
          url: "https://teams.microsoft.com/l/meetup-join/qa-synthetic",
          provider: "teams",
          updatedBy: QA_USERS.teacher.uid,
          updatedAt: stamp,
        },
      }
    );
    const student = section === QA_SECTIONS.other ? QA_USERS.outsider : QA_USERS.student;
    docs.push(
      {
        path: `courses/${section}/progress/${student.uid}`,
        data: { displayName: student.name, email: student.email, lastSeen: stamp },
      },
      {
        path: `courses/${section}/grades/${student.uid}`,
        data: {
          uid: student.uid,
          scores: { [QA_IDS.report]: 5.5 },
          feedback: { [QA_IDS.report]: "Buen desarrollo; fundamenta la conclusión." },
          updatedAt: stamp,
        },
      }
    );
  }
  docs.push(
    {
      path: `courses/${QA_SECTIONS.active}/posts/${QA_IDS.resource}`,
      data: {
        authorId: QA_USERS.teacher.uid,
        authorEmail: QA_USERS.teacher.email,
        authorName: QA_USERS.teacher.name,
        courseId: QA_SECTIONS.active,
        title: "Material de clase QA",
        body: "Documento sintético para probar la descarga autorizada.",
        kind: "resource",
        folder: "Unidad 1",
        storagePath: QA_IDS.filePath,
        fileName: "material.pdf",
        contentType: "application/pdf",
        fileSize: pdfSize,
        createdAt: stamp,
        dueDate: "",
      },
    },
    {
      path: `courses/${QA_SECTIONS.active}/submissions/${QA_IDS.report}_${QA_USERS.student.uid}`,
      data: {
        uid: QA_USERS.student.uid,
        courseId: QA_SECTIONS.active,
        evalId: QA_IDS.report,
        evaluation: { ...QA_GRADE_ITEMS[0] },
        authorName: QA_USERS.student.name,
        fileName: "informe.pdf",
        storagePath: QA_IDS.submissionPath,
        contentType: "application/pdf",
        size: pdfSize,
        sha256: pdfSha256,
        submittedBy: QA_USERS.student.uid,
        submittedByName: QA_USERS.student.name,
        teamId: "",
        memberIds: [],
        createdAt: stamp,
      },
    },
    {
      path: `courses/${QA_SECTIONS.active}/messageThreads/${QA_USERS.student.uid}`,
      data: {
        courseId: QA_SECTIONS.active,
        studentId: QA_USERS.student.uid,
        studentName: QA_USERS.student.name,
        studentEmail: QA_USERS.student.email,
        latestBody: "Gracias, revisaré la guía antes de la clase.",
        latestAuthorId: QA_USERS.student.uid,
        latestAuthorName: QA_USERS.student.name,
        createdAt: stamp,
        updatedAt: stamp,
      },
    },
    {
      path: `courses/${QA_SECTIONS.active}/messageThreads/${QA_USERS.student.uid}/messages/qa-message`,
      data: {
        courseId: QA_SECTIONS.active,
        threadId: QA_USERS.student.uid,
        authorId: QA_USERS.student.uid,
        authorName: QA_USERS.student.name,
        body: "Gracias, revisaré la guía antes de la clase.",
        createdAt: stamp,
      },
    }
  );
  for (const user of Object.values(QA_USERS)) {
    docs.push({
      path: `users/${user.uid}/calendar_events/qa-study`,
      data: {
        userId: user.uid,
        title: "Preparar informe QA",
        detail: "Revisar bibliografía y resultados.",
        date: "2026-09-22",
        startTime: "14:00",
        endTime: "15:00",
        courseId: user.uid === QA_USERS.outsider.uid ? QA_SECTIONS.other : QA_SECTIONS.active,
        kind: "study",
        completed: false,
        createdAt: stamp,
        updatedAt: stamp,
      },
    });
  }
  for (const quizId of [QA_IDS.quiz, QA_IDS.apiQuiz]) {
    docs.push(
      {
        path: `courses/${QA_SECTIONS.active}/quizzes/${quizId}`,
        data: {
          courseId: QA_SECTIONS.active,
          title:
            quizId === QA_IDS.quiz
              ? "Cuestionario de práctica QA"
              : "Cuestionario de contrato API QA",
          description: "Una pregunta sintética con corrección automática.",
          durationMinutes: 15,
          gradeItemId: QA_IDS.quizEvaluation,
          status: "published",
          questions: [{ ...QA_QUESTION }],
          totalPoints: 1,
          createdBy: QA_USERS.teacher.uid,
          createdAt: stamp,
        },
      },
      {
        path: `courses/${QA_SECTIONS.active}/quizKeys/${quizId}`,
        data: {
          courseId: QA_SECTIONS.active,
          quizId,
          answers: [{ ...QA_ANSWER }],
          createdBy: QA_USERS.teacher.uid,
          createdAt: stamp,
        },
      }
    );
  }
  return docs;
}
