"use client";

import { AnimatePresence } from "motion/react";
import { Check, CopySimple, Info, LockKey } from "@phosphor-icons/react";
import { Course } from "../../../lib/courses";
import { Screen } from "../../portal-ui";
import type { User } from "../../../lib/portal-utils";
import { COURSE_TABS, studentCount, tabTitle } from "./classroom-utils";
import { Bar } from "./ProgressBar";
import { PostsSection } from "./PostsSection";
import { MaterialsSection } from "./MaterialsSection";
import { GradesSection } from "./GradesSection";
import { ProgressSection } from "./ProgressSection";
import { PeopleSection } from "./PeopleSection";
import { LiveClassSection } from "./LiveClassSection";
import { RichTextAssets } from "./RichText";
import { useClassroomHandlers } from "./use-classroom-handlers";
import type { SectionRole } from "../../../lib/section-roles";

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
    files,
    students,
    posts,
    units,
    completed,
    courseReference,
    updateProgress,
    publish,
    upload,
    editPost,
    deletePost,
    openFile,
    renameFile,
    moveFile,
    deleteFile,
    copyCourseReference,
    saveLiveClass,
    clearLiveClass,
  } = useClassroomHandlers(course, user, sectionRole);

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
          <div>
            <span className="breadcrumb">
              <button onClick={goBack} type="button">
                Mis cursos
              </button>{" "}
              / {course.name}
            </span>
            <h1>{tab === "home" ? course.name : tabTitle(tab)}</h1>
          </div>
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
                    openMaterials={() => setTab("materials")}
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
                  </aside>
                </div>
              </>
            )}
            {tab === "materials" && (
              <MaterialsSection
                course={course}
                files={files}
                user={user}
                canTeach={canTeach}
                canManageContent={canManageContent}
                publish={publish}
                upload={upload}
                openFile={openFile}
                renameFile={renameFile}
                moveFile={moveFile}
                deleteFile={deleteFile}
                status={status}
              />
            )}
            {tab === "grades" && (
              <GradesSection
                course={course}
                classroom={classroom}
                canTeach={canTeach}
                note={note}
                status={status}
                readOnly={readOnly}
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
