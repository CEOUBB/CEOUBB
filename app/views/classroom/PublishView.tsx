"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BellRinging,
  BellSlash,
  FloppyDisk,
  PencilSimpleLine,
} from "@phosphor-icons/react";
import type { ClassroomAttachment } from "../../../lib/firebase-classroom-client";
import type { Course } from "../../../lib/courses";
import { hapticTap } from "../../../lib/mobile-bridge";
import {
  CONTENT_TYPES,
  clearPublicationDraft,
  createPublicationDraft,
  persistDefaultEditor,
  persistPublicationDraft,
  readDefaultEditor,
  readPublicationDraft,
  readingStats,
  templateForContentType,
  type EditorMode,
  type NotificationMode,
  type PublicationContentType,
} from "../../../lib/publication-workflow";
import { NOTIFICATION_MODES } from "../../../lib/publication-workflow";
import type { Note } from "./classroom-utils";
import { RichPostEditor } from "./RichPostEditor";
import {
  AttachmentField,
  PresetStage,
  PublishRestoredNotice,
  usePostAttachments,
} from "./PublishPanels";

/* El borrador se guarda cuando el docente hace una pausa, no en cada tecla. */
const AUTOSAVE_DELAY_MS = 1200;

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/*
  La hora se compone al guardar, no al pintar: `toLocaleTimeString` depende de
  la zona horaria del dispositivo y no debe ejecutarse en cada render.
*/
function savedTimeLabel(savedAt: string) {
  if (!savedAt) return "";
  const stamp = new Date(savedAt);
  if (Number.isNaN(stamp.getTime())) return "";
  return stamp.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

/* Alertas al curso. Van primero en el inspector porque deciden a cuánta gente
   interrumpe esta publicación. */
// Implements: REQ-PUB-06
function AlertField({
  notificationMode,
  onChange,
}: {
  notificationMode: NotificationMode;
  onChange: (value: NotificationMode) => void;
}) {
  return (
    <fieldset className="publish-alerts">
      <legend>Alertas al curso</legend>
      {NOTIFICATION_MODES.map((option) => (
        <label
          data-checked={notificationMode === option.value ? "true" : "false"}
          key={option.value}
        >
          <input
            aria-describedby={`notification-${option.value}-hint`}
            checked={notificationMode === option.value}
            name="notificationMode"
            onChange={() => onChange(option.value)}
            type="radio"
            value={option.value}
          />
          {option.value === "push" ? (
            <BellRinging aria-hidden="true" size={17} />
          ) : (
            <BellSlash aria-hidden="true" size={17} />
          )}
          <span>
            <strong>{option.label}</strong>
            <small id={`notification-${option.value}-hint`}>{option.description}</small>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function PublishBar({
  courseName,
  contentType,
  draftState,
  savedLabel,
  saving,
  submitLabel,
  onDiscard,
}: {
  courseName: string;
  contentType: PublicationContentType;
  draftState: "new" | "saving" | "saved";
  savedLabel: string;
  saving: boolean;
  submitLabel: string;
  onDiscard: () => void;
}) {
  return (
    <header className="publish-bar">
      <button
        className="publish-back"
        data-hardware-back="publish"
        onClick={onDiscard}
        type="button"
      >
        <ArrowLeft aria-hidden="true" size={16} weight="bold" />
        Volver al ramo
      </button>
      <p className="publish-bar-context">
        <span>{courseName}</span>
        <small>{CONTENT_TYPES.find((option) => option.value === contentType)?.label}</small>
      </p>
      {/* El borrador vive en este equipo, no en la nube: el icono y el texto
          lo dicen para que nadie lo busque desde el teléfono. */}
      <p
        aria-label="Estado del borrador"
        aria-live="polite"
        className="publish-autosave"
        data-draft-state={draftState}
        role="status"
      >
        {draftState === "saved" && savedLabel ? (
          <>
            <FloppyDisk aria-hidden="true" size={16} weight="fill" />
            Guardado en este equipo <span className="num">{savedLabel}</span>
          </>
        ) : draftState === "saving" ? (
          <>
            <FloppyDisk aria-hidden="true" size={16} />
            Guardando…
          </>
        ) : (
          <>
            <PencilSimpleLine aria-hidden="true" size={16} />
            Borrador nuevo
          </>
        )}
      </p>
      <button className="publish-submit" disabled={saving} type="submit">
        {submitLabel}
      </button>
    </header>
  );
}

// Implements: REQ-PUB-01 REQ-PUB-06 REQ-PUB-08 REQ-PUB-09 REQ-PUB-10 REQ-PUB-11 REQ-PUB-12
export function PublishView({
  course,
  onClose,
  publish,
  status,
  studentTotal,
}: {
  course: Course;
  onClose: () => void;
  publish: (
    event: FormEvent<HTMLFormElement>,
    attachments: ClassroomAttachment[]
  ) => Promise<boolean>;
  status: Note;
  studentTotal: number;
}) {
  /*
    Un borrador a medio escribir vale más que la elección de plantilla: si el
    docente vuelve, retomamos su texto y saltamos directo al lienzo. La lectura
    ocurre una sola vez, al inicializar el estado, para no encadenar renders.
  */
  // Implements: REQ-PUB-11
  const [restoredDraft] = useState(() => readPublicationDraft(browserStorage(), course.id));
  const [contentType, setContentType] = useState<PublicationContentType | null>(
    restoredDraft?.contentType ?? null
  );
  const [editorMode, setEditorMode] = useState<EditorMode>(
    () => restoredDraft?.editorMode ?? readDefaultEditor(browserStorage()) ?? "visual"
  );
  const [title, setTitle] = useState(restoredDraft?.title ?? "");
  const [body, setBody] = useState(restoredDraft?.body ?? "");
  const [notificationMode, setNotificationMode] = useState<NotificationMode>(
    restoredDraft?.notificationMode ?? "push"
  );
  const { attachments, uploading, attachmentError, fileRef, attachFiles, removeAttachment } =
    usePostAttachments(course.id);
  const [savedLabel, setSavedLabel] = useState(() => savedTimeLabel(restoredDraft?.savedAt ?? ""));
  const [draftState, setDraftState] = useState<"new" | "saving" | "saved">(
    restoredDraft ? "saved" : "new"
  );
  const [restoredVisible, setRestoredVisible] = useState(restoredDraft !== null);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  /* El primer pase del efecto es el montaje: no hay cambios que anunciar. */
  const settledRef = useRef(false);

  useEffect(() => {
    if (contentType !== null) titleRef.current?.focus();
  }, [contentType]);

  /* Publicar sin soltar el teclado: el atajo que espera quien escribe seguido.
     Se registra sobre el elemento y no en JSX para no colgar un manejador de
     teclado de un contenedor que no es interactivo. */
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const shortcut = (event: globalThis.KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") return;
      event.preventDefault();
      form.requestSubmit();
    };
    form.addEventListener("keydown", shortcut);
    return () => form.removeEventListener("keydown", shortcut);
  }, [contentType]);

  // Implements: REQ-PUB-11
  useEffect(() => {
    if (contentType === null) return;
    const hasContent = Boolean(title.trim() || body.trim());
    if (hasContent && settledRef.current) setDraftState("saving");
    settledRef.current = true;
    const timer = window.setTimeout(() => {
      const stamp = new Date().toISOString();
      const stored = persistPublicationDraft(browserStorage(), course.id, {
        contentType,
        editorMode,
        notificationMode,
        title,
        body,
        folder: "",
        dueDate: "",
        linkUrl: "",
        savedAt: stamp,
      });
      if (stored && hasContent) {
        setSavedLabel(savedTimeLabel(stamp));
        setDraftState("saved");
      } else {
        setSavedLabel("");
        setDraftState("new");
      }
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [body, contentType, course.id, editorMode, notificationMode, title]);

  const stats = useMemo(() => readingStats(body), [body]);

  const choosePreset = (value: PublicationContentType) => {
    hapticTap();
    setContentType(value);
    setBody(templateForContentType(value));
  };

  const changeEditorMode = useCallback((mode: EditorMode) => {
    setEditorMode(mode);
    persistDefaultEditor(browserStorage(), mode);
  }, []);

  /*
    Publicar con alerta es la única acción irreversible del estudio: la
    notificación llega a cada teléfono del curso y no se puede retirar. Por eso
    se confirma nombrando a cuánta gente alcanza, y publicar en silencio no
    interrumpe a nadie ni pide confirmación.
  */
  // Implements: REQ-PUB-06
  const confirmPush = () => {
    const audience =
      studentTotal > 0
        ? `${studentTotal} estudiante${studentTotal === 1 ? "" : "s"}`
        : "quienes estén inscritos";
    return window.confirm(
      `Vas a publicar y alertar a ${audience} de ${course.name}. La notificación llega a Android y Web, y no se puede retirar.`
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (notificationMode === "push" && !confirmPush()) return;
    setSaving(true);
    try {
      if (await publish(event, attachments)) {
        clearPublicationDraft(browserStorage(), course.id);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (
      (title.trim() || body.trim()) &&
      !window.confirm("¿Descartar esta publicación y volver al ramo?")
    )
      return;
    clearPublicationDraft(browserStorage(), course.id);
    onClose();
  };

  if (contentType === null) {
    return <PresetStage courseName={course.name} onChoose={choosePreset} onClose={onClose} />;
  }

  const submitLabel = saving
    ? "Publicando…"
    : notificationMode === "push"
      ? "Publicar y alertar"
      : "Publicar en silencio";

  return (
    <form
      className="publish-studio"
      data-requirement="Implements: REQ-PUB-01 REQ-PUB-06 REQ-PUB-08 REQ-PUB-09 REQ-PUB-10 REQ-PUB-11"
      onSubmit={submit}
      ref={formRef}
    >
      <input
        name="kind"
        type="hidden"
        value={
          createPublicationDraft({
            contentType,
            editorMode,
            folder: "",
            notificationMode,
          }).kind
        }
      />
      <input name="editorMode" type="hidden" value={editorMode} />
      {/* Carpeta, fecha de entrega y enlace externo no se exponen en el
          inspector por decisión de producto: viajan vacíos para conservar el
          contrato del formulario que lee `publish`. */}
      <input name="folder" type="hidden" value="" />
      <input name="dueDate" type="hidden" value="" />
      <input name="linkUrl" type="hidden" value="" />

      <PublishBar
        contentType={contentType}
        courseName={course.name}
        draftState={draftState}
        onDiscard={discard}
        savedLabel={savedLabel}
        saving={saving}
        submitLabel={submitLabel}
      />

      {/* El resultado de publicar se lee junto al botón que lo dispara, no al
          final de una columna que en el teléfono queda a una pantalla de scroll. */}
      {status.text && (
        <p className={`publish-status tool-status ${status.tone}`} role="status">
          {status.text}
        </p>
      )}

      {restoredVisible && <PublishRestoredNotice onDismiss={() => setRestoredVisible(false)} />}

      <div className="publish-body">
        <label className="publish-title-field">
          <span className="sr-only">Título de la publicación</span>
          <input
            autoComplete="off"
            maxLength={140}
            name="title"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Título de la publicación"
            ref={titleRef}
            required
            value={title}
          />
        </label>

        <div className="publish-grid">
          <div className="publish-canvas">
            <RichPostEditor
              editorMode={editorMode}
              label="Cuerpo de la publicación"
              name="body"
              onChange={setBody}
              onEditorModeChange={changeEditorMode}
              required
              value={body}
            />
            <p className="publish-reading num" role="status">
              {stats.words.toLocaleString("es-CL")} palabras · cerca de {stats.minutes} min de
              lectura
            </p>
          </div>

          <aside aria-label="Ajustes de la publicación" className="publish-inspector">
            <AlertField notificationMode={notificationMode} onChange={setNotificationMode} />

            <AttachmentField
              attachments={attachments}
              error={attachmentError}
              fileRef={fileRef}
              onAttach={(files) => void attachFiles(files)}
              onRemove={removeAttachment}
              uploading={uploading}
            />
          </aside>
        </div>
      </div>
    </form>
  );
}

export default PublishView;
