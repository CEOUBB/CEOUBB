"use client";

import Link from "next/link";
import { Archive, Clock, FolderSimple } from "@phosphor-icons/react";
import type { Course } from "../lib/courses";
import { MobileSheet } from "./mobile-shell";

export function MobileCoursesSheet({
  open,
  courses,
  screen,
  openedCourseId,
  onOpenChange,
  openCourse,
}: {
  open: boolean;
  courses: Course[];
  screen: string;
  openedCourseId?: string;
  onOpenChange: (open: boolean) => void;
  openCourse: (course: Course) => void;
}) {
  return (
    <MobileSheet
      onOpenChange={onOpenChange}
      open={open}
      title="Mis ramos"
      description={courses[0]?.period ?? ""}
    >
      <div className="sheet-list">
        {courses.length === 0 && (
          <p className="side-empty">
            Sin ramos en este período. Aparecerán aquí al quedar inscritos.
          </p>
        )}
        {courses.map((item) => (
          <button
            className="sheet-row"
            data-active={screen === "course" && openedCourseId === item.id}
            key={item.id}
            onClick={() => openCourse(item)}
            style={{ "--course-tone": item.tone } as React.CSSProperties}
            type="button"
          >
            <span className="sheet-row-icon">
              <FolderSimple size={20} weight="fill" />
            </span>
            <span>
              {item.name}
              <small>{item.code}</small>
            </span>
          </button>
        ))}
        <Link
          className="sheet-row"
          href="/biblioteca/index.html"
          prefetch={false}
          onClick={() => onOpenChange(false)}
        >
          <span className="sheet-row-icon">
            <Archive size={20} />
          </span>
          <span>
            Biblioteca de Estudio
            <small>Catálogo completo</small>
          </span>
        </Link>
      </div>
    </MobileSheet>
  );
}

export function MobileCoursePreviewSheet({
  preview,
  onClose,
  enterCourse,
}: {
  preview: Course | null;
  onClose: () => void;
  enterCourse: (course: Course) => void;
}) {
  if (!preview) return null;
  return (
    <MobileSheet
      onOpenChange={(open) => !open && onClose()}
      open={Boolean(preview)}
      title={preview.name}
      description={preview.code}
    >
      <div className="course-sheet-body">
        <div
          className="course-sheet-badge"
          style={{ "--course-tone": preview.tone } as React.CSSProperties}
        >
          <FolderSimple size={32} weight="fill" />
          <div>
            <strong>{preview.name}</strong>
            <span>{preview.section ? `Sección ${preview.section}` : preview.code}</span>
          </div>
        </div>
        <div className="course-sheet-meta">
          <div className="course-sheet-row">
            <span className="meta-label">Profesor</span>
            <span className="meta-value">{preview.teacher}</span>
          </div>
          <div className="course-sheet-row">
            <span className="meta-label">Período</span>
            <span className="meta-value">
              <Clock size={14} />
              {preview.period}
            </span>
          </div>
        </div>
        <div className="course-sheet-actions">
          <button
            className="button primary block"
            onClick={() => {
              enterCourse(preview);
              onClose();
            }}
            type="button"
          >
            Entrar al aula
          </button>
        </div>
      </div>
    </MobileSheet>
  );
}
