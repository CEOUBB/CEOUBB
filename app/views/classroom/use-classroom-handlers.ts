"use client";

import { FormEvent, useEffect, useState } from "react";
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
  saveLiveClassLink,
  uploadClassroomFile,
  watchClassroom,
} from "../../../lib/firebase-classroom-client";
import { Course, materialFolders } from "../../../lib/courses";
import { isNativeShell } from "../../../lib/mobile-bridge";
import { openDocumentNatively } from "../../../lib/native-files";
import type { User } from "../../../lib/portal-utils";
import { LIVE_CLASS_INVALID_MESSAGE } from "../../../lib/live-class";
import { emptyClassroom, type Note, type Tab } from "./classroom-utils";

export function useClassroomHandlers(course: Course, user: User) {
  const [tab, setTab] = useState<Tab>("home");
  const [classroom, setClassroom] = useState<ClassroomState>(emptyClassroom);
  const [status, setStatus] = useState<Note>({ text: "", tone: "info" });
  const [liveClassStatus, setLiveClassStatus] = useState<Note>({ text: "", tone: "info" });
  const [liveClassInvalid, setLiveClassInvalid] = useState(false);
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

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    note("Subiendo archivo…");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    if (!(file instanceof File)) return note("Selecciona un archivo.", "bad");
    try {
      await uploadClassroomFile(course.id, file, String(form.get("folder") ?? ""), (percent) =>
        note(`Subiendo archivo… ${percent}%`)
      );
      formElement.reset();
      note("Archivo disponible y notificado al curso.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible subir el archivo.", "bad");
    }
  };

  const editPost = async (post: ClassroomPost, values: { title: string; body: string }) => {
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
    if (!window.confirm(`¿Eliminar “${post.title}”?`)) return;
    try {
      await deleteClassroomPost(course.id, post.id, post.storagePath);
      note("Publicación eliminada.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible eliminarla.", "bad");
    }
  };

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

  // Implements: REQ-LIVE-01, REQ-LIVE-02, REQ-LIVE-05, REQ-LIVE-07
  const saveLiveClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
  };
}
