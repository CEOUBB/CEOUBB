"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ClassroomAttachment,
  ClassroomState,
  CoursePost,
  classroomFileUrl,
  editClassroomPost,
  publishClassroomPost,
  releaseUploadedFiles,
  restoreTrashEntry,
  touchSectionPresence,
  saveLiveClassLink,
  trashItems,
  watchClassroom,
} from "../../../lib/firebase-classroom-client";
import { buildCoursePage } from "../../../lib/course-page";
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
import { toast } from "../../../lib/toast";

// Implements: REQ-ASST-01, REQ-ASST-03, REQ-ASST-04, REQ-ASST-05, REQ-TOAST-01
export function useClassroomHandlers(course: Course, user: User, sectionRole: SectionRole | null) {
  const [tab, setTab] = useState<Tab>("home");
  const [retry, setRetry] = useState(0);
  const [classroom, setClassroom] = useState<ClassroomState>(emptyClassroom);
  const [status, setStatus] = useState<Note>({ text: "", tone: "info" });
  const [liveClassStatus, setLiveClassStatus] = useState<Note>({ text: "", tone: "info" });
  const [liveClassInvalid, setLiveClassInvalid] = useState(false);
  const [copiedCourseReference, setCopiedCourseReference] = useState(false);
  const note = useCallback((text: string, tone: Note["tone"] = "info") => {
    setStatus({ text, tone });
    toast.note(text, tone);
    if (tone === "ok" && text) {
      window.setTimeout(() => {
        setStatus((prev) => (prev.text === text ? { text: "", tone: "info" } : prev));
      }, 2500);
    }
  }, []);
  const readOnly = course.readOnly === true;
  const canSeeHidden = canManageSectionContent(user.role, sectionRole);
  const canManageContent = !readOnly && canSeeHidden;
  const canTeach = canTeachSection(user.role, sectionRole);
  const { students, posts } = classroom;
  const courseReference = `${course.code} - ${course.section}`;
  const rejectReadOnly = useCallback(() => {
    if (!readOnly) return false;
    note("Este ramo está archivado y sólo admite lectura.", "bad");
    return true;
  }, [note, readOnly]);

  useEffect(
    () =>
      watchClassroom(
        course.id,
        canTeach,
        canSeeHidden,
        (patch) => setClassroom((current) => ({ ...current, ...patch })),
        (message) => note(message, "bad")
      ),
    [course.id, canTeach, canSeeHidden, note, retry]
  );

  // Implements: REQ-PAGE-01, REQ-PAGE-05
  const page = useMemo(
    () =>
      buildCoursePage({
        sections: classroom.sections,
        posts: classroom.posts,
        hiddenItems: classroom.hiddenItems,
        audience: canSeeHidden ? "team" : "student",
      }),
    [canSeeHidden, classroom.hiddenItems, classroom.posts, classroom.sections]
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab]);

  /*
    Marca de presencia del estudiante. La nómina que el equipo docente corrige
    se arma con estos documentos, así que registrarla al abrir el aula deja
    visible a todo matriculado, entregue o no. Un fallo aquí no se le informa al
    estudiante: no le pidió nada y no puede hacer nada al respecto.
  */
  // Implements: REQ-EVAL-04
  useEffect(() => {
    if (canTeach || readOnly) return;
    void touchSectionPresence(course.id).catch(() => undefined);
  }, [course.id, canTeach, readOnly]);

  // Implements: REQ-PUB-09
  const publish = useCallback(
    async (event: FormEvent<HTMLFormElement>, attachments: ClassroomAttachment[] = []) => {
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
    },
    [course.id, note, rejectReadOnly]
  );

  // Implements: REQ-PAGE-08, REQ-PAGE-09, REQ-PUB-09
  const editPost = useCallback(
    async (
      post: CoursePost,
      values: { title: string; body: string; attachments: ClassroomAttachment[] }
    ) => {
      if (rejectReadOnly()) return false;
      try {
        await editClassroomPost(course.id, post.id, values);
        note("Aviso actualizado.", "ok");
      } catch (cause) {
        note(cause instanceof Error ? cause.message : "No fue posible modificarlo.", "bad");
        return false;
      }
      const kept = new Set(values.attachments.map((attachment) => attachment.storagePath));
      const removed = post.attachments
        .map((attachment) => attachment.storagePath)
        .filter((path) => !kept.has(path));
      await releaseUploadedFiles(course.id, removed).catch(() =>
        note("El aviso se guardó, pero no se pudieron borrar los archivos que quitaste.", "bad")
      );
      return true;
    },
    [course.id, note, rejectReadOnly]
  );

  // Implements: REQ-PAGE-06, REQ-PAGE-09
  const restorePost = useCallback(
    async (post: CoursePost) => {
      try {
        await restoreTrashEntry(
          course.id,
          {
            id: post.id,
            kind: "item",
            sectionId: "",
            sectionTitle: "",
            placement: "notice",
            hidden: false,
          },
          []
        );
        return true;
      } catch (cause) {
        note(cause instanceof Error ? cause.message : "No se pudo restaurar el aviso.", "bad");
        return false;
      }
    },
    [course.id, note]
  );

  // Implements: REQ-PAGE-06, REQ-PAGE-09
  const deletePost = useCallback(
    async (post: CoursePost) => {
      if (rejectReadOnly()) return false;
      try {
        await trashItems(course.id, [post], "Avisos");
      } catch (cause) {
        note(cause instanceof Error ? cause.message : "No fue posible eliminarlo.", "bad");
        return false;
      }
      toast.message("El aviso se movió a la papelera.", {
        action: { label: "Deshacer", onClick: () => void restorePost(post) },
      });
      return true;
    },
    [course.id, note, rejectReadOnly, restorePost]
  );

  /*
    Sirve tanto al archivo que se publicó solo como al adjunto que viaja dentro
    de un aviso: ambos se identifican por su ruta en Cloud Storage.
  */
  // Implements: REQ-PUB-09
  const openAttachment = useCallback(
    async (file: { name: string; storagePath: string; url?: string }) => {
      if (isNativeShell()) {
        note("Descargando archivo…");
        try {
          const url = file.storagePath ? await classroomFileUrl(file.storagePath) : file.url || "";
          try {
            if (await openDocumentNatively(url, file.name)) return note("", "info");
          } finally {
            if (url.startsWith("blob:")) URL.revokeObjectURL(url);
          }
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
        const url = file.storagePath ? await classroomFileUrl(file.storagePath) : file.url || "";
        if (tab) tab.location.href = url;
        else window.open(url, "_blank", "noopener,noreferrer");
      } catch (cause) {
        tab?.close();
        note(cause instanceof Error ? cause.message : "No fue posible abrir el archivo.", "bad");
      }
    },
    [note]
  );

  const copyCourseReference = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(courseReference);
      setCopiedCourseReference(true);
      window.setTimeout(() => setCopiedCourseReference(false), 2000);
    } catch {
      note("No fue posible copiar el código del ramo.", "bad");
    }
  }, [courseReference, note]);

  // Implements: REQ-LIVE-01, REQ-LIVE-02, REQ-LIVE-05, REQ-LIVE-07
  const saveLiveClass = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
    },
    [course.id, rejectReadOnly]
  );

  // Implements: REQ-LIVE-05, REQ-LIVE-07
  const clearLiveClass = useCallback(async () => {
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
  }, [course.id, rejectReadOnly]);

  return {
    tab,
    setTab,
    classroom,
    retryClassroom: () => setRetry((value) => value + 1),
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
    page,
    canSeeHidden,
    courseReference,
    publish,
    editPost,
    deletePost,
    restorePost,
    openAttachment,
    copyCourseReference,
    saveLiveClass,
    clearLiveClass,
  };
}
