"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarCheck } from "@phosphor-icons/react";
import { ClassroomPost } from "../../../lib/firebase-classroom-client";
import { formatDate, formatDueDate, type User } from "../../../lib/portal-utils";
import { safeLinkDestination } from "../../../lib/rich-text";
import { kindLabel } from "./classroom-utils";
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
  openMaterials,
}: {
  posts: ClassroomPost[];
  user: User;
  canManageContent: boolean;
  editPost: (post: ClassroomPost, values: { title: string; body: string }) => Promise<boolean>;
  deletePost: (post: ClassroomPost) => void;
  openMaterials: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section className="posts-section">
      <div className="section-title compact-title">
        <h2>Avisos del curso</h2>
      </div>
      {posts.length === 0 && (
        <div className="empty-state">
          <strong>Todavía no hay avisos publicados.</strong>
          <p>Cuando el docente publique un aviso, una guía o un dictamen aparecerá aquí.</p>
          {canManageContent ? (
            <button className="empty-state-action" onClick={openMaterials} type="button">
              Publicar primer aviso <ArrowRight size={15} />
            </button>
          ) : (
            <Link className="empty-state-action" href="/biblioteca/index.html" prefetch={false}>
              Abrir biblioteca académica <ArrowRight size={15} />
            </Link>
          )}
        </div>
      )}
      <div className="post-list">
        {posts.map((post) => {
          const canManage =
            canManageContent &&
            Boolean(post.authorId) &&
            (user.role === "owner" || post.authorEmail.toLowerCase() === user.email.toLowerCase());
          const safePostLink = post.linkUrl ? safeLinkDestination(post.linkUrl) : null;
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
                    <footer>
                      <span>{post.authorName}</span>
                      <time>{formatDate(post.createdAt)}</time>
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
                          <button onClick={() => setEditingId(post.id)} type="button">
                            Modificar
                          </button>
                          <button onClick={() => deletePost(post)} type="button">
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
