// Implements: REQ-QA-03, REQ-QA-04
// Metadata stays independent of Playwright so discovery needs no browser or running server.
import { QA_STATE_SCENARIOS } from "./state-catalog.ts";
export const QA_ROLES = [
  "public",
  "student",
  "teacher",
  "owner",
  "assistant",
  "coordinator",
  "outsider",
] as const;
export type QaRole = (typeof QA_ROLES)[number];
export const QA_STATES = [
  "default",
  "populated",
  "empty",
  "loading",
  "error",
  "forbidden",
  "form",
  "dialog",
  "success",
  "readonly",
] as const;
export type QaState = (typeof QA_STATES)[number];
export type QaScenario = {
  id: string;
  area: string;
  sources: readonly string[];
  role: QaRole;
  state: QaState;
  critical: boolean;
  checkpoints: readonly string[];
  controlledFailure?: boolean;
  controlledResponse?: boolean;
  externalVerification?: string;
};

function scenario(
  id: string,
  area: string,
  sources: string[],
  role: QaRole,
  state: QaState,
  critical = false,
  checkpoints: string[] = [state]
): QaScenario {
  return { id, area, sources, role, state, critical, checkpoints };
}
const shell = [
  "app/Portal.tsx",
  "app/portal-shell.tsx",
  "app/mobile-shell.tsx",
  "app/usePortalCore.tsx",
  "app/command-palette.tsx",
];
const courses = ["app/views/CoursesDashboard.tsx", "app/views/CourseCard.tsx", "lib/courses.ts"];
const classroom = [
  "app/Classroom.tsx",
  "app/views/classroom/ClassroomView.tsx",
  "app/views/classroom/PostsSection.tsx",
  "app/views/classroom/CourseRail.tsx",
];
const publications = [
  "app/views/classroom/PublishView.tsx",
  "app/views/classroom/PublishPanels.tsx",
  "app/views/classroom/MultimodalEditor.tsx",
  "lib/publication-workflow.ts",
  "lib/firebase/posts.ts",
];
const grades = [
  "app/views/classroom/GradesSection.tsx",
  "app/views/classroom/GradebookSettingsEditor.tsx",
  "lib/firebase/grades.ts",
  "lib/grades.ts",
];
const submissions = [
  "app/views/classroom/SubmissionSlot.tsx",
  "app/views/classroom/SubmissionReviewTray.tsx",
  "app/views/classroom/PDFViewerPane.tsx",
  "lib/firebase/storage.ts",
];
const quizzes = [
  "app/views/classroom/TeacherQuizzes.tsx",
  "app/views/classroom/StudentQuizzes.tsx",
  "app/views/classroom/QuizViews.tsx",
  "lib/firebase/quizzes.ts",
  "firebase/functions/quiz-engine.js",
];
const communications = [
  "app/views/CommunicationsCenter.tsx",
  "app/notification-panel.tsx",
  "lib/firebase/communications.ts",
  "lib/communications.ts",
];
const calendar = [
  "app/views/calendar/CalendarView.tsx",
  "app/views/calendar/CalendarMonth.tsx",
  "app/views/calendar/BlockDialog.tsx",
  "lib/firebase/calendar.ts",
];
const people = [
  "app/views/classroom/PeopleSection.tsx",
  "lib/participants.ts",
  "app/api/sections/[sectionId]/participants/route.ts",
];
const imports = [
  "app/views/classroom/EnrollmentImport.tsx",
  "app/views/classroom/MoodleImportDialog.tsx",
  "app/views/classroom/AdeccaImportDialog.tsx",
  "lib/services/bulk-enrollment.ts",
  "lib/services/moodle-import.ts",
  "lib/services/adecca-import.ts",
];
const interop = [
  "app/views/classroom/InteropSection.tsx",
  "app/views/classroom/InteropAuthoringPanel.tsx",
  "app/views/classroom/InteropToolRegistration.tsx",
  "lib/services/interop.ts",
  "lib/interop/config.ts",
];
const teacher = [
  "app/views/TeacherCoursesView.tsx",
  "lib/teacher-course-client.ts",
  "lib/services/teacher-course-management.ts",
];
const admin = [
  "app/views/AdminView.tsx",
  "app/api/admin/users/route.ts",
  "app/api/admin/periods/route.ts",
];
const settings = [
  "app/views/SettingsView.tsx",
  "lib/user-preferences.ts",
  "lib/services/user-profile.ts",
  "app/api/profile/preferences/route.ts",
];

export const QA_SCENARIOS: readonly QaScenario[] = [
  ...QA_STATE_SCENARIOS,
  scenario(
    "auth.login",
    "auth",
    ["app/page.tsx", "app/Portal.tsx", "lib/firebase-client.ts"],
    "public",
    "default",
    true
  ),
  scenario(
    "auth.session",
    "auth",
    ["app/api/auth/firebase/route.ts", "lib/auth.ts"],
    "student",
    "success",
    true
  ),
  scenario(
    "auth.logout",
    "auth",
    ["app/portal-shell.tsx", "app/api/auth/logout/route.ts"],
    "student",
    "success",
    true
  ),
  scenario("shell.sidebar", "shell", shell, "student", "dialog"),
  scenario("shell.account", "shell", shell, "student", "dialog"),
  scenario("shell.notifications", "shell", [...shell, ...communications], "student", "populated"),
  scenario("shell.palette", "shell", shell, "student", "dialog", true),
  scenario("shell.palette-empty", "shell", shell, "student", "empty"),
  scenario("courses.student", "courses", courses, "student", "populated", true),
  scenario("courses.teacher", "courses", courses, "teacher", "populated"),
  scenario("courses.owner", "courses", courses, "owner", "populated"),
  scenario("courses.assistant", "courses", courses, "assistant", "populated"),
  scenario("courses.coordinator", "courses", courses, "coordinator", "populated"),
  scenario("courses.isolation", "courses", [...courses, ...people], "outsider", "forbidden", true),
  scenario("courses.filter-empty", "courses", courses, "student", "empty"),
  scenario("courses.archive", "courses", courses, "student", "readonly", true),
  scenario("courses.agenda", "courses", courses, "student", "populated"),
  scenario(
    "courses.agenda-cold",
    "courses",
    [...courses, "app/usePortalCore.tsx"],
    "student",
    "populated"
  ),
  scenario(
    "communications.announcements",
    "communications",
    communications,
    "student",
    "populated"
  ),
  scenario(
    "communications.messages",
    "communications",
    communications,
    "student",
    "populated",
    true
  ),
  scenario("communications.search-empty", "communications", communications, "student", "empty"),
  scenario("communications.reply", "communications", communications, "student", "success", true, [
    "form",
    "persisted",
  ]),
  scenario("calendar.week", "calendar", calendar, "student", "populated", true),
  scenario("calendar.month", "calendar", calendar, "student", "populated"),
  scenario("calendar.create", "calendar", calendar, "student", "form"),
  scenario("calendar.recurrence", "calendar", calendar, "student", "form"),
  scenario("calendar.invalid", "calendar", calendar, "student", "error"),
  scenario("calendar.persistence", "calendar", calendar, "student", "success", true, [
    "form",
    "persisted",
  ]),
  scenario(
    "resources.index",
    "resources",
    ["app/views/resources/ResourcesView.tsx", "app/views/resources/resources-data.ts"],
    "student",
    "populated"
  ),
  scenario("classroom.student", "classroom", classroom, "student", "populated", true),
  scenario("classroom.teacher", "classroom", classroom, "teacher", "populated"),
  scenario("classroom.owner", "classroom", classroom, "owner", "populated"),
  scenario("classroom.assistant", "classroom", classroom, "assistant", "populated"),
  scenario("classroom.coordinator", "classroom", classroom, "coordinator", "populated"),
  scenario("classroom.empty", "classroom", classroom, "student", "empty"),
  scenario("classroom.search-empty", "classroom", classroom, "student", "empty"),
  scenario("classroom.delete-dialog", "classroom", classroom, "teacher", "dialog"),
  scenario("classroom.edit-notice", "classroom", classroom, "teacher", "form"),
  scenario(
    "classroom.live-class",
    "classroom",
    [...classroom, "app/views/classroom/LiveClassSection.tsx"],
    "teacher",
    "form"
  ),
  scenario(
    "classroom.live-invalid",
    "classroom",
    [...classroom, "app/views/classroom/LiveClassSection.tsx"],
    "teacher",
    "error"
  ),
  scenario(
    "classroom.live-persistence",
    "classroom",
    [...classroom, "app/views/classroom/LiveClassSection.tsx"],
    "teacher",
    "success",
    true,
    ["form", "persisted"]
  ),
  scenario("publication.presets", "publications", publications, "teacher", "default"),
  ...["notice", "assessment", "guide", "blank"].map((kind) =>
    scenario(`publication.${kind}`, "publications", publications, "teacher", "form")
  ),
  scenario("publication.discard", "publications", publications, "teacher", "dialog"),
  scenario("publication.markdown", "publications", publications, "teacher", "form"),
  scenario("publication.html", "publications", publications, "teacher", "form"),
  scenario("publication.preview", "publications", publications, "teacher", "populated"),
  scenario("publication.notify-confirm", "publications", publications, "teacher", "dialog"),
  scenario("publication.persistence", "publications", publications, "teacher", "success", true, [
    "form",
    "persisted",
  ]),
  scenario("grades.student", "grades", grades, "student", "populated", true),
  scenario("grades.empty", "grades", grades, "student", "empty"),
  scenario("grades.teacher", "grades", grades, "teacher", "populated", true),
  scenario("grades.assistant", "grades", grades, "assistant", "populated"),
  scenario("grades.coordinator", "grades", grades, "coordinator", "populated"),
  scenario("grades.simulation", "grades", grades, "student", "form"),
  scenario("grades.feedback", "grades", grades, "teacher", "dialog"),
  scenario(
    "grades.history",
    "grades",
    [...grades, "app/views/classroom/GradeHistoryDialog.tsx"],
    "teacher",
    "dialog"
  ),
  scenario(
    "grades.records",
    "grades",
    [...grades, "app/views/classroom/FinalGradeRecordsPanel.tsx"],
    "teacher",
    "populated"
  ),
  scenario("grades.persistence", "grades", grades, "teacher", "success", true, [
    "form",
    "persisted",
  ]),
  scenario("submissions.upload", "submissions", submissions, "student", "form"),
  scenario(
    "submissions.individual-persistence",
    "submissions",
    submissions,
    "student",
    "success",
    true,
    ["form", "persisted"]
  ),
  scenario(
    "submissions.team-persistence",
    "submissions",
    [...submissions, "app/views/classroom/TeamSubmissionPicker.tsx"],
    "student",
    "success",
    true,
    ["form", "persisted"]
  ),
  scenario("submissions.review", "submissions", submissions, "teacher", "populated", true),
  scenario("submissions.pdf", "submissions", submissions, "teacher", "populated"),
  scenario("submissions.feedback", "submissions", submissions, "teacher", "form"),
  scenario("submissions.empty", "submissions", submissions, "teacher", "empty"),
  scenario("quizzes.student", "quizzes", quizzes, "student", "populated", true),
  scenario("quizzes.empty", "quizzes", quizzes, "student", "empty"),
  scenario("quizzes.teacher", "quizzes", quizzes, "teacher", "form"),
  scenario("quizzes.attempt", "quizzes", quizzes, "student", "form", true),
  scenario("quizzes.submission", "quizzes", quizzes, "student", "success", true, [
    "attempt",
    "result",
  ]),
  scenario("quizzes.import", "quizzes", quizzes, "teacher", "form"),
  scenario("people.directory", "people", people, "teacher", "populated", true),
  scenario("people.search-empty", "people", people, "teacher", "empty"),
  scenario("people.selection", "people", people, "teacher", "dialog"),
  scenario("people.loading", "people", people, "teacher", "loading"),
  scenario("people.error", "people", people, "teacher", "error"),
  scenario("imports.enrollment", "imports", imports, "teacher", "form"),
  scenario("imports.moodle", "imports", imports, "teacher", "dialog"),
  scenario("imports.adecca", "imports", imports, "teacher", "dialog"),
  scenario("imports.moodle-invalid", "imports", imports, "teacher", "error"),
  scenario("imports.adecca-invalid", "imports", imports, "teacher", "error"),
  scenario("imports.enrollment-persistence", "imports", imports, "teacher", "success", true, [
    "preview",
    "persisted",
  ]),
  scenario("imports.moodle-persistence", "imports", imports, "teacher", "success", true, [
    "preview",
    "persisted",
  ]),
  scenario("imports.adecca-persistence", "imports", imports, "teacher", "success", true, [
    "preview",
    "persisted",
  ]),
  scenario("interop.resources", "interop", interop, "student", "populated"),
  scenario("interop.empty", "interop", interop, "student", "empty"),
  scenario("interop.authoring", "interop", interop, "teacher", "form"),
  scenario("interop.registration", "interop", interop, "owner", "form"),
  scenario("interop.scorm", "interop", interop, "student", "success", true, [
    "activity",
    "completed",
  ]),
  scenario("interop.xapi", "interop", interop, "student", "success", true, [
    "activity",
    "completed",
  ]),
  {
    ...scenario("interop.lti", "interop", interop, "student", "populated"),
    externalVerification:
      "Local launch contract only. Actual provider interoperability requires staging.",
  },
  scenario("teacher.courses", "teacher", teacher, "teacher", "populated", true),
  scenario("teacher.create", "teacher", teacher, "teacher", "form"),
  scenario("teacher.settings", "teacher", teacher, "teacher", "form"),
  scenario("teacher.assistants", "teacher", teacher, "teacher", "form"),
  scenario("teacher.evaluations", "teacher", teacher, "teacher", "form"),
  scenario("teacher.error", "teacher", teacher, "teacher", "error"),
  scenario("admin.users", "admin", admin, "owner", "populated", true),
  scenario("admin.search-empty", "admin", admin, "owner", "empty"),
  scenario("admin.periods", "admin", admin, "owner", "populated"),
  scenario("admin.error", "admin", admin, "owner", "error"),
  scenario("admin.forbidden", "admin", admin, "student", "forbidden", true),
  scenario("settings.profile", "settings", settings, "student", "populated", true),
  scenario("settings.preferences", "settings", settings, "student", "form"),
  scenario("settings.sessions", "settings", settings, "student", "populated"),
  scenario("settings.error", "settings", settings, "student", "error"),
  scenario("settings.photo-invalid", "settings", settings, "student", "error"),
  scenario("settings.photo-crop", "settings", settings, "student", "form"),
  scenario("settings.photo-persistence", "settings", settings, "student", "success", true, [
    "crop",
    "persisted",
  ]),
  scenario("settings.persistence", "settings", settings, "student", "success", true, [
    "form",
    "persisted",
  ]),
  scenario("public.faq", "public", ["app/faq/page.tsx"], "public", "default"),
  scenario(
    "public.contact",
    "public",
    ["app/contacto/page.tsx", "app/contacto/ContactForm.tsx"],
    "public",
    "form"
  ),
  scenario("public.contact-invalid", "public", ["app/contacto/ContactForm.tsx"], "public", "error"),
  scenario("public.privacy", "public", ["app/privacidad/page.tsx"], "public", "default"),
  scenario("public.terms", "public", ["app/terminos/page.tsx"], "public", "default"),
  scenario(
    "public.accessibility",
    "public",
    ["app/accesibilidad/page.tsx"],
    "public",
    "default",
    true
  ),
  scenario("public.preview", "public", ["app/preview/docente/page.tsx"], "public", "default"),
  scenario("public.not-found", "public", ["app/not-found.tsx"], "public", "error"),
].map((entry) =>
  ["people.loading", "people.error", "teacher.error", "admin.error", "settings.error"].includes(
    entry.id
  )
    ? { ...entry, controlledFailure: true }
    : entry
);

export const QA_AREAS = [...new Set(QA_SCENARIOS.map((entry) => entry.area))];
