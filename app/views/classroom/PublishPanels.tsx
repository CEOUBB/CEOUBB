"use client";

// Implements: REQ-PUB-09, REQ-QMD-07
import { useEffect, useRef, useState, type DragEvent, type RefObject } from "react";
import { CheckCircle, FolderSimple, Trash, X, XCircle } from "@phosphor-icons/react";
import {
  MAX_POST_ATTACHMENTS,
  releaseUploadedFiles,
  uploadPostAttachment,
  type ClassroomAttachment,
} from "../../../lib/firebase-classroom-client";
import { formatBytes } from "../../../lib/portal-utils";
import { fileIcon } from "./CoursePageItems";

// Implements: REQ-PUB-09
export function usePostAttachments(courseId: string, initial: ClassroomAttachment[] = []) {
  const [original] = useState(() => new Set(initial.map((attachment) => attachment.storagePath)));
  const [attachments, setAttachments] = useState<ClassroomAttachment[]>(initial);
  const [uploading, setUploading] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const attachFiles = async (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    setAttachmentError("");
    const room = MAX_POST_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      setAttachmentError(`Una publicación admite hasta ${MAX_POST_ATTACHMENTS} archivos.`);
      return;
    }
    const chosen = Array.from(incoming);
    if (chosen.length > room) {
      setAttachmentError(
        `Quedaba espacio para ${room} archivo${room === 1 ? "" : "s"}. Se subieron los primeros y el resto no se adjuntó.`
      );
    }
    const toUpload = chosen.slice(0, room);
    const uploadNext = async (index: number): Promise<void> => {
      if (index >= toUpload.length) return;
      const file = toUpload[index];
      setUploading(`Subiendo ${file.name}…`);
      try {
        const attachment = await uploadPostAttachment(courseId, file, (percent) =>
          setUploading(`Subiendo ${file.name}… ${percent}%`)
        );
        setAttachments((current) => [...current, attachment]);
      } catch {
        setAttachmentError(
          `No fue posible subir ${file.name}. Revisa el tamaño y vuelve a intentarlo.`
        );
      }
      await uploadNext(index + 1);
    };
    await uploadNext(0);
    setUploading("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeAttachment = (storagePath: string) => {
    setAttachments((current) => current.filter((item) => item.storagePath !== storagePath));
    if (!original.has(storagePath))
      void releaseUploadedFiles(courseId, [storagePath]).catch(() => undefined);
  };

  // Implements: REQ-PAGE-06
  const releaseSessionUploads = () =>
    releaseUploadedFiles(
      courseId,
      attachments.map((attachment) => attachment.storagePath).filter((path) => !original.has(path))
    ).catch(() => undefined);

  return {
    attachments,
    uploading,
    attachmentError,
    fileRef,
    attachFiles,
    removeAttachment,
    releaseSessionUploads,
  };
}

// Implements: REQ-PUB-09
export function AttachmentField({
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
  const full = attachments.length >= MAX_POST_ATTACHMENTS;

  return (
    <section>
      <h2>
        <FolderSimple aria-hidden="true" size={17} />
        Adjuntos
        <small className="num">
          {attachments.length} de {MAX_POST_ATTACHMENTS}
        </small>
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
          disabled={full}
          onClick={() => fileRef.current?.click()}
          type="button"
        >
          Seleccionar del equipo
        </button>
        <small>PDF, PPT, DOCX, XLSX, ZIP o imagen. Hasta 50 MB cada uno.</small>
        <input
          accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv,image/png,image/jpeg,image/webp"
          aria-hidden="true"
          aria-label="Adjuntar archivos"
          className="sr-only"
          disabled={full}
          multiple
          onChange={(event) => {
            onAttach(event.target.files);
            event.target.value = "";
          }}
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
          {attachments.map((attachment) => {
            const AttachmentIcon = fileIcon(attachment.contentType, attachment.name);
            return (
              <li key={attachment.storagePath}>
                <AttachmentIcon aria-hidden="true" size={16} />
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
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function PublishRestoredNotice({ onDismiss }: { onDismiss: () => void }) {
  return (
    <p className="publish-restored" role="status">
      <CheckCircle aria-hidden="true" size={16} weight="fill" />
      Recuperamos el borrador que dejaste sin publicar en este ramo.
      <button
        aria-label="Ocultar el aviso del borrador recuperado"
        onClick={onDismiss}
        type="button"
      >
        <XCircle aria-hidden="true" size={17} />
      </button>
    </p>
  );
}

export function PublishConfirmDialog({
  title,
  message,
  note,
  confirmLabel,
  cancelLabel = "Cancelar",
  isDestructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: React.ReactNode;
  note?: string;
  confirmLabel: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
      cancelRef.current?.focus();
    }
  }, []);

  return (
    <dialog
      aria-labelledby="publish-dialog-title"
      className="planner-dialog publication-confirm-dialog"
      onCancel={onCancel}
      onClose={onCancel}
      ref={dialogRef}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <header>
          <h2 id="publish-dialog-title">{title}</h2>
          <button aria-label="Cerrar" onClick={onCancel} type="button">
            <X aria-hidden="true" size={16} weight="bold" />
          </button>
        </header>
        <div className="confirmation-message">{message}</div>
        {note && <p className="confirmation-note">{note}</p>}
        <footer>
          <button
            ref={cancelRef}
            className="planner-dialog-cancel"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={isDestructive ? "confirmation-danger" : "planner-dialog-save"}
            disabled={busy}
            type="submit"
          >
            {confirmLabel}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
