"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type RefObject,
} from "react";
import {
  ArrowLeft,
  BellRinging,
  BellSlash,
  BookOpen,
  CheckCircle,
  ClipboardText,
  CloudCheck,
  File as FileIcon,
  FolderOpen,
  LinkSimple,
  Megaphone,
  Paperclip,
  PencilSimpleLine,
  Trash,
  type Icon,
} from "@phosphor-icons/react";
import {
  MAX_POST_ATTACHMENTS,
  uploadPostAttachment,
  type ClassroomAttachment,
} from "../../../lib/firebase-classroom-client";
import type { Course } from "../../../lib/courses";
import { formatBytes } from "../../../lib/portal-utils";
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

const CONTENT_ICONS: Record<PublicationContentType, Icon> = {
  notice: Megaphone,
  assessment: ClipboardText,
  guide: BookOpen,
  blank: FileIcon,
};

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

/*
  Primera pantalla del estudio: elegir con qué estructura empezar. Cada opción
  deja el cuerpo del editor ya escrito y el docente lo reemplaza a voluntad.
*/
// Implements: REQ-PUB-10
function PresetStage({
  courseName,
  onChoose,
  onClose,
}: {
  courseName: string;
  onChoose: (value: PublicationContentType) => void;
  onClose: () => void;
}) {
  return (
    <section aria-labelledby="publish-preset-title" className="publish-preset-stage">
      <button className="publish-back" data-hardware-back="publish" onClick={onClose} type="button">
        <ArrowLeft aria-hidden="true" size={16} weight="bold" />
        Volver al ramo
      </button>
      <h1 id="publish-preset-title">¿Qué vas a publicar en {courseName}?</h1>
      <p className="publish-preset-lead">
        Cada opción abre el editor con una estructura ya escrita. Puedes cambiarla entera una vez
        dentro.
      </p>
      <div className="publish-preset-grid">
        {CONTENT_TYPES.map((option) => {
          const OptionIcon = CONTENT_ICONS[option.value];
          return (
            <button
              className="publish-preset"
              key={option.value}
              onClick={() => onChoose(option.value)}
              type="button"
            >
              <span className="publish-preset-icon">
                <OptionIcon aria-hidden="true" size={22} />
              </span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* Adjuntos del inspector: zona de arrastre, lista y retiro. */
// Implements: REQ-PUB-09
function AttachmentField({
  attachments,
  error,
  fileRef,
  onAttach,
  onRemove,
  uploading,
}: {
  attachments: ClassroomAttachment[];
  error: string;
  fileRef: RefObject<HTMLInputElement | null>;
  onAttach: (files: FileList | null) => void;
  onRemove: (storagePath: string) => void;
  uploading: string;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <section>
      <h2>
        <Paperclip aria-hidden="true" size={17} />
        Adjuntos
      </h2>
      <div
        className={`publish-dropzone${dragging ? " is-dragging" : ""}`}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDrop={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setDragging(false);
          onAttach(event.dataTransfer.files);
        }}
      >
        <p>Arrastra archivos o</p>
        <button
          className="publish-attach-btn"
          onClick={() => fileRef.current?.click()}
          type="button"
        >
          Seleccionar del equipo
        </button>
        <small>PDF, PPT, DOCX, XLSX, ZIP o imagen. Hasta 50 MB cada uno.</small>
        {/* El botón de arriba es el control real; el campo queda fuera del
            orden de tabulación para no ofrecer una parada muda. */}
        <input
          accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.zip,image/*"
          aria-hidden="true"
          className="sr-only"
          multiple
          onChange={(event) => onAttach(event.target.files)}
          ref={fileRef}
          tabIndex={-1}
          type="file"
        />
      </div>
      {uploading && (
        <p className="tool-status info" role="status">
          {uploading}
        </p>
      )}
      {error && (
        <p className="tool-status bad" role="alert">
          {error}
        </p>
      )}
      {attachments.length > 0 && (
        <ul className="publish-attachments">
          {attachments.map((attachment) => (
            <li key={attachment.storagePath}>
              <Paperclip aria-hidden="true" size={15} />
              <span>
                <strong>{attachment.name}</strong>
                <small className="num">{formatBytes(attachment.size)}</small>
              </span>
              <button
                aria-label={`Quitar ${attachment.name}`}
                onClick={() => onRemove(attachment.storagePath)}
                type="button"
              >
                <Trash aria-hidden="true" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Implements: REQ-PUB-01 REQ-PUB-06 REQ-PUB-08 REQ-PUB-09 REQ-PUB-10 REQ-PUB-11 REQ-PUB-12
export function PublishView({
  course,
  folders,
  onClose,
  publish,
  status,
}: {
  course: Course;
  folders: string[];
  onClose: () => void;
  publish: (
    event: FormEvent<HTMLFormElement>,
    attachments: ClassroomAttachment[]
  ) => Promise<boolean>;
  status: Note;
}) {
  const defaultFolder = folders[0] ?? "";

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
  const [folder, setFolder] = useState(restoredDraft?.folder || defaultFolder);
  const [dueDate, setDueDate] = useState(restoredDraft?.dueDate ?? "");
  const [linkUrl, setLinkUrl] = useState(restoredDraft?.linkUrl ?? "");
  const [notificationMode, setNotificationMode] = useState<NotificationMode>(
    restoredDraft?.notificationMode ?? "push"
  );
  const [attachments, setAttachments] = useState<ClassroomAttachment[]>([]);
  const [uploading, setUploading] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [savedLabel, setSavedLabel] = useState(() => savedTimeLabel(restoredDraft?.savedAt ?? ""));
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (contentType !== null) titleRef.current?.focus();
  }, [contentType]);

  // Implements: REQ-PUB-11
  useEffect(() => {
    if (contentType === null) return;
    const timer = window.setTimeout(() => {
      const stamp = new Date().toISOString();
      const stored = persistPublicationDraft(browserStorage(), course.id, {
        contentType,
        editorMode,
        notificationMode,
        title,
        body,
        folder,
        dueDate,
        linkUrl,
        savedAt: stamp,
      });
      if (stored && (title.trim() || body.trim())) setSavedLabel(savedTimeLabel(stamp));
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [body, contentType, course.id, dueDate, editorMode, folder, linkUrl, notificationMode, title]);

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

  // Implements: REQ-PUB-09
  const attachFiles = async (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    setAttachmentError("");
    const room = MAX_POST_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      setAttachmentError(`Una publicación admite hasta ${MAX_POST_ATTACHMENTS} archivos.`);
      return;
    }
    /* Secuencial a propósito: en el wifi de una sala seis subidas en paralelo
       se pelean el ancho de banda y el docente pierde de vista cuál va. Si
       alguna vez importa la latencia, el salto es `Promise.all` con una barra
       de progreso por archivo. */
    for (const file of Array.from(incoming).slice(0, room)) {
      setUploading(`Subiendo ${file.name}…`);
      try {
        const attachment = await uploadPostAttachment(course.id, file, (percent) =>
          setUploading(`Subiendo ${file.name}… ${percent}%`)
        );
        setAttachments((current) => [...current, attachment]);
      } catch (cause) {
        setAttachmentError(
          cause instanceof Error ? cause.message : `No fue posible subir ${file.name}.`
        );
      }
    }
    setUploading("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeAttachment = (storagePath: string) =>
    setAttachments((current) => current.filter((item) => item.storagePath !== storagePath));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

  return (
    <form
      className="publish-studio"
      data-requirement="Implements: REQ-PUB-01 REQ-PUB-06 REQ-PUB-08 REQ-PUB-09 REQ-PUB-10 REQ-PUB-11"
      onSubmit={submit}
    >
      <input
        name="kind"
        type="hidden"
        value={
          createPublicationDraft({
            contentType,
            editorMode,
            folder,
            notificationMode,
          }).kind
        }
      />
      <input name="editorMode" type="hidden" value={editorMode} />

      <header className="publish-bar">
        <button
          className="publish-back"
          data-hardware-back="publish"
          onClick={discard}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={16} weight="bold" />
          Volver al ramo
        </button>
        <p className="publish-bar-context">
          <span>{course.name}</span>
          <small>{CONTENT_TYPES.find((option) => option.value === contentType)?.label}</small>
        </p>
        <p aria-live="polite" className="publish-autosave">
          {savedLabel ? (
            <>
              <CloudCheck aria-hidden="true" size={16} weight="fill" />
              Borrador guardado <span className="num">{savedLabel}</span>
            </>
          ) : (
            <>
              <PencilSimpleLine aria-hidden="true" size={16} />
              Sin cambios sin guardar
            </>
          )}
        </p>
        <button className="publish-submit" disabled={saving} type="submit">
          {saving ? "Publicando…" : "Publicar en el aula"}
        </button>
      </header>

      {restoredDraft !== null && (
        <p className="publish-restored" role="status">
          <CheckCircle aria-hidden="true" size={16} weight="fill" />
          Recuperamos el borrador que dejaste sin publicar en este ramo.
        </p>
      )}

      <div className="publish-body">
        <div className="publish-canvas">
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
            {stats.words.toLocaleString("es-CL")} palabras · cerca de {stats.minutes} min de lectura
          </p>
        </div>

        <aside aria-label="Detalles de la publicación" className="publish-inspector">
          <section>
            <h2>
              <FolderOpen aria-hidden="true" size={17} />
              Destino
            </h2>
            <label>
              Carpeta del ramo
              <select
                name="folder"
                onChange={(event) => setFolder(event.target.value)}
                value={folder}
              >
                {folders.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fecha de entrega opcional
              <input
                className="num"
                name="dueDate"
                onChange={(event) => setDueDate(event.target.value)}
                type="datetime-local"
                value={dueDate}
              />
            </label>
          </section>

          <section>
            <h2>
              <LinkSimple aria-hidden="true" size={17} />
              Enlace externo
            </h2>
            <label>
              Drive, video o sitio del recurso
              <input
                name="linkUrl"
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://…"
                type="url"
                value={linkUrl}
              />
            </label>
          </section>

          <AttachmentField
            attachments={attachments}
            error={attachmentError}
            fileRef={fileRef}
            onAttach={(files) => void attachFiles(files)}
            onRemove={removeAttachment}
            uploading={uploading}
          />

          <fieldset className="publish-alerts">
            <legend>Alertas al curso</legend>
            {NOTIFICATION_MODES.map((option) => (
              <label key={option.value}>
                <input
                  checked={notificationMode === option.value}
                  name="notificationMode"
                  onChange={() => setNotificationMode(option.value)}
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
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </fieldset>

          {status.text && (
            <p className={`tool-status ${status.tone}`} role="status">
              {status.text}
            </p>
          )}
        </aside>
      </div>
    </form>
  );
}

export default PublishView;
