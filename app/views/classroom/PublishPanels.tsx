"use client";

// Implements: REQ-PUB-09, REQ-PUB-10, REQ-QMD-07
import { useRef, useState, type DragEvent, type RefObject } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  ClipboardText,
  FileDoc,
  File as FileIcon,
  FilePdf,
  FilePpt,
  FileXls,
  FileZip,
  FolderSimple,
  ImageSquare,
  Megaphone,
  Trash,
  XCircle,
  type Icon,
} from "@phosphor-icons/react";
import {
  MAX_POST_ATTACHMENTS,
  uploadPostAttachment,
  type ClassroomAttachment,
} from "../../../lib/firebase-classroom-client";
import { formatBytes } from "../../../lib/portal-utils";
import { CONTENT_TYPES, type PublicationContentType } from "../../../lib/publication-workflow";

const CONTENT_ICONS: Record<PublicationContentType, Icon> = {
  notice: Megaphone,
  assessment: ClipboardText,
  guide: BookOpen,
  blank: FileIcon,
};

function attachmentIcon(contentType: string): Icon {
  if (contentType.startsWith("image/")) return ImageSquare;
  if (contentType.includes("pdf")) return FilePdf;
  if (contentType.includes("zip") || contentType.includes("compressed")) return FileZip;
  if (contentType.includes("presentation") || contentType.includes("powerpoint")) return FilePpt;
  if (contentType.includes("sheet") || contentType.includes("excel")) return FileXls;
  if (contentType.includes("word") || contentType.includes("document")) return FileDoc;
  return FileIcon;
}

// Implements: REQ-PUB-10
export function PresetStage({
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
        {CONTENT_TYPES.map((option, index) => {
          const OptionIcon = CONTENT_ICONS[option.value];
          return (
            <button
              className="publish-preset"
              key={option.value}
              onClick={() => onChoose(option.value)}
              style={{ animationDelay: `${index * 35}ms` }}
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

// Implements: REQ-PUB-09
export function usePostAttachments(courseId: string) {
  const [attachments, setAttachments] = useState<ClassroomAttachment[]>([]);
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

  const removeAttachment = (storagePath: string) =>
    setAttachments((current) => current.filter((item) => item.storagePath !== storagePath));

  return {
    attachments,
    uploading,
    attachmentError,
    fileRef,
    attachFiles,
    removeAttachment,
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
          accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.zip,image/*"
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
            const AttachmentIcon = attachmentIcon(attachment.contentType);
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
