"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ClassroomAttachment,
  ClassroomPost,
  ClassroomState,
  classroomFileUrl,
  deleteClassroomPost,
  editClassroomPost,
  publishClassroomPost,
  saveClassroomProgress,
  saveLiveClassLink,
  watchClassroom,
} from "../../../lib/firebase-classroom-client";
import { Course } from "../../../lib/courses";
import { isNativeShell } from "../../../lib/mobile-bridge";
import { openDocumentNatively } from "../../../lib/native-files";
import type { User } from "../../../lib/portal-utils";
import { LIVE_CLASS_INVALID_MESSAGE } from "../../../lib/live-class";
import {
  canManageSectionContent,
  canTeachSection,
  type SectionRole,
} from "../../../lib/section-roles";
import { emptyClassroom, type Note, type Tab } from "./classroom-utils";

// Implements: REQ-ASST-01, REQ-ASST-03, REQ-ASST-04, REQ-ASST-05
export function useClassroomHandlers(course: Course, user: User, sectionRole: SectionRole | null) {
  const [tab, setTab] = useState<Tab>("home");
  const [classroom, setClassroom] = useState<ClassroomState>(emptyClassroom);
  const [status, setStatus] = useState<Note>({ text: "", tone: "info" });
  const [liveClassStatus, setLiveClassStatus] = useState<Note>({ text: "", tone: "info" });
  const [liveClassInvalid, setLiveClassInvalid] = useState(false);
  const [copiedCourseReference, setCopiedCourseReference] = useState(false);

  const note = (text: string, tone: Note["tone"] = "info") => setStatus({ text, tone });
  const readOnly = course.readOnly === true;
  const canManageContent = !readOnly && canManageSectionContent(user.role, sectionRole);
  const canTeach = canTeachSection(user.role, sectionRole);
  const { students, posts } = classroom;
  const units = course.units;
  const completed =
    typeof classroom.ownProgress === "number" && !Number.isNaN(classroom.ownProgress)
      ? classroom.ownProgress
      : 0;
  const courseReference = `${course.code} - ${course.section}`;
  const rejectReadOnly = () => {
    if (!readOnly) return false;
    note("Este ramo está archivado y sólo admite lectura.", "bad");
    return true;
  };

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
    if (rejectReadOnly()) return;
    const safeNext = typeof next === "number" && !Number.isNaN(next) ? Math.max(0, next) : 0;
    setClassroom((current) => ({ ...current, ownProgress: safeNext }));
    await saveClassroomProgress(course.id, safeNext, units.length).catch((cause) =>
      note(cause instanceof Error ? cause.message : "No se pudo guardar el progreso.", "bad")
    );
  };

  // Implements: REQ-PUB-09
  const publish = async (
    event: FormEvent<HTMLFormElement>,
    attachments: ClassroomAttachment[] = []
  ) => {
    event.preventDefault();
    if (rejectReadOnly()) return false;
    note("Publicando…");
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const notifyStudents = String(form.get("notificationMode")) !== "silent";
    try {
      await publishClassroomPost(course.id, {
        title: String(form.get("title") ?? ""),
        body: String(form.get("body") ?? ""),
        kind: String(form.get("kind") ?? "notice"),
        folder: String(form.get("folder") ?? ""),
        linkUrl: String(form.get("linkUrl") ?? ""),
        dueDate: String(form.get("dueDate") ?? ""),
        notifyStudents,
        attachments,
      });
      formElement.reset();
      note(
        notifyStudents
          ? "Publicado correctamente y notificado al curso."
          : "Publicado correctamente sin enviar alertas.",
        "ok"
      );
      return true;
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible publicar.", "bad");
      return false;
    }
  };

  const editPost = async (post: ClassroomPost, values: { title: string; body: string }) => {
    if (rejectReadOnly()) return false;
    try {
      await editClassroomPost(course.id, post.id, values);
      note("Publicación actualizada.", "ok");
      return true;
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible modificarla.", "bad");
      return false;
    }
  };

  const deletePost = async (post: ClassroomPost) => {
    if (rejectReadOnly()) return;
    if (!window.confirm(`¿Eliminar “${post.title}”?`)) return;
    try {
      await deleteClassroomPost(course.id, post.id, post.storagePath);
      note("Publicación eliminada.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible eliminarla.", "bad");
    }
  };

  /*
    Sirve tanto al archivo que se publicó solo como al adjunto que viaja dentro
    de un aviso: ambos se identifican por su ruta en Cloud Storage.
  */
  // Implements: REQ-PUB-09
  const openAttachment = async (file: { name: string; storagePath: string; url?: string }) => {
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
      note("No se pudo abrir con el visor del sistema; se intentará en el navegador.", "info");
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

  // Implements: REQ-LIVE-01, REQ-LIVE-02, REQ-LIVE-05, REQ-LIVE-07
  const saveLiveClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (rejectReadOnly()) return;
    const formElement = event.currentTarget;
    const value = String(new FormData(formElement).get("liveClassUrl") ?? "");
    setLiveClassInvalid(false);
    setLiveClassStatus({ text: "Guardando enlace…", tone: "info" });
    try {
      await saveLiveClassLink(course.id, value);
      setLiveClassStatus({
        text: value.trim() ? "Enlace de clase en vivo guardado." : "Enlace eliminado.",
        tone: "ok",
      });
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "No se pudo guardar la clase en vivo.";
      const invalid = message === LIVE_CLASS_INVALID_MESSAGE;
      setLiveClassInvalid(invalid);
      setLiveClassStatus({ text: message, tone: "bad" });
      if (invalid) {
        (formElement.elements.namedItem("liveClassUrl") as HTMLInputElement | null)?.focus();
      }
    }
  };

  // Implements: REQ-LIVE-05, REQ-LIVE-07
  const clearLiveClass = async () => {
    if (rejectReadOnly()) return;
    setLiveClassInvalid(false);
    setLiveClassStatus({ text: "Quitando enlace…", tone: "info" });
    try {
      await saveLiveClassLink(course.id, "");
      setLiveClassStatus({ text: "Enlace eliminado.", tone: "ok" });
    } catch (cause) {
      setLiveClassStatus({
        text: cause instanceof Error ? cause.message : "No se pudo quitar la clase en vivo.",
        tone: "bad",
      });
    }
  };

  return {
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
  };
}
