"use client";

import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Check, CopySimple, Info } from "@phosphor-icons/react";
import {
  ClassroomFile,
  ClassroomPost,
  ClassroomState,
  classroomFileUrl,
  deleteClassroomPost,
  editClassroomPost,
  moveClassroomPost,
  publishClassroomPost,
  renameClassroomFile,
  saveClassroomProgress,
  uploadClassroomFile,
  watchClassroom,
} from "../../../lib/firebase-classroom-client";
import { Course, materialFolders } from "../../../lib/courses";
import { Screen } from "../../portal-ui";
import { isNativeShell } from "../../../lib/mobile-bridge";
import { openDocumentNatively } from "../../../lib/native-files";
import type { User } from "../../../lib/portal-utils";
import {
  Bar,
  COURSE_TABS,
  emptyClassroom,
  studentCount,
  type Note,
  type Tab,
  tabTitle,
} from "./classroom-utils";
import { PostsSection } from "./PostsSection";
import { MaterialsSection } from "./MaterialsSection";
import { GradesSection } from "./GradesSection";
import { ProgressSection } from "./ProgressSection";
import { PeopleSection } from "./PeopleSection";

export function ClassroomView({
  course,
  user,
  goBack,
}: {
  course: Course;
  user: User;
  goBack: () => void;
}) {
  const [tab, setTab] = useState<Tab>("home");
  const [classroom, setClassroom] = useState<ClassroomState>(emptyClassroom);
  const [status, setStatus] = useState<Note>({ text: "", tone: "info" });
  const [copiedCourseReference, setCopiedCourseReference] = useState(false);
  const note = (text: string, tone: Note["tone"] = "info") => setStatus({ text, tone });
  const canTeach = user.role === "teacher" || user.role === "owner";
  const { files, students, posts } = classroom;
  const units = course.units;
  const completed =
    typeof classroom.ownProgress === "number" && !Number.isNaN(classroom.ownProgress)
      ? classroom.ownProgress
      : 0;
  const courseReference = `${course.code} - ${course.section}`;

  useEffect(
    () =>
      watchClassroom(
        course.id,
        canTeach,
        (patch) => setClassroom((current) => ({ ...current, ...patch })),
        (message) => note(message, "bad")
      ),
    [course.id, canTeach]
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab]);

  const updateProgress = async (next: number) => {
    const safeNext = typeof next === "number" && !Number.isNaN(next) ? Math.max(0, next) : 0;
    setClassroom((current) => ({ ...current, ownProgress: safeNext }));
    await saveClassroomProgress(course.id, safeNext, units.length).catch((cause) =>
      note(cause instanceof Error ? cause.message : "No se pudo guardar el progreso.", "bad")
    );
  };

  const publish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    note("Publicando…");
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    try {
      await publishClassroomPost(course.id, {
        title: String(form.get("title") ?? ""),
        body: String(form.get("body") ?? ""),
        kind: String(form.get("kind") ?? "notice"),
        folder: String(form.get("folder") ?? ""),
        linkUrl: String(form.get("linkUrl") ?? ""),
        dueDate: String(form.get("dueDate") ?? ""),
      });
      formElement.reset();
      note("Publicado correctamente y notificado al curso.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible publicar.", "bad");
    }
  };

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    note("Subiendo archivo…");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    if (!(file instanceof File)) return note("Selecciona un archivo.", "bad");
    try {
      await uploadClassroomFile(
        course.id,
        file,
        String(form.get("folder") ?? ""),
        (percent) => note(`Subiendo archivo… ${percent}%`)
      );
      formElement.reset();
      note("Archivo disponible y notificado al curso.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible subir el archivo.", "bad");
    }
  };

  const editPost = async (post: ClassroomPost) => {
    const title = window.prompt("Título de la publicación", post.title);
    if (title === null) return;
    const body = window.prompt("Contenido de la publicación", post.body);
    if (body === null) return;
    try {
      await editClassroomPost(course.id, post.id, { title, body });
      note("Publicación actualizada.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible modificarla.", "bad");
    }
  };

  const deletePost = async (post: ClassroomPost) => {
    if (!window.confirm(`¿Eliminar “${post.title}”?`)) return;
    try {
      await deleteClassroomPost(course.id, post.id, post.storagePath);
      note("Publicación eliminada.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible eliminarla.", "bad");
    }
  };

  /*
    En el contenedor nativo la WebView no debe intentar pintar el PDF: se descarga
    con Filesystem y se entrega al visor del sistema. Si el traspaso falla por lo
    que sea, cae al mismo camino del navegador que ya existía.
  */
  // Implements: REQ-CAP-11
  const openFile = async (file: ClassroomFile) => {
    if (isNativeShell()) {
      note("Descargando archivo…");
      try {
        const url = file.url || (await classroomFileUrl(file.storagePath));
        if (await openDocumentNatively(url, file.name)) return note("", "info");
      } catch (cause) {
        return note(
          cause instanceof Error ? cause.message : "No fue posible abrir el archivo.",
          "bad"
        );
      }
      note(
        "No se pudo abrir con el visor del sistema; se intentará en el navegador.",
        "info"
      );
    }
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const url = file.url || (await classroomFileUrl(file.storagePath));
      if (tab) tab.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch (cause) {
      tab?.close();
      note(cause instanceof Error ? cause.message : "No fue posible abrir el archivo.", "bad");
    }
  };

  const renameFile = async (file: ClassroomFile) => {
    const name = window.prompt("Nombre del archivo", file.name);
    if (name === null) return;
    try {
      await renameClassroomFile(course.id, file.id, name);
      note("Archivo renombrado.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible modificarlo.", "bad");
    }
  };

  const moveFile = async (file: ClassroomFile) => {
    const folder = window.prompt(
      `Carpeta del archivo (${materialFolders(course).join(", ")})`,
      file.folder
    );
    if (folder === null) return;
    try {
      await moveClassroomPost(course.id, file.id, folder);
      note("Archivo movido de carpeta.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible moverlo.", "bad");
    }
  };

  const deleteFile = async (file: ClassroomFile) => {
    if (!window.confirm(`¿Eliminar “${file.name}”?`)) return;
    try {
      await deleteClassroomPost(course.id, file.id, file.storagePath);
      note("Archivo eliminado.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible eliminarlo.", "bad");
    }
  };

  const copyCourseReference = async () => {
    try {
      await navigator.clipboard.writeText(courseReference);
      setCopiedCourseReference(true);
      window.setTimeout(() => setCopiedCourseReference(false), 1600);
      note("Código del ramo copiado.", "ok");
    } catch {
      note("No fue posible copiar el código del ramo.", "bad");
    }
  };

  return (
    <div className="classroom-layout" style={{ "--course-tone": course.tone } as React.CSSProperties}>
      <main className="classroom-main">
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
              aria-label={copiedCourseReference ? "Código copiado" : `Copiar código ${courseReference}`}
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
              <div className="classroom-columns">
                <PostsSection
                  posts={posts}
                  user={user}
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
            )}
            {tab === "materials" && (
              <MaterialsSection
                course={course}
                files={files}
                user={user}
                canTeach={canTeach}
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
              />
            )}
            {tab === "progress" && (
              <ProgressSection
                units={units}
                canTeach={canTeach}
                completed={completed}
                students={students}
                updateProgress={updateProgress}
              />
            )}
            {tab === "people" && <PeopleSection course={course} user={user} students={students} />}
          </Screen>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default ClassroomView;
