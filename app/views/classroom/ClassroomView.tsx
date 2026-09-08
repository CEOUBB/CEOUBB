"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Tab } from "./classroom-utils";
import { LockKey, Plus, Tray } from "@phosphor-icons/react";
import type { Course } from "../../../lib/courses";
import { Screen } from "../../portal-ui";
import type { User } from "../../../lib/portal-utils";
import { hapticTap } from "../../../lib/mobile-bridge";
import { COURSE_TABS } from "./classroom-utils";
import { PostsSection } from "./PostsSection";
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
  { ssr: false }
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
    status,
    liveClassStatus,
    liveClassInvalid,
    note,
    copiedCourseReference,
    readOnly,
    canManageContent,
    canTeach,
    students,
    posts,
    courseReference,
    publish,
    editPost,
    deletePost,
    openAttachment,
    copyCourseReference,
    saveLiveClass,
    clearLiveClass,
  } = useClassroomHandlers(course, user, sectionRole);

  // Implements: REQ-PUB-01
  const [composing, setComposing] = useState(false);
  // Implements: REQ-REV-04
  const [reviewing, setReviewing] = useState(false);
  const reduce = useReducedMotion();

  const handleTabKeyDown = (key: Tab, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const currentIndex = COURSE_TABS.findIndex((t) => t.key === key);
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    const nextIndex = (currentIndex + direction + COURSE_TABS.length) % COURSE_TABS.length;
    const nextKey = COURSE_TABS[nextIndex].key;
    setTab(nextKey);
    requestAnimationFrame(() => {
      document.getElementById(`classroom-tab-${nextKey}`)?.focus();
    });
  };

  const startPublication = () => {
    hapticTap();
    setComposing(true);
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
          onClose={() => setComposing(false)}
          publish={publish}
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
        <header className="classroom-top">
          <div className="classroom-heading">
            <span className="breadcrumb">
              <button onClick={goBack} type="button">
                Mis cursos
              </button>{" "}
              / {course.name}
            </span>
            <h1>{course.name}</h1>
            <p className="classroom-identity">
              <span className="num">{course.code}</span> · Sección{" "}
              <span className="num">{course.section}</span> · {course.period}
            </p>
          </div>
          {/* Implements: REQ-PUB-13 — las acciones docentes viven en el
              encabezado del ramo, disponibles desde cualquier pestaña. */}
          {(canTeach || canManageContent) && (
            <div className="classroom-meta">
              {canTeach && (
                /* Implements: REQ-REV-04 */
                <button className="review-cta" onClick={startReview} type="button">
                  <Tray size={16} aria-hidden="true" />
                  Corregir entregas
                </button>
              )}
              {canManageContent && (
                <>
                  {canTeach && <MoodleImportDialog course={course} />}
                  {canTeach && <AdeccaImportDialog course={course} />}
                  <button className="publication-cta" onClick={startPublication} type="button">
                    <Plus size={17} weight="bold" aria-hidden="true" />
                    Nueva publicación
                  </button>
                </>
              )}
            </div>
          )}
        </header>
        <nav
          aria-label="Secciones del aula"
          className="course-tabs"
          role="tablist"
          aria-orientation="horizontal"
        >
          {COURSE_TABS.map(({ key, label, Icon }) => {
            const isActive = tab === key;
            return (
              <button
                key={key}
                id={`classroom-tab-${key}`}
                role="tab"
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                aria-current={isActive ? "page" : undefined}
                aria-controls={`classroom-panel-${key}`}
                className={`relative isolate inline-flex items-center justify-center font-medium transition-colors outline-none cursor-pointer ${
                  isActive
                    ? "active text-[oklch(0.48_0.18_255)] font-semibold"
                    : "text-[oklch(0.36_0.03_255)] hover:text-[oklch(0.2_0.03_260)]"
                }`}
                onClick={() => setTab(key)}
                onKeyDown={(e) => handleTabKeyDown(key, e)}
                type="button"
              >
                {isActive && (
                  <motion.span
                    layoutId="active-classroom-tab-indicator"
                    className="absolute inset-x-0 inset-y-1 z-0 rounded-lg bg-[oklch(0.48_0.18_255/0.1)] border border-[oklch(0.48_0.18_255/0.22)] shadow-xs"
                    transition={
                      reduce
                        ? { duration: 0 }
                        : {
                            type: "spring",
                            stiffness: 340,
                            damping: 28,
                          }
                    }
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-2">
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </span>
              </button>
            );
          })}
        </nav>
        <AnimatePresence initial={false} mode="wait">
          <Screen key={tab}>
            <div
              id={`classroom-panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`classroom-tab-${tab}`}
            >
              <ClassroomErrorBoundary
                fallbackTitle="No se pudo cargar la vista del curso"
                key={tab}
              >
                {tab === "home" && (
                  <>
                    <LiveClassBanner liveClass={classroom.liveClass} />
                    <div className="classroom-columns">
                      <PostsSection
                        posts={posts}
                        user={user}
                        canManageContent={canManageContent}
                        editPost={editPost}
                        deletePost={deletePost}
                        openAttachment={openAttachment}
                        startPublication={startPublication}
                      />
                      <CourseRail
                        course={course}
                        canTeach={canTeach}
                        readOnly={readOnly}
                        students={students}
                        courseReference={courseReference}
                        copiedCourseReference={copiedCourseReference}
                        copyCourseReference={copyCourseReference}
                        liveClass={classroom.liveClass}
                        liveClassStatus={liveClassStatus}
                        liveClassInvalid={liveClassInvalid}
                        saveLiveClass={saveLiveClass}
                        clearLiveClass={clearLiveClass}
                        status={status}
                      />
                    </div>
                  </>
                )}
                {tab === "grades" && (
                  <GradesSection
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
        </AnimatePresence>
      </main>
    </div>
  );
}

export default ClassroomView;
