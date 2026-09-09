"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowClockwise,
  CheckCircle,
  CircleNotch,
  File,
  FileArchive,
  FileDoc,
  FilePdf,
  Paperclip,
  Trash,
  UploadSimple,
  UsersThree,
  WarningCircle,
  type IconProps,
} from "@phosphor-icons/react";
import {
  MAX_SUBMISSION_BYTES,
  StudentSubmission,
  SubmissionTeam,
  uploadStudentSubmission,
  watchOwnSubmissions,
} from "../../../lib/firebase-classroom-client";
import { submissionModeOf, type GradeItem } from "../../../lib/grades";
import { formatBytes, formatDay } from "../../../lib/portal-utils";
import { EASE_OUT } from "../../../lib/ease";
import type { Note } from "./classroom-utils";

/*
  Buzón de entregas del estudiante basado en FileUpload de beUI.
  Vive dentro de la fila de la evaluación o en la hoja móvil y soporta
  drag-and-drop con estado `data-dragging`, progreso animado, chips
  con reintento/eliminación y trazabilidad con Firebase Storage.
*/

export type FileUploadStatus = "queued" | "uploading" | "success" | "error";
export type FileUploadVariant = "default" | "centered" | "compact";

export type FileUploadItem = {
  id: string;
  name: string;
  size: number;
  type?: string;
  progress?: number;
  status?: FileUploadStatus;
  error?: string;
  file?: File;
  sha256?: string;
};

export type FileUploadClassNames = {
  root?: string;
  dropzone?: string;
  queue?: string;
  item?: string;
  leading?: string;
  content?: string;
  name?: string;
  meta?: string;
  progress?: string;
  action?: string;
};

export interface FileUploadProps {
  value?: FileUploadItem[];
  defaultValue?: FileUploadItem[];
  onValueChange?: (items: FileUploadItem[]) => void;
  onFilesAdded?: (items: FileUploadItem[], files: File[]) => void;
  onRemove?: (item: FileUploadItem) => void;
  onRetry?: (item: FileUploadItem) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
  variant?: FileUploadVariant;
  title?: string;
  description?: string;
  browseLabel?: string;
  className?: string;
  classNames?: FileUploadClassNames;
}

const ROW_TRANSITION = { duration: 0.22, ease: EASE_OUT } as const;
const FAST_TRANSITION = { duration: 0.16, ease: EASE_OUT } as const;

const ALLOWED_SUBMISSION_EXTENSIONS = ["pdf", "zip", "docx"] as const;
const ALLOWED_SUBMISSION_ACCEPT =
  ".pdf,.zip,.docx,application/pdf,application/zip,application/x-zip-compressed,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword";

function isAllowedSubmissionFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (
    ext &&
    ALLOWED_SUBMISSION_EXTENSIONS.includes(ext as (typeof ALLOWED_SUBMISSION_EXTENSIONS)[number])
  ) {
    return true;
  }
  const type = (file.type || "").toLowerCase();
  return (
    type === "application/pdf" ||
    type === "application/zip" ||
    type === "application/x-zip-compressed" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    type === "application/msword"
  );
}

function renderFileIcon(fileName: string, type: string | undefined, props: IconProps) {
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : undefined;
  const mime = type?.toLowerCase() ?? "";

  if (extension === "pdf" || mime.includes("pdf")) {
    return <FilePdf {...props} />;
  }
  if (
    extension === "zip" ||
    extension === "rar" ||
    extension === "7z" ||
    mime.includes("zip") ||
    mime.includes("compressed")
  ) {
    return <FileArchive {...props} />;
  }
  if (
    extension === "doc" ||
    extension === "docx" ||
    mime.includes("word") ||
    mime.includes("officedocument")
  ) {
    return <FileDoc {...props} />;
  }
  return <File {...props} />;
}

function createFileUploadItem(file: File, index = 0): FileUploadItem {
  return {
    id: `${Date.now()}-${index}-${file.name}`,
    name: file.name,
    size: file.size,
    type: file.type,
    progress: 0,
    status: "uploading",
    file,
  };
}

function StatusIcon({ status, reduce }: { status: FileUploadStatus; reduce: boolean }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={status}
        initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(4px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(-4px)" }}
        transition={FAST_TRANSITION}
        className="grid h-6 w-6 place-items-center"
      >
        {status === "success" ? (
          <CheckCircle className="h-4 w-4 text-[oklch(0.7_0.17_155)]" weight="fill" />
        ) : status === "error" ? (
          <WarningCircle className="h-4 w-4 text-[oklch(0.55_0.22_25)]" weight="fill" />
        ) : status === "uploading" ? (
          <CircleNotch
            className={`h-4 w-4 text-[oklch(0.48_0.18_255)] ${reduce ? "" : "animate-spin"}`}
            weight="bold"
          />
        ) : (
          <File className="h-4 w-4 text-[oklch(0.48_0.03_250)]" />
        )}
        <span className="sr-only">
          {status === "success"
            ? "Completado"
            : status === "error"
              ? "Error"
              : status === "uploading"
                ? "Subiendo"
                : "En cola"}
        </span>
      </motion.span>
    </AnimatePresence>
  );
}

function FileUploadRow({
  item,
  onRemove,
  onRetry,
  classNames,
}: {
  item: FileUploadItem;
  onRemove: (item: FileUploadItem) => void;
  onRetry: (item: FileUploadItem) => void;
  classNames?: FileUploadClassNames;
}) {
  const reduce = useReducedMotion() ?? false;
  const status = item.status ?? "queued";
  const progress = Math.max(0, Math.min(100, item.progress ?? 0));
  const progressRatio = progress / 100;
  const showProgress = status === "uploading" || status === "success";

  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(-6px)" }}
      transition={ROW_TRANSITION}
      className={`relative overflow-hidden rounded-xl border border-[oklch(0.9_0.012_250)] bg-white p-3 shadow-sm ${classNames?.item ?? ""}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[oklch(0.975_0.005_240)] text-[oklch(0.48_0.18_255)] ${classNames?.leading ?? ""}`}
        >
          {renderFileIcon(item.name, item.type, {
            className: "h-5 w-5",
            weight: "duotone",
            "aria-hidden": true,
          })}
        </div>

        <div className={`min-w-0 flex-1 ${classNames?.content ?? ""}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={`truncate text-sm font-medium text-[oklch(0.2_0.03_260)] ${classNames?.name ?? ""}`}
              >
                {item.name}
              </p>
              <p
                className={`mt-0.5 text-xs text-[oklch(0.48_0.03_250)] num ${classNames?.meta ?? ""}`}
              >
                {formatBytes(item.size)}
                {item.sha256 && ` · SHA-256: ${item.sha256.slice(0, 12)}`}
                {status === "error" && item.error ? ` · ${item.error}` : null}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <StatusIcon status={status} reduce={reduce} />
              {status === "error" ? (
                <button
                  type="button"
                  onClick={() => onRetry(item)}
                  aria-label={`Reintentar ${item.name}`}
                  className="grid h-7 w-7 place-items-center rounded-full text-[oklch(0.48_0.03_250)] transition-colors hover:bg-[oklch(0.975_0.005_240)] hover:text-[oklch(0.2_0.03_260)] active:scale-95"
                >
                  <ArrowClockwise className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onRemove(item)}
                aria-label={`Eliminar ${item.name}`}
                className="grid h-7 w-7 place-items-center rounded-full text-[oklch(0.48_0.03_250)] transition-colors hover:bg-[oklch(0.975_0.005_240)] hover:text-[oklch(0.55_0.22_25)] active:scale-95"
              >
                <Trash className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {showProgress ? (
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              aria-label={`Progreso de ${item.name}`}
              className={`mt-2 h-1.5 overflow-hidden rounded-full bg-[oklch(0.975_0.005_240)] ${classNames?.progress ?? ""}`}
            >
              <motion.div
                className={`h-full rounded-full ${
                  status === "success" ? "bg-[oklch(0.7_0.17_155)]" : "bg-[oklch(0.48_0.18_255)]"
                }`}
                style={{
                  transformOrigin: "left",
                  transform: reduce ? `scaleX(${progressRatio})` : undefined,
                }}
                initial={false}
                animate={reduce ? undefined : { transform: `scaleX(${progressRatio})` }}
                transition={{ duration: 0.28, ease: EASE_OUT }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </motion.li>
  );
}

export function FileUpload({
  value,
  defaultValue,
  onValueChange,
  onFilesAdded,
  onRemove,
  onRetry,
  accept = ALLOWED_SUBMISSION_ACCEPT,
  multiple = false,
  maxFiles = 1,
  disabled = false,
  variant = "default",
  title = "Arrastra tu entrega aquí o examina",
  description = "Archivos permitidos: PDF, ZIP o DOCX (máximo 25 MB)",
  browseLabel = "Examinar archivo",
  className = "",
  classNames,
}: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const reduce = useReducedMotion() ?? false;
  const [internalValue, setInternalValue] = useState<FileUploadItem[]>(defaultValue ?? []);
  const isControlled = value !== undefined;
  const items = value ?? internalValue;

  const setItems = useCallback(
    (next: FileUploadItem[]) => {
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange]
  );

  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (incomingFiles: File[]) => {
      if (disabled || incomingFiles.length === 0) return;

      const validFiles = incomingFiles.filter(isAllowedSubmissionFile);
      if (validFiles.length === 0) return;

      const remainingSlots = maxFiles === undefined ? validFiles.length : maxFiles - items.length;
      if (remainingSlots <= 0) return;

      const files = validFiles.slice(0, multiple ? remainingSlots : Math.min(1, remainingSlots));
      const added = files.map((file, index) => createFileUploadItem(file, index));
      if (added.length === 0) return;

      setItems([...items, ...added]);
      onFilesAdded?.(added, files);
    },
    [disabled, items, maxFiles, multiple, onFilesAdded, setItems]
  );

  const removeItem = useCallback(
    (item: FileUploadItem) => {
      setItems(items.filter((entry) => entry.id !== item.id));
      onRemove?.(item);
    },
    [items, onRemove, setItems]
  );

  const retryItem = useCallback(
    (item: FileUploadItem) => {
      const retryingItem: FileUploadItem = {
        ...item,
        error: undefined,
        progress: 0,
        status: "uploading",
      };
      setItems(items.map((entry) => (entry.id === item.id ? retryingItem : entry)));
      onRetry?.(retryingItem);
    },
    [items, onRetry, setItems]
  );

  const maxReached = maxFiles !== undefined && items.length >= maxFiles;
  const centered = variant === "centered";

  return (
    <div className={`w-full space-y-3 ${className} ${classNames?.root ?? ""}`}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        aria-label="Cargar archivos de entrega"
        accept={accept}
        multiple={multiple}
        disabled={disabled || maxReached}
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => {
          addFiles(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = "";
        }}
      />

      <button
        type="button"
        disabled={disabled || maxReached}
        data-dragging={dragging}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          if (disabled || maxReached) return;
          event.preventDefault();
          dragDepthRef.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (disabled || maxReached) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (disabled || maxReached) return;
          event.preventDefault();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          if (disabled || maxReached) return;
          event.preventDefault();
          dragDepthRef.current = 0;
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files));
        }}
        className={`group relative flex w-full overflow-hidden rounded-2xl border border-dashed border-[oklch(0.9_0.012_250)] bg-white outline-none transition-[border-color,background-color,transform] duration-150 active:scale-[0.99] hover:border-[oklch(0.48_0.18_255)] hover:bg-[oklch(0.975_0.005_240)] focus-visible:ring-2 focus-visible:ring-[oklch(0.48_0.18_255)] data-[dragging=true]:border-[oklch(0.48_0.18_255)] data-[dragging=true]:bg-[rgba(0,85,184,0.07)] disabled:pointer-events-none disabled:opacity-55 ${
          centered
            ? "min-h-44 flex-col items-center justify-center gap-3 p-6 text-center"
            : "items-center gap-3.5 p-4 text-left"
        } ${classNames?.dropzone ?? ""}`}
      >
        <motion.span
          aria-hidden="true"
          className={`grid shrink-0 place-items-center bg-[oklch(0.975_0.005_240)] text-[oklch(0.48_0.18_255)] ${
            centered
              ? "h-14 w-14 rounded-2xl border border-[oklch(0.9_0.012_250)]"
              : "h-11 w-11 rounded-xl"
          }`}
          animate={
            reduce
              ? undefined
              : {
                  transform: dragging ? "translateY(-2px)" : "translateY(0px)",
                }
          }
          transition={FAST_TRANSITION}
        >
          <UploadSimple className={centered ? "h-6 w-6" : "h-5 w-5"} weight="bold" />
        </motion.span>

        <span className={`min-w-0 ${centered ? "max-w-xs" : "flex-1"}`}>
          <span
            className={`block font-semibold text-[oklch(0.2_0.03_260)] ${
              centered ? "text-base" : "text-sm"
            }`}
          >
            {maxReached ? "Límite de entrega alcanzado" : title}
          </span>
          <span
            className={`block text-xs text-[oklch(0.48_0.03_250)] ${
              centered ? "mt-1 leading-5" : "mt-0.5"
            }`}
          >
            {maxReached ? `${items.length} de ${maxFiles} archivos listos` : description}
          </span>
        </span>

        <span
          className={`shrink-0 rounded-lg border border-[oklch(0.9_0.012_250)] bg-white text-xs font-semibold text-[oklch(0.2_0.03_260)] transition-colors group-hover:bg-[oklch(0.975_0.005_240)] ${
            centered ? "mt-1 px-4 py-2" : "px-3 py-1.5"
          }`}
        >
          {browseLabel}
        </span>
      </button>

      <ul className={`space-y-2 ${classNames?.queue ?? ""}`}>
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <FileUploadRow
              key={item.id}
              item={item}
              onRemove={removeItem}
              onRetry={retryItem}
              classNames={classNames}
            />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

// Implements: REQ-EVAL-01
export function useOwnSubmissions(courseId: string) {
  const [state, setState] = useState<{ courseId: string; items: StudentSubmission[] }>({
    courseId,
    items: [],
  });
  useEffect(
    () =>
      watchOwnSubmissions(
        courseId,
        (items) => setState({ courseId, items }),
        () => setState({ courseId, items: [] })
      ),
    [courseId]
  );
  return useMemo(() => {
    const rows = state.courseId === courseId ? state.items : [];
    return new Map(rows.map((item) => [item.evalId, item]));
  }, [courseId, state]);
}

// Implements: REQ-EVAL-01, REQ-TEAM-01, REQ-TEAM-02
export function useSubmissionUpload(
  courseId: string,
  note: (text: string, tone?: Note["tone"]) => void,
  enabled: boolean
) {
  const input = useRef<HTMLInputElement | null>(null);
  const pending = useRef<{ evalId: string; team?: SubmissionTeam } | null>(null);
  const [state, setState] = useState<{
    evalId: string;
    percent: number;
    status: FileUploadStatus;
    fileName?: string;
    error?: string;
  } | null>(null);

  const uploadFile = useCallback(
    async (evalId: string, file: File, team?: SubmissionTeam) => {
      if (!enabled) {
        note("Este ramo está archivado y no recibe nuevas entregas.", "bad");
        return;
      }
      if (!isAllowedSubmissionFile(file)) {
        note("Formato no permitido. Solo se aceptan archivos PDF, ZIP o DOCX.", "bad");
        return;
      }
      if (file.size <= 0 || file.size > MAX_SUBMISSION_BYTES) {
        note(`La entrega debe pesar entre 1 byte y ${formatBytes(MAX_SUBMISSION_BYTES)}.`, "bad");
        return;
      }

      setState({ evalId, percent: 0, status: "uploading", fileName: file.name });
      try {
        await uploadStudentSubmission(
          courseId,
          evalId,
          file,
          (percent) => setState({ evalId, percent, status: "uploading", fileName: file.name }),
          team
        );
        setState({ evalId, percent: 100, status: "success", fileName: file.name });
        note(
          team
            ? `Entrega recibida y registrada para los ${team.memberIds.length} integrantes del equipo.`
            : "Entrega recibida. El comprobante queda en la evaluación.",
          "ok"
        );
      } catch (cause) {
        const errorMsg = cause instanceof Error ? cause.message : "No se pudo enviar la entrega.";
        setState({ evalId, percent: 0, status: "error", fileName: file.name, error: errorMsg });
        note(errorMsg, "bad");
      }
    },
    [courseId, enabled, note]
  );

  const pick = useCallback(
    (evalId: string, team?: SubmissionTeam) => {
      if (!enabled) return note("Este ramo está archivado y no recibe nuevas entregas.", "bad");
      pending.current = { evalId, team };
      input.current?.click();
    },
    [enabled, note]
  );

  const send = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      const target = pending.current;
      event.target.value = "";
      pending.current = null;
      if (!file || !target) return;
      await uploadFile(target.evalId, file, target.team);
    },
    [uploadFile]
  );

  const field = (
    <input
      accept={ALLOWED_SUBMISSION_ACCEPT}
      aria-hidden="true"
      className="sr-only"
      onChange={send}
      ref={input}
      tabIndex={-1}
      type="file"
    />
  );

  return { field, pick, state, uploadFile };
}

/*
  Comprobante de una entrega ya recibida. La huella acorta a doce caracteres
  porque nadie lee sesenta y cuatro de un vistazo: sirve para comparar dos
  comprobantes, y el valor completo queda en el título para copiarlo.
*/
// Implements: REQ-TEAM-03, REQ-TEAM-04
function SubmissionReceiptDetails({ receipt }: { receipt: StudentSubmission }) {
  const isTeam = receipt.memberIds.length > 1;
  const uploader = receipt.submittedByName?.trim() ?? "";
  if (!isTeam && !receipt.sha256) return null;
  return (
    <small className="grades-receipt-trace text-xs text-[oklch(0.48_0.03_250)] mt-0.5">
      {isTeam && (
        <span>
          Equipo de <span className="num">{receipt.memberIds.length}</span>
          {uploader ? ` · entregó ${uploader}` : ""}
        </span>
      )}
      {receipt.sha256 && (
        <code
          className="num font-mono text-[11px] bg-[oklch(0.975_0.005_240)] px-1 py-0.5 rounded border border-[oklch(0.9_0.012_250)]"
          title={`SHA-256: ${receipt.sha256}`}
        >
          {receipt.sha256.slice(0, 12)}
        </code>
      )}
    </small>
  );
}

// Implements: REQ-EVAL-01, REQ-TEAM-01, REQ-TEAM-03, REQ-TEAM-04
export function SubmissionSlot({
  item,
  receipt,
  percent,
  onPick,
  readOnly,
  onDropFile,
}: {
  item: GradeItem;
  receipt: StudentSubmission | undefined;
  percent: number | null;
  onPick: (item: GradeItem) => void;
  readOnly: boolean;
  onDropFile?: (file: File, item: GradeItem) => void;
}) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const mode = submissionModeOf(item);
  const teamLabel = mode === "individual" ? "" : "en equipo";
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (event: React.DragEvent) => {
    if (readOnly) return;
    event.preventDefault();
    dragCounter.current += 1;
    setDragging(true);
  };

  const handleDragOver = (event: React.DragEvent) => {
    if (readOnly) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    if (readOnly) return;
    event.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    if (readOnly) return;
    event.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      if (onDropFile) {
        onDropFile(file, item);
      } else {
        onPick(item);
      }
    }
  };

  if (percent !== null) {
    const progressRatio = Math.max(0, Math.min(100, percent)) / 100;
    return (
      <div
        className="grades-upload flex flex-col gap-1 w-full max-w-[200px]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`Subiendo entrega ${percent}%`}
      >
        <div className="grades-upload-track h-2 w-full overflow-hidden rounded-full bg-[oklch(0.975_0.005_240)] border border-[oklch(0.9_0.012_250)]">
          <motion.div
            className="grades-upload-fill h-full rounded-full bg-[oklch(0.48_0.18_255)]"
            style={{
              transformOrigin: "left",
              transform: shouldReduceMotion ? `scaleX(${progressRatio})` : undefined,
            }}
            initial={false}
            animate={shouldReduceMotion ? undefined : { transform: `scaleX(${progressRatio})` }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-[oklch(0.48_0.03_250)]">
          <span className="flex items-center gap-1">
            <CircleNotch
              className="h-3 w-3 animate-spin text-[oklch(0.48_0.18_255)]"
              weight="bold"
            />
            <span>Subiendo</span>
          </span>
          <span className="num font-semibold text-[oklch(0.2_0.03_260)]">{percent}%</span>
        </div>
      </div>
    );
  }

  if (receipt) {
    return (
      <div className="grades-receipt flex flex-col gap-1 text-left min-w-0">
        <span className="receipt-confirmed-badge">
          <CheckCircle aria-hidden="true" size={16} weight="fill" />
          <span>Entrega recibida</span>
        </span>
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-[oklch(0.2_0.03_260)] max-w-full truncate">
          {renderFileIcon(receipt.fileName, receipt.contentType, {
            className: "h-4 w-4 shrink-0 text-[oklch(0.48_0.18_255)]",
            weight: "duotone",
            "aria-hidden": true,
          })}
          <span className="truncate" title={receipt.fileName}>
            {receipt.fileName}
          </span>
        </div>
        <small className="num text-xs text-[oklch(0.48_0.03_250)]">
          {formatBytes(receipt.size)} · {formatDay(receipt.createdAt.slice(0, 10))}
        </small>
        <SubmissionReceiptDetails receipt={receipt} />
        {!readOnly && (
          <button
            aria-label={`Reemplazar la entrega ${teamLabel} de ${item.name}`.replace("  ", " ")}
            className="grades-attach mt-1 inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.48_0.18_255)] hover:underline"
            onClick={() => onPick(item)}
            type="button"
          >
            <ArrowClockwise className="h-3.5 w-3.5" />
            Reemplazar
          </button>
        )}
      </div>
    );
  }

  if (readOnly)
    return (
      <span className="grades-closed text-xs text-[oklch(0.48_0.03_250)]">Sin nuevas entregas</span>
    );

  return (
    <button
      aria-label={`Adjuntar la entrega ${teamLabel} de ${item.name}`.replace("  ", " ")}
      className="grades-attach group relative inline-flex items-center gap-1.5 rounded-lg border border-[oklch(0.9_0.012_250)] bg-white px-3 py-1.5 text-xs font-medium text-[oklch(0.2_0.03_260)] transition-[color,background-color,border-color,transform] duration-150 hover:border-[oklch(0.48_0.18_255)] hover:bg-[oklch(0.975_0.005_240)] active:scale-95 data-[dragging=true]:border-[oklch(0.48_0.18_255)] data-[dragging=true]:bg-[rgba(0,85,184,0.07)]"
      data-dragging={dragging}
      onClick={() => onPick(item)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      type="button"
    >
      {dragging ? (
        <UploadSimple
          aria-hidden="true"
          className="h-3.5 w-3.5 text-[oklch(0.48_0.18_255)] animate-bounce"
          weight="bold"
        />
      ) : mode === "individual" ? (
        <Paperclip
          aria-hidden="true"
          className="h-3.5 w-3.5 text-[oklch(0.48_0.03_250)] group-hover:text-[oklch(0.48_0.18_255)]"
        />
      ) : (
        <UsersThree
          aria-hidden="true"
          className="h-3.5 w-3.5 text-[oklch(0.48_0.03_250)] group-hover:text-[oklch(0.48_0.18_255)]"
          weight="fill"
        />
      )}
      <span>
        {dragging ? "Soltar archivo" : mode === "individual" ? "Adjuntar" : "Entregar en equipo"}
      </span>
    </button>
  );
}
