"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarCheck } from "@phosphor-icons/react";
import { ClassroomPost } from "../../../lib/firebase-classroom-client";
import { formatDate, formatDueDate, type User } from "../../../lib/portal-utils";
import { kindLabel } from "./classroom-utils";

export function PostsSection({
  posts,
  user,
  editPost,
  deletePost,
  openMaterials,
}: {
  posts: ClassroomPost[];
  user: User;
  editPost: (post: ClassroomPost) => void;
  deletePost: (post: ClassroomPost) => void;
  openMaterials: () => void;
}) {
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
          return (
            <article key={post.id}>
              <span className={`post-kind ${post.kind}`}>{kindLabel(post.kind)}</span>
              <div>
                <h3>{post.title}</h3>
                <p>{post.body}</p>
                <footer>
                  <span>{post.authorName}</span>
                  <time>{formatDate(post.createdAt)}</time>
                  {post.dueDate && (
                    <span className="post-due">
                      <CalendarCheck size={13} weight="fill" aria-hidden="true" />
                      Entrega {formatDueDate(post.dueDate)}
                    </span>
                  )}
                  {post.linkUrl && (
                    <a href={post.linkUrl} target="_blank" rel="noopener noreferrer">
                      Abrir recurso <ArrowUpRight size={12} />
                    </a>
                  )}
                  {canManage && (
                    <span className="content-actions">
                      <button onClick={() => editPost(post)} type="button">
                        Modificar
                      </button>
                      <button onClick={() => deletePost(post)} type="button">
                        Eliminar
                      </button>
                    </span>
                  )}
                </footer>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
