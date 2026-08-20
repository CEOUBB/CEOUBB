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

export function PostsSection({
  posts,
  user,
  editPost,
  deletePost,
  openMaterials,
}: {
  posts: ClassroomPost[];
  user: User;
  editPost: (post: ClassroomPost, values: { title: string; body: string }) => Promise<boolean>;
  deletePost: (post: ClassroomPost) => void;
  openMaterials: () => void;
}) {
  const [editing, setEditing] = useState<{ id: string; title: string; body: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const submitEdit = async (event: FormEvent<HTMLFormElement>, post: ClassroomPost) => {
    event.preventDefault();
    if (!editing || editing.id !== post.id) return;
    setSaving(true);
    const saved = await editPost(post, { title: editing.title.trim(), body: editing.body.trim() });
    setSaving(false);
    if (saved) setEditing(null);
  };

  return (
    <section className="posts-section">
      <div className="section-title compact-title">
        <h2>Avisos del curso</h2>
      </div>
      {posts.length === 0 && (
        <div className="empty-state">
          <strong>Todavía no hay avisos publicados.</strong>
          <p>Cuando el docente publique un aviso, una guía o un dictamen aparecerá aquí.</p>
          {user.role === "teacher" || user.role === "owner" ? (
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
            Boolean(post.authorId) &&
            (user.role === "owner" || post.authorEmail.toLowerCase() === user.email.toLowerCase());
          const safePostLink = post.linkUrl ? safeLinkDestination(post.linkUrl) : null;
          return (
            <article key={post.id}>
              <span className={`post-kind ${post.kind}`}>{kindLabel(post.kind)}</span>
              <div>
                <h3>{post.title}</h3>
                {editing?.id === post.id ? (
                  <form className="post-edit-form" onSubmit={(event) => submitEdit(event, post)}>
                    <label>
                      Título
                      <input
                        maxLength={140}
                        onChange={(event) => setEditing({ ...editing, title: event.target.value })}
                        required
                        value={editing.title}
                      />
                    </label>
                    <RichPostEditor
                      name="body"
                      onChange={(body) => setEditing({ ...editing, body })}
                      required
                      value={editing.body}
                    />
                    <span className="post-edit-actions">
                      <button
                        className="secondary-button"
                        disabled={saving}
                        onClick={() => setEditing(null)}
                        type="button"
                      >
                        Cancelar
                      </button>
                      <button className="primary-button" disabled={saving} type="submit">
                        {saving ? "Guardando…" : "Guardar cambios"}
                      </button>
                    </span>
                  </form>
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
                          <button
                            onClick={() =>
                              setEditing({ id: post.id, title: post.title, body: post.body })
                            }
                            type="button"
                          >
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
