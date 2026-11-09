"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Tab } from "./classroom-utils";
import { LockKey, PencilSimpleLine, Plus, Tray } from "@phosphor-icons/react";
import type { Course } from "../../../lib/courses";
import type { CoursePost } from "../../../lib/firebase-classroom-client";
import { Screen } from "../../portal-ui";
import type { User } from "../../../lib/portal-utils";
import { hapticTap } from "../../../lib/mobile-bridge";
import { COURSE_TABS } from "./classroom-utils";
import { ClassroomHeader, ClassroomTabs } from "./ClassroomChrome";
import { transitionView } from "../../../lib/view-transition";
import { CoursePage, type ComposeSeed } from "./CoursePage";
import { AnnouncementsPanel, AnnouncementsReader } from "./AnnouncementsPanel";
import { CourseIndex, CourseMobileBar } from "./CourseNavigation";
import { GradesSection } from "./GradesSection";
import { PeopleSection } from "./PeopleSection";
import { LiveClassBanner } from "./LiveClassSection";
import { CourseRail } from "./CourseRail";
import { QuizzesSection } from "./QuizzesSection";
import { RichTextAssets } from "./RichText";
import { useClassroomHandlers } from "./use-classroom-handlers";
import type { SectionRole } from "../../../lib/section-roles";
import { canReadGradeHistory } from "../../../lib/section-roles";
import { ClassroomErrorBoundary } from "../../components/ClassroomErrorBoundary";
import { InteropWorkspaceSkeleton } from "../ViewSkeletons";

const MoodleImportDialog = dynamic(
  () => import("./MoodleImportDialog").then((module) => module.MoodleImportDialog),
  { ssr: false }
);

const AdeccaImportDialog = dynamic(
  () => import("./AdeccaImportDialog").then((module) => module.AdeccaImportDialog),
  { ssr: false }
);

const InteropSection = dynamic(
  () => import("./InteropSection").then((module) => module.InteropSection),
  { ssr: false, loading: () => <InteropWorkspaceSkeleton /> }
);

/*
  El estudio de publicación carga sólo cuando un docente decide escribir: el
  editor, su vista previa y KaTeX no deben pesar en el arranque del aula para
  los miles de estudiantes que nunca publican.
*/
// Implements: REQ-PERF-01 REQ-PUB-01
const PublishView = dynamic(() => import("./PublishView").then((module) => module.PublishView), {
  ssr: false,
});

/*
  La bandeja de corrección sólo existe para quien enseña la sección: su visor de
  PDF y la cola de entregas no deben viajar en el paquete que abre el aula.
*/
// Implements: REQ-REV-01 REQ-PERF-01
const SubmissionReviewTray = dynamic(
  () => import("./SubmissionReviewTray").then((module) => module.SubmissionReviewTray),
  { ssr: false }
);

function ClassroomActions({
  canTeach,
  canManageContent,
  course,
  editingPage,
  onReview,
  onEditPage,
  onCompose,
}: {
  canTeach: boolean;
  canManageContent: boolean;
  course: Course;
  editingPage: boolean;
  onReview: () => void;
  onEditPage: () => void;
  onCompose: () => void;
}) {
  // Implements: REQ-PERF-LOAD-01
  const [importsMounted, setImportsMounted] = useState(false);
  return (
    <div className="classroom-meta">
      {canTeach && (
        /* Implements: REQ-REV-04 */
        <button className="review-cta" onClick={onReview} type="button">
          <Tray size={16} aria-hidden="true" />
          Corregir entregas
        </button>
      )}
      {canManageContent && (
        <>
          {canTeach && (
            <details
              className="classroom-imports"
              onToggle={(event) => {
                if (event.currentTarget.open) setImportsMounted(true);
              }}
            >
              <summary>Importar contenidos</summary>
              {importsMounted && (
                <div className="classroom-import-actions">
                  {canTeach && <MoodleImportDialog course={course} />}
                  {canTeach && <AdeccaImportDialog course={course} />}
                </div>
              )}
            </details>
          )}
          {!editingPage && (
            <button className="review-cta" onClick={onEditPage} type="button">
              <PencilSimpleLine size={16} aria-hidden="true" />
              Editar página
            </button>
          )}
          <button className="publication-cta" onClick={onCompose} type="button">
            <Plus size={17} weight="bold" aria-hidden="true" />
            Nuevo aviso
          </button>
        </>
      )}
    </div>
  );
}

export function ClassroomView({
  course,
  user,
  sectionRole,
  goBack,
}: {
  course: Course;
  user: User;
  sectionRole: SectionRole | null;
  goBack: () => void;
}) {
  const {
    tab,
    setTab,
    classroom,
    retryClassroom,
    status,
    liveClassStatus,
    liveClassInvalid,
    note,
    copiedCourseReference,
    readOnly,
    canManageContent,
    canSeeHidden,
    canTeach,
    students,
    page,
    courseReference,
    publish,
    editPost,
    deletePost,
    restorePost,
    openAttachment,
    copyCourseReference,
    saveLiveClass,
    clearLiveClass,
  } = useClassroomHandlers(course, user, sectionRole);

  // Implements: REQ-PUB-01, REQ-PAGE-09, REQ-PAGE-10
  const [composing, setComposing] = useState(false);
  const [composeSeed, setComposeSeed] = useState<ComposeSeed | null>(null);
  const [editingPost, setEditingPost] = useState<CoursePost | null>(null);
  // Implements: REQ-PAGE-03
  const [editingPage, setEditingPage] = useState(false);
  const [reader, setReader] = useState<{ focusId: string } | null>(null);
  // Implements: REQ-REV-04
  const [reviewing, setReviewing] = useState(false);

  const handleTabKeyDown = (key: Tab, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const currentIndex = COURSE_TABS.findIndex((t) => t.key === key);
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    const nextIndex = (currentIndex + direction + COURSE_TABS.length) % COURSE_TABS.length;
    const nextKey = COURSE_TABS[nextIndex].key;
    setTab(nextKey);
    document.getElementById(`classroom-tab-${nextKey}`)?.focus();
  };

  const selectTab = (next: Tab) => {
    const from = COURSE_TABS.findIndex((item) => item.key === tab);
    const to = COURSE_TABS.findIndex((item) => item.key === next);
    transitionView(() => setTab(next), to > from ? "tab-forward" : "tab-back");
  };

  const startPublication = (seed: ComposeSeed | null = null, post: CoursePost | null = null) => {
    hapticTap();
    setReader(null);
    setComposeSeed(seed);
    setEditingPost(post);
    setComposing(true);
  };

  const startPageEditing = () => {
    hapticTap();
    setTab("home");
    setEditingPage(true);
  };

  const finishPageEditing = (seed: ComposeSeed | null) => {
    setEditingPage(false);
    if (seed) startPublication(seed);
  };

  const startReview = () => {
    hapticTap();
    setReviewing(true);
  };

  /*
    Corregir ocupa la pantalla completa igual que publicar: leer el trabajo de
    un estudiante y ponerle nota no admite competir con las pestañas del aula.
  */
  // Implements: REQ-REV-04
  if (reviewing && canTeach) {
    return (
      <div
        className="classroom-layout classroom-layout-studio"
        style={{ "--course-tone": course.tone } as React.CSSProperties}
      >
        <RichTextAssets />
        <SubmissionReviewTray
          classroom={classroom}
          course={course}
          onClose={() => setReviewing(false)}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (composing) {
    return (
      <div
        className="classroom-layout classroom-layout-studio"
        style={{ "--course-tone": course.tone } as React.CSSProperties}
      >
        <RichTextAssets />
        <PublishView
          course={course}
          editing={editingPost}
          onClose={() => setComposing(false)}
          publish={publish}
          saveEdit={editPost}
          seed={composeSeed}
          status={status}
          studentTotal={students.length}
        />
      </div>
    );
  }

  return (
    <div
      className="classroom-layout"
      style={{ "--course-tone": course.tone } as React.CSSProperties}
    >
      <RichTextAssets />
      <main className="classroom-main">
        {course.readOnly && (
          <div className="classroom-archive-notice" role="status">
            <LockKey aria-hidden="true" size={19} weight="fill" />
            <span>
              <strong>Solo lectura.</strong> Este ramo pertenece a {course.period} y conserva sus
              materiales, entregas y notas como historial académico.
            </span>
          </div>
        )}
        {/*
          El h1 conserva el nombre del ramo en todas las pestañas: repetir el
          rótulo de la pestaña activa justo encima de la pestaña activa dejaba
          las acciones del ramo colgando de un título de sección.
        */}
        <ClassroomHeader course={course} onBack={goBack}>
          {/* Implements: REQ-PUB-13, REQ-PAGE-03 — las acciones docentes viven en el
              encabezado del ramo, disponibles desde cualquier pestaña. */}
          {(canTeach || canManageContent) && (
            <ClassroomActions
              canManageContent={canManageContent}
              canTeach={canTeach}
              course={course}
              editingPage={editingPage}
              onCompose={() => startPublication()}
              onEditPage={startPageEditing}
              onReview={startReview}
            />
          )}
        </ClassroomHeader>
        <ClassroomTabs onKeyDown={handleTabKeyDown} onSelect={selectTab} tab={tab} />
        <Screen key={tab}>
          <div
            id={`classroom-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`classroom-tab-${tab}`}
          >
            <ClassroomErrorBoundary fallbackTitle="No se pudo cargar la vista del curso" key={tab}>
              {tab === "home" && (
                <>
                  <LiveClassBanner liveClass={classroom.liveClass} />
                  {!editingPage && (
                    <CourseMobileBar
                      announcements={page.announcements}
                      onOpenAnnouncements={(focusId) => setReader({ focusId: focusId ?? "" })}
                      sections={page.sections}
                    />
                  )}
                  <div className="classroom-columns" data-editing={editingPage}>
                    <CoursePage
                      canEdit={canManageContent}
                      classroom={classroom}
                      course={course}
                      editing={editingPage}
                      onFinishEditing={finishPageEditing}
                      onStartEditing={startPageEditing}
                      openAttachment={openAttachment}
                      page={page}
                      retry={retryClassroom}
                      team={canSeeHidden}
                    />
                    <CourseRail
                      announcements={
                        <AnnouncementsPanel
                          announcements={page.announcements}
                          loading={classroom.postsStatus === "loading"}
                          onOpen={(focusId) => setReader({ focusId: focusId ?? "" })}
                        />
                      }
                      canTeach={canTeach}
                      clearLiveClass={clearLiveClass}
                      copiedCourseReference={copiedCourseReference}
                      copyCourseReference={copyCourseReference}
                      course={course}
                      courseReference={courseReference}
                      index={editingPage ? null : <CourseIndex sections={page.sections} />}
                      liveClass={classroom.liveClass}
                      liveClassInvalid={liveClassInvalid}
                      liveClassStatus={liveClassStatus}
                      readOnly={readOnly}
                      saveLiveClass={saveLiveClass}
                      showParticipants={() => selectTab("people")}
                      status={status}
                    />
                  </div>
                  {reader && (
                    <AnnouncementsReader
                      announcements={page.announcements}
                      canManage={canManageContent}
                      focusId={reader.focusId}
                      onClose={() => setReader(null)}
                      onCompose={() => startPublication()}
                      onDelete={deletePost}
                      onRestore={restorePost}
                      onEdit={(post) => startPublication(null, post)}
                      openAttachment={openAttachment}
                    />
                  )}
                </>
              )}
              {tab === "grades" && (
                <GradesSection
                  retry={retryClassroom}
                  course={course}
                  classroom={classroom}
                  user={user}
                  canTeach={canTeach}
                  canReadHistory={canReadGradeHistory(user.role, sectionRole)}
                  note={note}
                  status={status}
                  readOnly={readOnly}
                />
              )}
              {tab === "quizzes" && (
                <QuizzesSection
                  course={course}
                  classroom={classroom}
                  canTeach={canTeach}
                  note={note}
                  readOnly={readOnly}
                />
              )}
              {tab === "interop" && (
                <InteropSection
                  key={course.id}
                  sectionId={course.id}
                  canTeach={canTeach}
                  isOwner={user.role === "owner"}
                  readOnly={readOnly}
                  note={note}
                />
              )}
              {tab === "people" && (
                <PeopleSection
                  canTeach={canTeach}
                  course={course}
                  sectionRole={sectionRole}
                  students={students}
                  user={user}
                />
              )}
            </ClassroomErrorBoundary>
          </div>
        </Screen>
      </main>
    </div>
  );
}

export default ClassroomView;
