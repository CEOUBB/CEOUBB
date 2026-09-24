import type { QaScenario, QaRole, QaState } from "./catalog.ts";

// Implements: REQ-QA-03, REQ-QA-04
// These states use the shipped UI. Controlled transport/dependency failures are
// explicitly labeled; successful writes still go through the local backend.
function state(
  id: string,
  area: string,
  sources: string[],
  role: QaRole,
  semantic: QaState,
  controlledFailure = false,
  checkpoints: string[] = [semantic]
): QaScenario {
  return {
    id,
    area,
    sources,
    role,
    state: semantic,
    critical: false,
    controlledFailure,
    checkpoints,
  };
}

export const QA_STATE_SCENARIOS: readonly QaScenario[] = [
  state(
    "auth.loading",
    "auth",
    ["app/LoadingScreen.tsx", "app/usePortalCore.tsx"],
    "student",
    "loading",
    true
  ),
  state(
    "teacher.data-loading",
    "teacher",
    ["app/views/TeacherCoursesView.tsx", "app/views/ViewSkeletons.tsx"],
    "teacher",
    "loading",
    true
  ),
  state(
    "shell.notifications-loading",
    "shell",
    ["app/notification-panel.tsx", "lib/firebase/communications.ts"],
    "student",
    "loading",
    true
  ),
  state(
    "communications.conversation-loading",
    "communications",
    ["app/views/CommunicationsCenter.tsx", "lib/firebase/communications.ts"],
    "student",
    "loading",
    true
  ),
  ...["student", "teacher"].map((role) =>
    state(
      `quizzes.${role}-loading`,
      "quizzes",
      ["app/views/classroom/QuizzesSection.tsx", "app/views/ViewSkeletons.tsx"],
      role === "teacher" ? "teacher" : "student",
      "loading",
      true
    )
  ),
  ...["answer-saving", "answer-error", "submit-loading", "submit-error"].map((name) =>
    state(
      `quizzes.${name}`,
      "quizzes",
      [
        "app/views/classroom/StudentQuizzes.tsx",
        "app/views/classroom/QuizQuestionField.tsx",
        "lib/firebase/quizzes.ts",
      ],
      "student",
      name.endsWith("error") ? "error" : "loading",
      true
    )
  ),
  ...["loading", "error"].map((name) =>
    state(
      `grades.history-${name}`,
      "grades",
      [
        "app/views/classroom/GradeHistoryDialog.tsx",
        "lib/grade-history.ts",
        "app/api/sections/[sectionId]/grade-history/route.ts",
      ],
      "teacher",
      name === "error" ? "error" : "loading",
      true
    )
  ),
  state(
    "interop.loading",
    "interop",
    ["app/views/classroom/InteropSection.tsx", "app/views/ViewSkeletons.tsx"],
    "student",
    "loading",
    true
  ),
  state(
    "interop.load-error",
    "interop",
    ["app/views/classroom/InteropSection.tsx"],
    "student",
    "error",
    true,
    ["error", "recovered"]
  ),
  ...["viewer-loading", "file-loading"].map((name) =>
    state(
      `submissions.${name}`,
      "submissions",
      ["app/views/classroom/SubmissionReviewTray.tsx", "app/views/classroom/PDFViewerPane.tsx"],
      "teacher",
      "loading",
      true
    )
  ),
  ...["sending", "server-error", "network-error", "server-validation"].map((name) =>
    state(
      `public.contact-${name}`,
      "public",
      ["app/contacto/ContactForm.tsx", "app/api/soporte/route.ts"],
      "public",
      name === "sending" ? "loading" : "error",
      true
    )
  ),
  {
    ...state(
      "public.contact-delivered",
      "public",
      ["app/contacto/ContactForm.tsx"],
      "public",
      "success"
    ),
    controlledResponse: true,
    externalVerification:
      "Simulated HTTP 201 provider-delivery response for the actual receipt UI only; deliveryVerified=false. Real email receipt requires staging.",
  },
  {
    ...state(
      "public.contact-deferred",
      "public",
      [
        "app/contacto/ContactForm.tsx",
        "app/api/soporte/route.ts",
        "lib/services/support-requests.ts",
      ],
      "public",
      "success"
    ),
    externalVerification:
      "The actual local API persists the request with no provider configured; deliveryVerified=false. No email is sent.",
  },
  state(
    "public.contact-domain-warning",
    "public",
    ["app/contacto/ContactForm.tsx"],
    "public",
    "form"
  ),
  ...["periods-loading", "archive-loading", "archive-error", "role-error"].map((name) =>
    state(
      `admin.${name}`,
      "admin",
      ["app/views/AdminView.tsx", "app/api/admin/periods/route.ts", "app/api/admin/users/route.ts"],
      "owner",
      name.endsWith("loading") ? "loading" : "error",
      true
    )
  ),
  ...[
    ["calendar", "student", "app/views/calendar/CalendarView.tsx"],
    ["resources", "student", "app/views/resources/ResourcesView.tsx"],
    ["communications", "student", "app/views/CommunicationsCenter.tsx"],
    ["admin", "owner", "app/views/AdminView.tsx"],
    ["teacher", "teacher", "app/views/TeacherCoursesView.tsx"],
    ["settings", "student", "app/views/SettingsView.tsx"],
    ["classroom", "student", "app/Classroom.tsx"],
  ].map(([area, role, source]) =>
    state(
      `${area}.loading`,
      area,
      ["app/portal-shell.tsx", "app/views/ViewSkeletons.tsx", source],
      role === "owner" ? "owner" : role === "teacher" ? "teacher" : "student",
      "loading",
      true
    )
  ),
  state(
    "calendar.delete-dialog",
    "calendar",
    ["app/views/calendar/CalendarView.tsx", "app/views/calendar/PlannerBlock.tsx"],
    "student",
    "dialog"
  ),
  state(
    "settings.sessions-loading",
    "settings",
    ["app/views/SettingsView.tsx", "app/api/profile/sessions/route.ts"],
    "student",
    "loading",
    true
  ),
  state(
    "settings.sessions-error",
    "settings",
    ["app/views/SettingsView.tsx", "app/api/profile/sessions/route.ts"],
    "student",
    "error",
    true
  ),
  state(
    "settings.session-revoke-error",
    "settings",
    ["app/views/SettingsView.tsx", "app/api/profile/sessions/route.ts"],
    "student",
    "error",
    true
  ),
  state(
    "grades.feedback-saving",
    "grades",
    ["app/views/classroom/GradesSection.tsx", "lib/firebase/grades.ts"],
    "teacher",
    "loading",
    true,
    ["loading", "persisted"]
  ),
  state(
    "grades.feedback-error",
    "grades",
    ["app/views/classroom/GradesSection.tsx", "lib/firebase/grades.ts"],
    "teacher",
    "error",
    true
  ),
  state(
    "grades.feedback-success",
    "grades",
    ["app/views/classroom/GradesSection.tsx", "lib/firebase/grades.ts"],
    "teacher",
    "success",
    false,
    ["success", "persisted"]
  ),
  state(
    "grades.cell-save-error",
    "grades",
    ["app/views/classroom/GradesSection.tsx", "lib/firebase/grades.ts"],
    "teacher",
    "error",
    true
  ),
  state(
    "submissions.uploading",
    "submissions",
    ["app/views/classroom/SubmissionSlot.tsx", "lib/firebase/storage.ts"],
    "student",
    "loading",
    true,
    ["loading", "persisted"]
  ),
  state(
    "submissions.upload-retry",
    "submissions",
    ["app/views/classroom/SubmissionSlot.tsx", "lib/firebase/storage.ts"],
    "student",
    "error",
    true,
    ["error", "recovered"]
  ),
  state(
    "submissions.document-error",
    "submissions",
    ["app/views/classroom/SubmissionReviewTray.tsx", "lib/firebase/storage.ts"],
    "teacher",
    "error",
    true
  ),
  state("public.sentry", "public", ["app/sentry-example-page/page.tsx"], "public", "default"),
  state(
    "public.sentry-server-loading",
    "public",
    ["app/sentry-example-page/page.tsx", "app/api/sentry-test/route.ts"],
    "public",
    "loading",
    true
  ),
  state(
    "public.sentry-server-error",
    "public",
    ["app/sentry-example-page/page.tsx", "app/api/sentry-test/route.ts"],
    "public",
    "error",
    true
  ),
  state(
    "public.sentry-client-error",
    "public",
    ["app/sentry-example-page/page.tsx"],
    "public",
    "error",
    true
  ),
  state(
    "public.global-error",
    "public",
    ["app/global-error.tsx", "app/command-palette.tsx", "lib/hooks/use-touch-capable.ts"],
    "student",
    "error",
    true
  ),
];
