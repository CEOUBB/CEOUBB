"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "motion/react";
import { Check, CopySimple, Info, LockKey, Plus, Tray } from "@phosphor-icons/react";
import type { Course } from "../../../lib/courses";
import { Screen } from "../../portal-ui";
import type { User } from "../../../lib/portal-utils";
import { hapticTap } from "../../../lib/mobile-bridge";
import { COURSE_TABS, studentCount, tabTitle } from "./classroom-utils";
import { Bar } from "./ProgressBar";
import { PostsSection } from "./PostsSection";
import { GradesSection } from "./GradesSection";
import { ProgressSection } from "./ProgressSection";
import { PeopleSection } from "./PeopleSection";
import { LiveClassSection } from "./LiveClassSection";
import { QuizzesSection } from "./QuizzesSection";
import { RichTextAssets } from "./RichText";
import { useClassroomHandlers } from "./use-classroom-handlers";
import type { SectionRole } from "../../../lib/section-roles";
import { canReadGradeHistory } from "../../../lib/section-roles";

const MoodleImportDialog = dynamic(
  () => import("./MoodleImportDialog").then((module) => module.MoodleImportDialog),
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
    units,
    completed,
    courseReference,
    updateProgress,
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
        <header className="classroom-top">
          <div className="classroom-heading">
            <span className="breadcrumb">
              <button onClick={goBack} type="button">
                Mis cursos
              </button>{" "}
              / {course.name}
            </span>
            <h1>{tab === "home" ? course.name : tabTitle(tab)}</h1>
          </div>
          {/* Implements: REQ-PUB-13 — las acciones docentes viven en el
              encabezado del ramo, disponibles desde cualquier pestaña. */}
          <div className="classroom-meta">
            <button
              aria-label={
                copiedCourseReference ? "Código copiado" : `Copiar código ${courseReference}`
              }
              className="course-reference"
              onClick={copyCourseReference}
              title={copiedCourseReference ? "Código copiado" : "Copiar código del ramo"}
              type="button"
            >
              Código: {courseReference}
              {copiedCourseReference ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <CopySimple size={14} aria-hidden="true" />
              )}
            </button>
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
                <button className="publication-cta" onClick={startPublication} type="button">
                  <Plus size={17} weight="bold" aria-hidden="true" />
                  Nueva publicación
                </button>
              </>
            )}
          </div>
        </header>
        <nav aria-label="Secciones del aula" className="course-tabs">
          {COURSE_TABS.map(({ key, label, Icon }) => (
            <button
              aria-current={tab === key ? "page" : undefined}
              className={tab === key ? "active" : ""}
              key={key}
              onClick={() => setTab(key)}
              type="button"
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <AnimatePresence initial={false} mode="wait">
          <Screen key={tab}>
            {tab === "home" && (
              <>
                <LiveClassSection
                  liveClass={classroom.liveClass}
                  canTeach={canTeach && !readOnly}
                  status={liveClassStatus}
                  invalid={liveClassInvalid}
                  onSave={saveLiveClass}
                  onClear={clearLiveClass}
                />
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
                  <aside className="course-rail">
                    <div className="section-title compact-title">
                      <h2>
                        <Info size={19} weight="fill" aria-hidden="true" />
                        Información del ramo
                      </h2>
                    </div>
                    <div className="course-facts">
                      <dl>
                        <div>
                          <dt>Coordinación</dt>
                          <dd>
                            <b>{course.teacher}</b>
                            <small>Cuenta docente institucional</small>
                          </dd>
                        </div>
                        <div>
                          <dt>{canTeach ? "Estudiantes" : "Tu avance"}</dt>
                          <dd>
                            <b>
                              {canTeach
                                ? studentCount(students.length)
                                : units.length > 0
                                  ? `${completed} de ${units.length} unidades`
                                  : "Sin unidades cargadas"}
                            </b>
                            {!canTeach && units.length > 0 && (
                              <span className="mini-progress">
                                <Bar ratio={units.length ? completed / units.length : 0} />
                              </span>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    {status.text && (
                      <p className={`tool-status ${status.tone}`} role="status">
                        {status.text}
                      </p>
                    )}
                  </aside>
                </div>
              </>
            )}
            {tab === "grades" && (
              <GradesSection
                course={course}
                classroom={classroom}
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
            {tab === "progress" && (
              <ProgressSection
                units={units}
                canTeach={canTeach}
                completed={completed}
                students={students}
                updateProgress={updateProgress}
                readOnly={readOnly}
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
          </Screen>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default ClassroomView;
