"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  CalendarBlank,
  DownloadSimple,
  EyeSlash,
  File as FileIcon,
  FileDoc,
  FilePdf,
  FilePpt,
  FileXls,
  FileZip,
  ImageSquare,
  LinkSimple,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react";
import {
  classroomFileBlob,
  type ClassroomAttachment,
  type CoursePost,
} from "../../../lib/firebase-classroom-client";
import { FILE_KIND_LABELS, displayName, fileKind, type FileKind } from "../../../lib/course-page";
import { formatBytes } from "../../../lib/portal-utils";
import { safeLinkDestination } from "../../../lib/rich-text";
import { RichText } from "./RichText";

export type OpenAttachment = (file: { name: string; storagePath: string }) => void;

const FILE_ICONS: Record<FileKind, Icon> = {
  pdf: FilePdf,
  image: ImageSquare,
  archive: FileZip,
  slides: FilePpt,
  sheet: FileXls,
  document: FileDoc,
  file: FileIcon,
};

export function fileIcon(contentType: string, name: string): Icon {
  return FILE_ICONS[fileKind(contentType, name)];
}

const scheduleFormat = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatSchedule(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : scheduleFormat.format(date);
}

export function filesOf(item: CoursePost): ClassroomAttachment[] {
  if (!item.storagePath) return item.attachments;
  return [
    {
      name: item.title || "Archivo",
      storagePath: item.storagePath,
      contentType: "",
      size: 0,
    },
    ...item.attachments,
  ];
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Implements: REQ-PAGE-02, REQ-PUB-09
export function FileRow({
  file,
  label,
  openAttachment,
}: {
  file: ClassroomAttachment;
  label: string;
  openAttachment: OpenAttachment;
}) {
  const kind = fileKind(file.contentType, file.storagePath || file.name);
  const KindIcon = FILE_ICONS[kind];
  return (
    <button
      className="page-file"
      onClick={() => openAttachment(file)}
      title={`Descargar ${file.name}`}
      type="button"
    >
      <span className="page-file-icon">
        <KindIcon aria-hidden="true" size={20} />
      </span>
      <span className="page-file-text">
        <strong>{label}</strong>
        <small>
          {FILE_KIND_LABELS[kind]}
          {file.size > 0 && <span className="num"> · {formatBytes(file.size)}</span>}
        </small>
      </span>
      <DownloadSimple aria-hidden="true" className="page-file-action" size={16} />
    </button>
  );
}

// Implements: REQ-PAGE-02, REQ-SEC-12
export function LinkRow({ item }: { item: CoursePost }) {
  const safePostLink = item.linkUrl ? safeLinkDestination(item.linkUrl) : null;
  if (!safePostLink) return null;
  const host = hostOf(safePostLink);
  return (
    <a
      className="page-file page-link"
      href={safePostLink}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="page-file-icon">
        <LinkSimple aria-hidden="true" size={20} />
      </span>
      <span className="page-file-text">
        <strong>{item.title || host}</strong>
        <small>{host}</small>
      </span>
      <ArrowUpRight aria-hidden="true" className="page-file-action" size={16} />
    </a>
  );
}

type ImageState = { url: string; width: number; height: number; failed: boolean };

// Implements: REQ-PAGE-02, REQ-SEC-02
function ImageFigure({
  file,
  caption,
  openAttachment,
}: {
  file: ClassroomAttachment;
  caption: string;
  openAttachment: OpenAttachment;
}) {
  const [image, setImage] = useState<ImageState>({ url: "", width: 0, height: 0, failed: false });
  const frame = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    let url = "";
    let cancelled = false;
    const load = () =>
      classroomFileBlob(file.storagePath)
        .then(async (blob) => {
          if (cancelled) return;
          if (!blob) {
            setImage({ url: "", width: 0, height: 0, failed: true });
            return;
          }

          const bitmap = await createImageBitmap(blob);
          const { width, height } = bitmap;
          bitmap.close();
          if (cancelled) return;
          url = URL.createObjectURL(blob);
          setImage({ url, width, height, failed: false });
        })
        .catch(() => {
          if (!cancelled) setImage({ url: "", width: 0, height: 0, failed: true });
        });
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void load();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.storagePath]);

  return (
    <figure className="page-image">
      <button
        aria-label={caption ? `Abrir imagen: ${caption}` : "Abrir imagen"}
        className="page-image-frame"
        data-state={image.url ? "ready" : image.failed ? "failed" : "loading"}
        onClick={() => openAttachment(file)}
        ref={frame}
        type="button"
      >
        {image.url ? (
          <Image alt="" height={image.height} src={image.url} unoptimized width={image.width} />
        ) : image.failed ? (
          <span className="page-image-fallback">
            <WarningCircle aria-hidden="true" size={18} />
            No se pudo cargar la imagen. Ábrela para descargarla.
          </span>
        ) : (
          <span aria-hidden="true" className="sk page-image-bone" />
        )}
      </button>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export function FileList({
  files,
  firstLabel,
  openAttachment,
}: {
  files: ClassroomAttachment[];
  firstLabel?: string;
  openAttachment: OpenAttachment;
}) {
  if (files.length === 0) return null;
  return (
    <div className="page-files">
      {files.map((file, index) => (
        <FileRow
          file={file}
          key={file.storagePath}
          label={index === 0 && firstLabel ? firstLabel : displayName(file.name)}
          openAttachment={openAttachment}
        />
      ))}
    </div>
  );
}

// Implements: REQ-PAGE-02
export function PageItemContent({
  item,
  openAttachment,
}: {
  item: CoursePost;
  openAttachment: OpenAttachment;
}) {
  const files = filesOf(item);

  if (item.itemType === "link") return <LinkRow item={item} />;
  if (item.itemType === "image") {
    const [image] = files;
    return image ? (
      <ImageFigure caption={item.title} file={image} openAttachment={openAttachment} />
    ) : null;
  }

  if (item.itemType === "file") {
    return <FileList files={files} firstLabel={item.title} openAttachment={openAttachment} />;
  }

  return (
    <div className="page-text">
      {item.title && <h3>{item.title}</h3>}
      {item.body && <RichText body={item.body} />}
      {item.linkUrl && <LinkRow item={{ ...item, title: "" }} />}
      <FileList files={files} openAttachment={openAttachment} />
    </div>
  );
}

// Implements: REQ-PAGE-05
export function VisibilityNote({
  hidden,
  publishAt,
  noun,
}: {
  hidden: boolean;
  publishAt: string;
  noun: "elemento" | "sección";
}) {
  if (!hidden) return null;
  const hiddenLabel = noun === "sección" ? "Oculta para estudiantes" : "Oculto para estudiantes";
  return (
    <p className="page-state">
      {publishAt ? (
        <>
          <CalendarBlank aria-hidden="true" size={14} />
          Se mostrará el <span className="num">{formatSchedule(publishAt)}</span>
        </>
      ) : (
        <>
          <EyeSlash aria-hidden="true" size={14} />
          {hiddenLabel}
        </>
      )}
    </p>
  );
}
