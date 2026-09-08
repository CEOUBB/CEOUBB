"use client";

import { FormEvent, useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  DownloadSimple,
  MagnifyingGlass,
  Megaphone,
  Paperclip,
  X,
} from "@phosphor-icons/react";
import type { ClassroomAttachment, ClassroomPost } from "../../../lib/firebase-classroom-client";
import { formatBytes, formatDate, formatDueDate, type User } from "../../../lib/portal-utils";
import { safeLinkDestination } from "../../../lib/rich-text";
import { filterPostsByQuery, kindLabel } from "./classroom-utils";
import { EmptyState } from "./EmptyState";
import { RichPostEditor } from "./RichPostEditor";
import { RichText } from "./RichText";

function PostEditForm({
  post,
  onCancel,
  onSave,
}: {
  post: ClassroomPost;
  onCancel: () => void;
  onSave: (post: ClassroomPost, values: { title: string; body: string }) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [saving, setSaving] = useState(false);

  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await onSave(post, {
        title: title.trim(),
        body: body.trim(),
      });
      if (saved) onCancel();
    } catch {
      // Ignorar fallo de guardado y restaurar estado
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="post-edit-form" onSubmit={submitEdit}>
      <label>
        Título
        <input
          maxLength={140}
          onChange={(event) => setTitle(event.target.value)}
          required
          value={title}
        />
      </label>
      <RichPostEditor
        name="body"
        onChange={(nextBody) => setBody(nextBody)}
        required
        value={body}
      />
      <span className="post-edit-actions">
        <button className="secondary-button" disabled={saving} onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className="primary-button" disabled={saving} type="submit">
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </span>
    </form>
  );
}

export function PostsSection({
  posts,
  user,
  canManageContent,
  editPost,
  deletePost,
  openAttachment,
  startPublication,
}: {
  posts: ClassroomPost[];
  user: User;
  canManageContent: boolean;
  editPost: (post: ClassroomPost, values: { title: string; body: string }) => Promise<boolean>;
  deletePost: (post: ClassroomPost) => void;
  openAttachment: (attachment: { name: string; storagePath: string }) => void;
  startPublication: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  // Implements: REQ-PAG-06
  const visiblePosts = useMemo(
    () => filterPostsByQuery(posts, deferredQuery),
    [posts, deferredQuery]
  );

  return (
    <section className="posts-section">
      <div className="section-title compact-title">
        <h2>Publicaciones del ramo</h2>
      </div>

      {posts.length > 2 && (
        <search className="classroom-search-box">
          <MagnifyingGlass aria-hidden="true" size={16} />
          <input
            aria-label="Buscar publicaciones y archivos del ramo"
            id="posts-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título, contenido o carpeta…"
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

      {posts.length === 0 && (
        <EmptyState
          icon={Megaphone}
          title={
            canManageContent ? "Aún no publicas nada en este ramo" : "Todavía no hay publicaciones"
          }
          description={
            canManageContent
              ? "Los avisos, guías y certámenes que publiques encabezarán la portada del ramo."
              : "Cuando el docente publique un aviso, una guía o un certamen aparecerá aquí."
          }
          action={
            canManageContent ? (
              <button className="empty-state-action" onClick={startPublication} type="button">
                Crear la primera publicación <ArrowRight size={15} />
              </button>
            ) : (
              <Link className="empty-state-action" href="/biblioteca/index.html" prefetch={false}>
                Abrir biblioteca académica <ArrowRight size={15} />
              </Link>
            )
          }
        />
      )}

      {posts.length > 0 && visiblePosts.length === 0 && (
        <p className="empty-row" role="status">
          No se encontraron publicaciones que coincidan con “{deferredQuery}”.
        </p>
      )}

      <div className="post-list">
        {visiblePosts.map((post) => {
          const canManage =
            canManageContent &&
            Boolean(post.authorId) &&
            (user.role === "owner" || post.authorEmail.toLowerCase() === user.email.toLowerCase());
          const safePostLink = post.linkUrl ? safeLinkDestination(post.linkUrl) : null;
          /* Un archivo subido es una publicación con ruta de almacenamiento:
             se ofrece como adjunto propio para que la Portada lo muestre igual
             que a los que viajan dentro de un aviso. */
          const attachments: ClassroomAttachment[] = post.storagePath
            ? [
                {
                  name: post.title,
                  storagePath: post.storagePath,
                  contentType: "application/octet-stream",
                  size: 0,
                },
                ...post.attachments,
              ]
            : post.attachments;
          return (
            <article key={post.id}>
              <span className={`post-kind ${post.kind}`}>{kindLabel(post.kind)}</span>
              <div>
                <h3>{post.title}</h3>
                {editingId === post.id ? (
                  <PostEditForm onCancel={() => setEditingId(null)} onSave={editPost} post={post} />
                ) : (
                  <>
                    <RichText body={post.body} />
                    {/* Implements: REQ-PUB-09 */}
                    {attachments.length > 0 && (
                      <ul className="post-attachments">
                        {attachments.map((attachment) => (
                          <li key={attachment.storagePath}>
                            <button
                              onClick={() => openAttachment(attachment)}
                              title={`Descargar ${attachment.name}`}
                              type="button"
                            >
                              <Paperclip aria-hidden="true" size={14} />
                              <span>{attachment.name}</span>
                              {attachment.size > 0 && (
                                <small className="num">{formatBytes(attachment.size)}</small>
                              )}
                              <DownloadSimple aria-hidden="true" size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <footer>
                      <span>{post.authorName}</span>
                      <time>{formatDate(post.createdAt)}</time>
                      <span className="post-folder">{post.folder}</span>
                      {post.dueDate && (
                        <span className="post-due">
                          <CalendarCheck size={13} weight="fill" aria-hidden="true" />
                          Entrega {formatDueDate(post.dueDate)}
                        </span>
                      )}
                      {safePostLink && (
                        <a href={safePostLink} target="_blank" rel="noopener noreferrer">
                          Abrir recurso <ArrowUpRight size={12} />
                        </a>
                      )}
                      {canManage && (
                        <span className="content-actions">
                          <button
                            aria-label={`Modificar aviso "${post.title}"`}
                            onClick={() => setEditingId(post.id)}
                            type="button"
                          >
                            Modificar
                          </button>
                          <button
                            aria-label={`Eliminar aviso "${post.title}"`}
                            onClick={() => deletePost(post)}
                            type="button"
                          >
                            Eliminar
                          </button>
                        </span>
                      )}
                    </footer>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
