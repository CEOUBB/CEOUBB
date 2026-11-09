"use client";

import { useDeferredValue, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  CaretDown,
  MagnifyingGlass,
  SquaresFour,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type { Course } from "../../../lib/courses";
import type { ClassroomState } from "../../../lib/firebase-classroom-client";
import {
  PAGE_POSTS_LIMIT,
  sectionAnchor,
  type CoursePage as CoursePageModel,
  type PageSectionView,
} from "../../../lib/course-page";
import { CoursePageSkeleton } from "../ViewSkeletons";
import { EmptyState } from "./EmptyState";
import { filterPostsByQuery, normalizeSearchText } from "./classroom-utils";
import { PageItemContent, VisibilityNote, type OpenAttachment } from "./CoursePageItems";

// Implements: REQ-PAGE-03, REQ-PERF-01
const CoursePageEditor = dynamic(
  () => import("./CoursePageEditor").then((module) => module.CoursePageEditor),
  { ssr: false, loading: () => <CoursePageSkeleton /> }
);

export type ComposeSeed = { title: string; body: string };

const SEARCH_THRESHOLD = 4;

function collapsedKey(courseId: string) {
  return `ceoubb:page-collapsed:${courseId}`;
}

function readCollapsed(courseId: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(collapsedKey(courseId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function storeCollapsed(courseId: string, ids: ReadonlySet<string>) {
  try {
    window.localStorage.setItem(collapsedKey(courseId), JSON.stringify([...ids]));
  } catch {
    return;
  }
}

// Implements: REQ-PAGE-01, REQ-PAGE-02
function PageSectionBlock({
  section,
  collapsed,
  onToggle,
  openAttachment,
}: {
  section: PageSectionView;
  collapsed: boolean;
  onToggle: () => void;
  openAttachment: OpenAttachment;
}) {
  const anchor = sectionAnchor(section.id);
  return (
    <section
      aria-labelledby={`${anchor}-title`}
      className="page-section"
      data-collapsed={collapsed}
      data-hidden={section.hidden}
      id={anchor}
    >
      <header className="page-section-head">
        <h2 id={`${anchor}-title`}>
          <button
            aria-controls={`${anchor}-body`}
            aria-expanded={!collapsed}
            className="page-section-toggle"
            onClick={onToggle}
            type="button"
          >
            <span aria-hidden="true" className="page-section-mark" />
            <span className="page-section-title">{section.title}</span>
            {collapsed && (
              <span className="page-section-count num">
                {section.items.length} {section.items.length === 1 ? "elemento" : "elementos"}
              </span>
            )}
            <CaretDown aria-hidden="true" className="page-section-caret" size={16} />
          </button>
        </h2>
        <VisibilityNote hidden={section.hidden} noun="sección" publishAt={section.publishAt} />
      </header>
      <div className="page-section-body" hidden={collapsed} id={`${anchor}-body`}>
        {section.items.length === 0 ? (
          <p className="page-section-empty">Esta sección aún no tiene contenido.</p>
        ) : (
          section.items.map((item) => (
            <div
              className="page-item"
              data-hidden={item.hidden}
              data-type={item.itemType}
              key={item.id}
            >
              <PageItemContent item={item} openAttachment={openAttachment} />
              <VisibilityNote hidden={item.hidden} noun="elemento" publishAt={item.publishAt} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// Implements: REQ-PAGE-01, REQ-PAGE-05
export function PageSectionsView({
  courseId,
  sections,
  expanded = false,
  openAttachment,
}: {
  courseId: string;
  sections: readonly PageSectionView[];
  expanded?: boolean;
  openAttachment: OpenAttachment;
}) {
  const [collapsed, setCollapsed] = useState(() => readCollapsed(courseId));

  const toggle = (sectionId: string) => {
    const next = new Set(collapsed);
    if (next.has(sectionId)) next.delete(sectionId);
    else next.add(sectionId);
    setCollapsed(next);
    storeCollapsed(courseId, next);
  };

  return (
    <div className="page-sections">
      {sections.map((section) => (
        <PageSectionBlock
          collapsed={!expanded && collapsed.has(section.id)}
          key={section.id}
          onToggle={() => toggle(section.id)}
          openAttachment={openAttachment}
          section={section}
        />
      ))}
    </div>
  );
}

// Implements: REQ-PAGE-01, REQ-PAGE-03, REQ-PAGE-12
export function CoursePage({
  course,
  classroom,
  page,
  team,
  canEdit,
  editing,
  onStartEditing,
  onFinishEditing,
  openAttachment,
  retry,
}: {
  course: Course;
  classroom: ClassroomState;
  page: CoursePageModel;
  team: boolean;
  canEdit: boolean;
  editing: boolean;
  onStartEditing: () => void;
  onFinishEditing: (seed: ComposeSeed | null) => void;
  openAttachment: OpenAttachment;
  retry: () => void;
}) {
  const loading = classroom.postsStatus === "loading" || classroom.sectionsStatus === "loading";
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const itemCount = page.sections.reduce((total, section) => total + section.items.length, 0);
  // Implements: REQ-PAG-06
  const visibleSections = useMemo(() => {
    if (!deferredQuery) return page.sections;
    const needle = normalizeSearchText(deferredQuery);
    return page.sections
      .map((section) =>
        normalizeSearchText(section.title).includes(needle)
          ? section
          : { ...section, items: filterPostsByQuery(section.items, deferredQuery) }
      )
      .filter((section) => section.items.length > 0);
  }, [deferredQuery, page.sections]);

  if (editing && canEdit) {
    return (
      <CoursePageEditor
        classroom={classroom}
        course={course}
        onDone={onFinishEditing}
        openAttachment={openAttachment}
        retry={retry}
        teamPage={page}
      />
    );
  }

  return (
    <section aria-label={`Contenido de ${course.name}`} className="course-page">
      {team && classroom.postsOverflow && (
        <p className="page-notice" role="status">
          <WarningCircle aria-hidden="true" size={18} />
          <span>
            Este ramo superó los <span className="num">{PAGE_POSTS_LIMIT}</span> elementos y avisos
            visibles. Los más antiguos no se muestran: mueve material que ya no se usa a la
            papelera.
          </span>
        </p>
      )}
      {loading ? (
        <CoursePageSkeleton />
      ) : page.sections.length === 0 ? (
        <EmptyState
          action={
            canEdit ? (
              <button className="empty-state-action" onClick={onStartEditing} type="button">
                Empezar a armar la página <ArrowRight aria-hidden="true" size={15} />
              </button>
            ) : undefined
          }
          description={
            canEdit
              ? "Organiza el ramo en secciones con el nombre que quieras, como la descripción del curso, cada unidad o las evaluaciones, y agrega textos, archivos, enlaces e imágenes en cada una."
              : "Cuando el equipo docente publique material en este ramo, aparecerá aquí ordenado por secciones."
          }
          icon={SquaresFour}
          title={canEdit ? "La página del ramo está vacía" : "Todavía no hay contenido"}
        />
      ) : (
        <>
          {itemCount >= SEARCH_THRESHOLD && (
            <search className="classroom-search-box">
              <MagnifyingGlass aria-hidden="true" size={16} />
              <input
                aria-label="Buscar en el contenido del ramo"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar en las secciones del ramo…"
                type="search"
                value={query}
              />
              {query && (
                <button
                  aria-label="Limpiar búsqueda"
                  className="search-clear-btn"
                  onClick={() => setQuery("")}
                  type="button"
                >
                  <X aria-hidden="true" size={14} />
                </button>
              )}
            </search>
          )}
          {visibleSections.length === 0 ? (
            <p className="empty-row" role="status">
              Nada en el ramo coincide con «{deferredQuery}».
            </p>
          ) : (
            <PageSectionsView
              courseId={course.id}
              expanded={Boolean(deferredQuery)}
              openAttachment={openAttachment}
              sections={visibleSections}
            />
          )}
        </>
      )}
    </section>
  );
}
