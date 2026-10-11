"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowRight,
  MagnifyingGlass,
  Megaphone,
  Plus,
  X,
} from "@phosphor-icons/react";
import type { CoursePost } from "../../../lib/firebase-classroom-client";
import { filesOf, plainExcerpt } from "../../../lib/course-page";
import { formatDate } from "../../../lib/portal-utils";
import { filterPostsByQuery, paginateList } from "./classroom-utils";
import { FileList, LinkRow, type OpenAttachment } from "./CoursePageItems";
import { PaginationActions } from "./PaginationActions";
import { PageDialog } from "./PageDialog";
import { RichText } from "./RichText";
import { Line } from "../skeleton-bones";

const RAIL_ANNOUNCEMENTS = 3;
const READER_PAGE_SIZE = 20;

// Implements: REQ-PAGE-09
export function AnnouncementsPanel({
  announcements,
  loading,
  onOpen,
}: {
  announcements: CoursePost[];
  loading: boolean;
  onOpen: (postId?: string) => void;
}) {
  return (
    <section aria-labelledby="rail-announcements-title" className="rail-announcements">
      <div className="section-title compact-title">
        <h2 id="rail-announcements-title">
          <Megaphone aria-hidden="true" size={19} weight="fill" />
          Avisos
        </h2>
        {announcements.length > 0 && (
          <span className="section-count num">{announcements.length}</span>
        )}
      </div>
      <div className="course-notices-card">
        {loading ? (
          <div aria-hidden="true" className="course-notices-list">
            {[0, 1].map((row) => (
              <span className="course-notice-row" key={row}>
                <Line w={`${62 + row * 18}%`} />
                <Line w="92%" quiet />
              </span>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <p className="course-notices-empty">No hay avisos publicados.</p>
        ) : (
          <ul className="course-notices-list">
            {announcements.slice(0, RAIL_ANNOUNCEMENTS).map((post) => (
              <li key={post.id}>
                <button className="course-notice-row" onClick={() => onOpen(post.id)} type="button">
                  <span className="course-notice-head">
                    <strong>{post.title}</strong>
                    <time className="num" dateTime={post.createdAt}>
                      {formatDate(post.createdAt)}
                    </time>
                  </span>
                  {post.body && (
                    <span className="course-notice-excerpt">{plainExcerpt(post.body, 140)}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {announcements.length > RAIL_ANNOUNCEMENTS && (
          <button className="course-notices-more" onClick={() => onOpen()} type="button">
            Ver los <span className="num">{announcements.length}</span> avisos
            <ArrowRight aria-hidden="true" size={14} />
          </button>
        )}
      </div>
    </section>
  );
}

function AnnouncementArticle({
  post,
  canManage,
  onEdit,
  onDelete,
  openAttachment,
}: {
  post: CoursePost;
  canManage: boolean;
  onEdit: (post: CoursePost) => void;
  onDelete: (post: CoursePost) => void;
  openAttachment: OpenAttachment;
}) {
  return (
    <article className="course-notice" id={`aviso-${post.id}`}>
      <header>
        <h3>{post.title}</h3>
        <p className="course-notice-meta">
          <span>{post.authorName}</span>
          <time className="num" dateTime={post.createdAt}>
            {formatDate(post.createdAt)}
          </time>
        </p>
      </header>
      {post.body && <RichText body={post.body} />}
      {post.linkUrl && <LinkRow item={{ ...post, title: "" }} />}
      <FileList files={filesOf(post)} openAttachment={openAttachment} />
      {canManage && (
        <footer className="content-actions">
          <button
            aria-label={`Modificar aviso «${post.title}»`}
            onClick={() => onEdit(post)}
            type="button"
          >
            Modificar
          </button>
          <button
            aria-label={`Eliminar aviso «${post.title}»`}
            onClick={() => onDelete(post)}
            type="button"
          >
            Eliminar
          </button>
        </footer>
      )}
    </article>
  );
}

// Implements: REQ-PAGE-09, REQ-PAG-06
export function AnnouncementsReader({
  announcements,
  focusId,
  canManage,
  onCompose,
  onEdit,
  onDelete,
  onRestore,
  openAttachment,
  onClose,
}: {
  announcements: CoursePost[];
  focusId: string;
  canManage: boolean;
  onCompose: () => void;
  onEdit: (post: CoursePost) => void;
  onDelete: (post: CoursePost) => Promise<boolean>;
  onRestore: (post: CoursePost) => Promise<boolean>;
  openAttachment: OpenAttachment;
  onClose: () => void;
}) {
  const [removed, setRemoved] = useState<CoursePost | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const focusIndex = Math.max(
    0,
    announcements.findIndex((post) => post.id === focusId)
  );
  const [currentPage, setCurrentPage] = useState(
    () => Math.floor(focusIndex / READER_PAGE_SIZE) + 1
  );
  const [prevQuery, setPrevQuery] = useState(deferredQuery);
  if (deferredQuery !== prevQuery) {
    setPrevQuery(deferredQuery);
    setCurrentPage(1);
  }

  const visible = useMemo(
    () => filterPostsByQuery(announcements, deferredQuery),
    [announcements, deferredQuery]
  );
  const paginated = useMemo(
    () => paginateList(visible, currentPage, READER_PAGE_SIZE),
    [visible, currentPage]
  );

  useEffect(() => {
    if (!focusId) return;
    document.getElementById(`aviso-${focusId}`)?.scrollIntoView({ block: "start" });
  }, [focusId]);

  return (
    <PageDialog onClose={onClose} title="Avisos del ramo" wide>
      <div className="course-notices-reader">
        {(announcements.length > 2 || canManage) && (
          <div className="course-notices-tools">
            {announcements.length > 2 && (
              <search className="classroom-search-box">
                <MagnifyingGlass aria-hidden="true" size={16} />
                <input
                  aria-label="Buscar en los avisos"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por título, contenido o autor…"
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
            {canManage && (
              <button className="primary-button" onClick={onCompose} type="button">
                <Plus aria-hidden="true" size={16} weight="bold" />
                Nuevo aviso
              </button>
            )}
          </div>
        )}
        {removed && (
          <p className="course-notice-undo" role="status">
            <span>«{removed.title}» se movió a la papelera.</span>
            <button
              className="secondary-button"
              onClick={async () => {
                if (await onRestore(removed)) setRemoved(null);
              }}
              type="button"
            >
              <ArrowCounterClockwise aria-hidden="true" size={16} />
              Deshacer
            </button>
          </p>
        )}
        {announcements.length === 0 ? (
          <p className="course-notices-empty">No hay avisos publicados.</p>
        ) : visible.length === 0 ? (
          <p className="course-notices-empty" role="status">
            Ningún aviso coincide con «{deferredQuery}».
          </p>
        ) : (
          <div className="course-notices-feed">
            {paginated.items.map((post) => (
              <AnnouncementArticle
                canManage={canManage}
                key={post.id}
                onDelete={async (post) => {
                  if (await onDelete(post)) setRemoved(post);
                }}
                onEdit={onEdit}
                openAttachment={openAttachment}
                post={post}
              />
            ))}
          </div>
        )}
        {paginated.totalPages > 1 && (
          <nav aria-label="Paginación de avisos" className="classroom-pagination">
            <span className="pagination-summary num">
              Mostrando {paginated.startIndex}–{paginated.endIndex} de {paginated.totalItems}
            </span>
            <PaginationActions
              onPageChange={setCurrentPage}
              page={paginated.page}
              totalPages={paginated.totalPages}
            />
          </nav>
        )}
      </div>
    </PageDialog>
  );
}
