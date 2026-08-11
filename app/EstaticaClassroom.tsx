"use client";

import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChartBar, Files, House, Sigma, UsersThree } from "@phosphor-icons/react";
import { ClassroomFile, ClassroomPost, ClassroomState, ClassroomStudent, classroomFileUrl, deleteClassroomPost, editClassroomPost, publishClassroomPost, renameClassroomFile, saveClassroomProgress, uploadClassroomFile, watchClassroom } from "../lib/firebase-classroom-client";
import { Avatar, ease, initials, rise, roleLabel, Screen, stagger } from "./portal-ui";
import type { User } from "./portal-ui";

function Equilibrium({ symbol, sub }: { symbol: string; sub?: string }) {
  return (
    <math className="math">
      <mrow>
        <mo>∑</mo>
        {sub ? <msub><mi>{symbol}</mi><mi>{sub}</mi></msub> : <mi>{symbol}</mi>}
        <mo>=</mo>
        <mn>0</mn>
      </mrow>
    </math>
  );
}

const friction = (
  <math className="math">
    <mrow><mi>F</mi><mo>≤</mo><msub><mi>μ</mi><mi>s</mi></msub><mi>N</mi></mrow>
  </math>
);

const steiner = (
  <math className="math">
    <mrow><mi>I</mi><mo>=</mo><mover><mi>I</mi><mo>¯</mo></mover><mo>+</mo><mi>A</mi><msup><mi>d</mi><mn>2</mn></msup></mrow>
  </math>
);

const units = [
  { title: "RA1 · Sistemas de fuerzas", subtitle: "Vectores, leyes de Newton, resultantes y sistemas equivalentes", equation: <Equilibrium symbol="F" /> },
  { title: "RA2 · Cuerpos rígidos y estructuras", subtitle: "Diagramas de cuerpo libre, reacciones y equilibrio en 2D/3D", equation: <Equilibrium symbol="M" sub="O" /> },
  { title: "RA3 · Fricción seca", subtitle: "Cuñas, tornillos, correas, descansos y rodadura", equation: friction },
  { title: "RA4 · Propiedades de área y masa", subtitle: "Centroide, centro de gravedad, inercia y teorema de Steiner", equation: steiner },
];

const initialPost: ClassroomPost = {
  id: "welcome",
  authorId: "",
  authorEmail: "",
  authorName: "Equipo Centro de Estudio UBB",
  authorRole: "owner",
  title: "Aula piloto de Estática disponible",
  body: "Aquí el docente puede publicar avisos, guías, presentaciones y dictámenes. Los estudiantes pueden revisar materiales y registrar su avance por resultado de aprendizaje.",
  kind: "notice",
  linkUrl: null,
  storagePath: "",
  createdAt: "2026-08-08T12:00:00.000Z",
};

type Note = { text: string; tone: "info" | "ok" | "bad" };

const emptyClassroom: ClassroomState = { posts: [], files: [], students: [], ownProgress: 0 };

function Bar({ ratio }: { ratio: number }) {
  return <motion.span animate={{ scaleX: Math.min(1, Math.max(0, ratio)) }} initial={{ scaleX: 0 }} transition={{ duration: 0.6, ease }} />;
}

export default function EstaticaClassroom({ user, goBack }: { user: User; goBack: () => void }) {
  const [tab, setTab] = useState<"home" | "materials" | "progress" | "people">("home");
  const [classroom, setClassroom] = useState<ClassroomState>(emptyClassroom);
  const [status, setStatus] = useState<Note>({ text: "", tone: "info" });
  const note = (text: string, tone: Note["tone"] = "info") => setStatus({ text, tone });
  const canTeach = user.role === "teacher" || user.role === "owner";
  const { files, students } = classroom;
  const posts = [initialPost, ...classroom.posts];
  const completed = classroom.ownProgress;

  useEffect(() => watchClassroom(canTeach, (patch) => setClassroom((current) => ({ ...current, ...patch })), (message) => note(message, "bad")), [canTeach]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab]);

  const updateProgress = async (next: number) => {
    setClassroom((current) => ({ ...current, ownProgress: next }));
    await saveClassroomProgress(next, units.length).catch((cause) => note(cause instanceof Error ? cause.message : "No se pudo guardar el progreso.", "bad"));
  };

  const publish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    note("Publicando…");
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    try {
      await publishClassroomPost({ title: String(form.get("title") ?? ""), body: String(form.get("body") ?? ""), kind: String(form.get("kind") ?? "notice"), linkUrl: String(form.get("linkUrl") ?? "") });
      formElement.reset();
      note("Publicado correctamente y notificado al curso.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible publicar.", "bad");
    }
  };

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    note("Subiendo archivo…");
    const formElement = event.currentTarget;
    const file = new FormData(formElement).get("file");
    if (!(file instanceof File)) return note("Selecciona un archivo.", "bad");
    try {
      await uploadClassroomFile(file, (percent) => note(`Subiendo archivo… ${percent}%`));
      formElement.reset();
      note("Archivo disponible y notificado al curso.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible subir el archivo.", "bad");
    }
  };

  const editPost = async (post: ClassroomPost) => {
    const title = window.prompt("Título de la publicación", post.title);
    if (title === null) return;
    const body = window.prompt("Contenido de la publicación", post.body);
    if (body === null) return;
    try {
      await editClassroomPost(post.id, { title, body });
      note("Publicación actualizada.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible modificarla.", "bad");
    }
  };

  const deletePost = async (post: ClassroomPost) => {
    if (!window.confirm(`¿Eliminar “${post.title}”?`)) return;
    try {
      await deleteClassroomPost(post.id, post.storagePath);
      note("Publicación eliminada.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible eliminarla.", "bad");
    }
  };

  const openFile = async (file: ClassroomFile) => {
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const url = file.url || await classroomFileUrl(file.storagePath);
      if (tab) tab.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch (cause) {
      tab?.close();
      note(cause instanceof Error ? cause.message : "No fue posible abrir el archivo.", "bad");
    }
  };

  const renameFile = async (file: ClassroomFile) => {
    const name = window.prompt("Nombre del archivo", file.name);
    if (name === null) return;
    try {
      await renameClassroomFile(file.id, name);
      note("Archivo renombrado.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible modificarlo.", "bad");
    }
  };

  const deleteFile = async (file: ClassroomFile) => {
    if (!window.confirm(`¿Eliminar “${file.name}”?`)) return;
    try {
      await deleteClassroomPost(file.id, file.storagePath);
      note("Archivo eliminado.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible eliminarlo.", "bad");
    }
  };

  return (
    <div className="classroom-layout">
      <aside className="classroom-sidebar">
        <button className="back-button" onClick={goBack} type="button"><ArrowLeft size={15} /><span>Mis cursos</span></button>
        <div className="course-identity panel-navy"><span>440299</span><h2>Estática</h2><p>Ingeniería Mecánica · 2026-2</p></div>
        <nav aria-label="Secciones del aula">
          <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")} type="button"><House size={18} />Portada del curso</button>
          <button className={tab === "people" ? "active" : ""} onClick={() => setTab("people")} type="button"><UsersThree size={18} />Participantes</button>
          <button onClick={() => setTab("progress")} className={tab === "progress" ? "active" : ""} type="button"><ChartBar size={18} />Progreso y monitoreo</button>
          <button className={tab === "materials" ? "active" : ""} onClick={() => setTab("materials")} type="button"><Files size={18} />Materiales</button>
        </nav>
        <a className="sidebar-library" href="/biblioteca/index.html">Banco de certámenes <ArrowUpRight size={14} /></a>
      </aside>
      <main className="classroom-main">
        <header className="classroom-top"><div><span className="breadcrumb">Mis cursos / Estática</span>{tab !== "home" && <h1>{tabTitle(tab)}</h1>}</div><span className="role-badge">{roleLabel(user.role)}</span></header>
        <AnimatePresence initial={false} mode="wait">
        <Screen key={tab}>
        {tab === "home" && (
          <>
            <section className="course-cover panel-navy"><div><span className="eyebrow">Aula piloto colaborativa</span><h1>Equilibrio, fricción y propiedades de área y masa</h1><p>Desarrolla modelos de sistemas mecánicos en equilibrio con análisis riguroso, diagramas de cuerpo libre y notación matemática inmediata.</p><div className="cover-meta"><span>6 créditos SCT</span><span>Semestral</span><span>Presencial y digital</span></div></div><div className="equation-stack"><span><Equilibrium symbol="F" sub="x" /></span><span><Equilibrium symbol="F" sub="y" /></span><span><Equilibrium symbol="M" sub="O" /></span></div></section>
            <div className="classroom-columns">
              <section>
                <div className="section-title compact-title"><h2>Resultados de aprendizaje</h2></div>
                <motion.div animate="show" className="unit-grid" initial="hidden" variants={stagger}>{units.map((unit, index) => <motion.article key={unit.title} transition={{ duration: 0.45, ease }} variants={rise}><span className="unit-number">0{index + 1}</span><div><h3>{unit.title}</h3><p>{unit.subtitle}</p></div><strong>{unit.equation}</strong>{!canTeach && <label className="unit-check"><input checked={index < completed} onChange={(event) => updateProgress(event.target.checked ? Math.max(completed, index + 1) : Math.min(completed, index))} type="checkbox" />Completado</label>}</motion.article>)}</motion.div>
              </section>
              <aside className="course-facts">
                <dl>
                  <div>
                    <dt>Coordinación</dt>
                    <dd><b>Profesor de Estática</b><small>Cuenta docente institucional</small></dd>
                  </div>
                  <div>
                    <dt>Próxima entrega</dt>
                    <dd><b>Banco RA1 disponible</b><small>Certamen completo · 90 min</small></dd>
                  </div>
                  <div>
                    <dt>{canTeach ? "Estudiantes" : "Tu avance"}</dt>
                    <dd>
                      <b>{canTeach ? studentCount(students.length) : `${completed} de ${units.length} unidades`}</b>
                      {!canTeach && <span className="mini-progress"><Bar ratio={completed / units.length} /></span>}
                    </dd>
                  </div>
                </dl>
              </aside>
            </div>
            <PostsSection posts={posts} user={user} editPost={editPost} deletePost={deletePost} />
          </>
        )}
        {tab === "materials" && <MaterialsSection files={files} user={user} canTeach={canTeach} publish={publish} upload={upload} openFile={openFile} renameFile={renameFile} deleteFile={deleteFile} status={status} />}
        {tab === "progress" && <ProgressSection user={user} completed={completed} students={students} />}
        {tab === "people" && <PeopleSection user={user} students={students} />}
        </Screen>
        </AnimatePresence>
      </main>
    </div>
  );
}

function PostsSection({ posts, user, editPost, deletePost }: { posts: ClassroomPost[]; user: User; editPost: (post: ClassroomPost) => void; deletePost: (post: ClassroomPost) => void }) {
  return (
    <section className="posts-section">
      <div className="section-title compact-title"><h2>Avisos del curso</h2></div>
      <div className="post-list">{posts.map((post) => { const canManage = Boolean(post.authorId) && (user.role === "owner" || post.authorEmail.toLowerCase() === user.email.toLowerCase()); return <article key={post.id}><span className={`post-kind ${post.kind}`}>{kindLabel(post.kind)}</span><div><h3>{post.title}</h3><p>{post.body}</p><footer><span>{post.authorName}</span><time>{formatDate(post.createdAt)}</time>{post.linkUrl && <a href={post.linkUrl} target="_blank" rel="noreferrer">Abrir recurso <ArrowUpRight size={12} /></a>}{canManage && <span className="content-actions"><button onClick={() => editPost(post)} type="button">Modificar</button><button onClick={() => deletePost(post)} type="button">Eliminar</button></span>}</footer></div></article>; })}</div>
    </section>
  );
}

function MaterialsSection({ files, user, canTeach, publish, upload, openFile, renameFile, deleteFile, status }: { files: ClassroomFile[]; user: User; canTeach: boolean; publish: (event: FormEvent<HTMLFormElement>) => void; upload: (event: FormEvent<HTMLFormElement>) => void; openFile: (file: ClassroomFile) => void; renameFile: (file: ClassroomFile) => void; deleteFile: (file: ClassroomFile) => void; status: Note }) {
  return (
    <section className="materials-view">
      <div className="materials-list">
        <div className="section-title compact-title"><h2>Archivos compartidos</h2></div>
        <a className="material-row featured" href="/biblioteca/index.html"><span className="file-icon"><Sigma size={20} /></span><div><strong>Banco completo de Estática</strong><small>Certámenes, ejercicios resueltos, apuntes y material original</small></div><b>Abrir <ArrowRight size={14} /></b></a>
        {files.length === 0 && <div className="empty-state"><strong>Aún no hay archivos del docente.</strong><p>Cuando publique una guía, PPT, PDF o dictamen aparecerá aquí.</p></div>}
        {files.map((file) => { const canManage = user.role === "owner" || file.authorEmail.toLowerCase() === user.email.toLowerCase(); return <div className="material-row" key={file.id}><span className="file-icon">{fileExtension(file.name)}</span><div><strong>{file.name}</strong><small>{file.authorName} · {formatBytes(file.size)} · {formatDate(file.createdAt)}</small></div><span className="material-actions"><button onClick={() => openFile(file)} type="button">Descargar</button>{canManage && <span className="content-actions"><button onClick={() => renameFile(file)} type="button">Modificar</button><button onClick={() => deleteFile(file)} type="button">Eliminar</button></span>}</span></div>; })}
      </div>
      {canTeach && <aside className="teacher-tools"><h2>Publicar en el aula</h2><form onSubmit={publish}><label>Título<input name="title" required /></label><label>Tipo<select name="kind"><option value="notice">Aviso</option><option value="guide">Guía</option><option value="assessment">Dictamen o certamen</option><option value="resource">Recurso</option></select></label><label>Mensaje<textarea name="body" rows={4} required /></label><label>Enlace Drive opcional<input name="linkUrl" type="url" placeholder="https://…" /></label><button className="primary-button" type="submit">Publicar aviso o enlace</button></form><div className="tool-divider"><span>o subir archivo</span></div><form onSubmit={upload}><label>PDF, PPT, DOCX, XLSX, ZIP o imagen<input name="file" type="file" required /></label><button className="secondary-button" type="submit">Subir al curso</button></form>{status.text && <p className={`tool-status ${status.tone}`} role="status">{status.text}</p>}</aside>}
    </section>
  );
}

function ProgressSection({ user, completed, students }: { user: User; completed: number; students: ClassroomStudent[] }) {
  const canTeach = user.role === "teacher" || user.role === "owner";
  return (
    <section className="progress-view">
      {!canTeach && <div className="personal-progress"><strong>{completed}/{units.length}</strong><div><h3>Resultados de aprendizaje completados</h3><p>Tu avance se guarda en tu cuenta y aparece en todos tus dispositivos.</p><div className="big-progress"><Bar ratio={completed / units.length} /></div></div></div>}
      {canTeach && <div className="progress-table"><div className="progress-table-head"><span>Estudiante</span><span>Avance</span><span>Última actividad</span></div>{students.length === 0 && <p className="empty-row">Los estudiantes aparecerán cuando creen su cuenta institucional.</p>}{students.map((student) => <div className="progress-table-row" key={student.userId}><span><b>{student.name}</b><small>{student.email}</small></span><span><b>{student.completed}/{student.total}</b><i><motion.em animate={{ scaleX: student.total ? student.completed / student.total : 0 }} initial={{ scaleX: 0 }} transition={{ duration: 0.6, ease }} /></i></span><span>{student.updatedAt ? formatDate(student.updatedAt) : "Sin actividad"}</span></div>)}</div>}
    </section>
  );
}

function PeopleSection({ user, students }: { user: User; students: ClassroomStudent[] }) {
  return (
    <section>
      <div className="people-grid"><article><span className="avatar large">PE</span><div><strong>Profesor de Estática</strong><small>Docente · Coordinación del curso</small></div></article><article><Avatar large email={user.email} name={user.name} /><div><strong>{user.name}</strong><small>{roleLabel(user.role)} · {user.email}</small></div></article>{students.filter((student) => student.email.toLowerCase() !== user.email.toLowerCase()).map((student) => <article key={student.userId}><span className="avatar large">{initials(student.name)}</span><div><strong>{student.name}</strong><small>Estudiante · {student.email}</small></div></article>)}</div>
    </section>
  );
}

function kindLabel(kind: ClassroomPost["kind"]) {
  return kind === "assessment" ? "Evaluación" : kind === "guide" ? "Guía" : kind === "resource" ? "Recurso" : "Aviso";
}

function tabTitle(tab: "home" | "materials" | "progress" | "people") {
  return tab === "materials" ? "Materiales del curso" : tab === "progress" ? "Progreso y monitoreo" : tab === "people" ? "Participantes" : "Portada del curso";
}

function studentCount(total: number) {
  if (total === 0) return "Sin estudiantes aún";
  return `${total} inscrito${total > 1 ? "s" : ""}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function fileExtension(value: string) {
  const extension = value.split(".").pop()?.toUpperCase() ?? "DOC";
  return extension.slice(0, 4);
}
