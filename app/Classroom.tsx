"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChartBar, Files, GraduationCap, House, Sigma, UsersThree } from "@phosphor-icons/react";
import { ClassroomFile, ClassroomPost, ClassroomState, ClassroomStudent, classroomFileUrl, deleteClassroomPost, editClassroomPost, moveClassroomPost, publishClassroomPost, renameClassroomFile, saveClassroomProgress, saveGradebook, saveSimulation, saveStudentScores, uploadClassroomFile, watchClassroom } from "../lib/firebase-classroom-client";
import { Course, DEFAULT_FOLDER, materialFolders } from "../lib/courses";
import { DEFAULT_EXEMPTION_GRADE, GradeItem, GradeScores, MAX_GRADE, MIN_GRADE, PASSING_GRADE, formatGrade, isValidGrade, requiredGrade, summarize } from "../lib/grades";
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

const UNIT_EQUATIONS: Record<string, ReactNode[]> = {
  estatica: [<Equilibrium key="ra1" symbol="F" />, <Equilibrium key="ra2" symbol="M" sub="O" />, friction, steiner],
};

const COVER_EQUATIONS: Record<string, ReactNode[]> = {
  estatica: [<Equilibrium key="fx" symbol="F" sub="x" />, <Equilibrium key="fy" symbol="F" sub="y" />, <Equilibrium key="mo" symbol="M" sub="O" />],
};

type Tab = "home" | "materials" | "grades" | "progress" | "people";
type Note = { text: string; tone: "info" | "ok" | "bad" };

const emptyClassroom: ClassroomState = { posts: [], files: [], students: [], ownProgress: 0, gradebook: [], exemption: null, officialScores: {}, simulation: {}, classScores: {} };

function Bar({ ratio }: { ratio: number }) {
  return <motion.span animate={{ scaleX: Math.min(1, Math.max(0, ratio)) }} initial={{ scaleX: 0 }} transition={{ duration: 0.6, ease }} />;
}

export default function Classroom({ course, user, goBack }: { course: Course; user: User; goBack: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const [classroom, setClassroom] = useState<ClassroomState>(emptyClassroom);
  const [status, setStatus] = useState<Note>({ text: "", tone: "info" });
  const note = (text: string, tone: Note["tone"] = "info") => setStatus({ text, tone });
  const canTeach = user.role === "teacher" || user.role === "owner";
  const { files, students, posts } = classroom;
  const units = course.units;
  const completed = classroom.ownProgress;

  useEffect(() => watchClassroom(course.id, canTeach, (patch) => setClassroom((current) => ({ ...current, ...patch })), (message) => note(message, "bad")), [course.id, canTeach]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab]);

  const updateProgress = async (next: number) => {
    setClassroom((current) => ({ ...current, ownProgress: next }));
    await saveClassroomProgress(course.id, next, units.length).catch((cause) => note(cause instanceof Error ? cause.message : "No se pudo guardar el progreso.", "bad"));
  };

  const publish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    note("Publicando…");
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    try {
      await publishClassroomPost(course.id, {
        title: String(form.get("title") ?? ""),
        body: String(form.get("body") ?? ""),
        kind: String(form.get("kind") ?? "notice"),
        folder: String(form.get("folder") ?? ""),
        linkUrl: String(form.get("linkUrl") ?? ""),
      });
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
    const form = new FormData(formElement);
    const file = form.get("file");
    if (!(file instanceof File)) return note("Selecciona un archivo.", "bad");
    try {
      await uploadClassroomFile(course.id, file, String(form.get("folder") ?? ""), (percent) => note(`Subiendo archivo… ${percent}%`));
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
      await editClassroomPost(course.id, post.id, { title, body });
      note("Publicación actualizada.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible modificarla.", "bad");
    }
  };

  const deletePost = async (post: ClassroomPost) => {
    if (!window.confirm(`¿Eliminar “${post.title}”?`)) return;
    try {
      await deleteClassroomPost(course.id, post.id, post.storagePath);
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
      await renameClassroomFile(course.id, file.id, name);
      note("Archivo renombrado.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible modificarlo.", "bad");
    }
  };

  const moveFile = async (file: ClassroomFile) => {
    const folder = window.prompt(`Carpeta del archivo (${materialFolders(course).join(", ")})`, file.folder);
    if (folder === null) return;
    try {
      await moveClassroomPost(course.id, file.id, folder);
      note("Archivo movido de carpeta.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible moverlo.", "bad");
    }
  };

  const deleteFile = async (file: ClassroomFile) => {
    if (!window.confirm(`¿Eliminar “${file.name}”?`)) return;
    try {
      await deleteClassroomPost(course.id, file.id, file.storagePath);
      note("Archivo eliminado.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible eliminarlo.", "bad");
    }
  };

  return (
    <div className="classroom-layout">
      <aside className="classroom-sidebar">
        <button className="back-button" onClick={goBack} type="button"><ArrowLeft size={15} /><span>Mis cursos</span></button>
        <div className="course-identity panel-navy"><span>{course.code}</span><h2>{course.name}</h2><p>Ingeniería Mecánica · {course.period.replace("Semestre ", "")}</p></div>
        <nav aria-label="Secciones del aula">
          <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")} type="button"><House size={18} />Portada del curso</button>
          <button className={tab === "people" ? "active" : ""} onClick={() => setTab("people")} type="button"><UsersThree size={18} />Participantes</button>
          <button className={tab === "grades" ? "active" : ""} onClick={() => setTab("grades")} type="button"><GraduationCap size={18} />Notas y ponderaciones</button>
          <button onClick={() => setTab("progress")} className={tab === "progress" ? "active" : ""} type="button"><ChartBar size={18} />Progreso y monitoreo</button>
          <button className={tab === "materials" ? "active" : ""} onClick={() => setTab("materials")} type="button"><Files size={18} />Materiales</button>
        </nav>
        <a className="sidebar-library" href="/biblioteca/index.html">Banco de certámenes <ArrowUpRight size={14} /></a>
      </aside>
      <main className="classroom-main">
        <header className="classroom-top"><div><span className="breadcrumb">Mis cursos / {course.name}</span>{tab !== "home" && <h1>{tabTitle(tab)}</h1>}</div><span className="role-badge">{roleLabel(user.role)}</span></header>
        <AnimatePresence initial={false} mode="wait">
        <Screen key={tab}>
        {tab === "home" && (
          <>
            <section className="course-cover panel-navy">
              <div><span className="eyebrow">{course.eyebrow}</span><h1>{course.headline}</h1><p>{course.summary}</p>{course.facts.length > 0 && <div className="cover-meta">{course.facts.map((fact) => <span key={fact}>{fact}</span>)}</div>}</div>
              {COVER_EQUATIONS[course.id] && <div className="equation-stack">{COVER_EQUATIONS[course.id].map((equation, index) => <span key={index}>{equation}</span>)}</div>}
            </section>
            <div className="classroom-columns">
              <section>
                <div className="section-title compact-title"><h2>Resultados de aprendizaje</h2></div>
                {units.length === 0 && <div className="empty-state"><strong>Este ramo aún no tiene resultados de aprendizaje cargados.</strong><p>Se agregan al registro del curso cuando el docente entrega el programa oficial.</p></div>}
                <motion.div animate="show" className="unit-grid" initial="hidden" variants={stagger}>{units.map((unit, index) => <motion.article key={unit.title} transition={{ duration: 0.45, ease }} variants={rise}><span className="unit-number">0{index + 1}</span><div><h3>{unit.title}</h3><p>{unit.subtitle}</p></div><strong>{UNIT_EQUATIONS[course.id]?.[index]}</strong>{!canTeach && <label className="unit-check"><input checked={index < completed} onChange={(event) => updateProgress(event.target.checked ? Math.max(completed, index + 1) : Math.min(completed, index))} type="checkbox" />Completado</label>}</motion.article>)}</motion.div>
              </section>
              <aside className="course-facts">
                <dl>
                  <div>
                    <dt>Coordinación</dt>
                    <dd><b>{course.teacher}</b><small>Cuenta docente institucional</small></dd>
                  </div>
                  <div>
                    <dt>{canTeach ? "Estudiantes" : "Tu avance"}</dt>
                    <dd>
                      <b>{canTeach ? studentCount(students.length) : units.length > 0 ? `${completed} de ${units.length} unidades` : "Sin unidades cargadas"}</b>
                      {!canTeach && units.length > 0 && <span className="mini-progress"><Bar ratio={completed / units.length} /></span>}
                    </dd>
                  </div>
                </dl>
              </aside>
            </div>
            <PostsSection posts={posts} user={user} editPost={editPost} deletePost={deletePost} />
          </>
        )}
        {tab === "materials" && <MaterialsSection course={course} files={files} user={user} canTeach={canTeach} publish={publish} upload={upload} openFile={openFile} renameFile={renameFile} moveFile={moveFile} deleteFile={deleteFile} status={status} />}
        {tab === "grades" && <GradesSection course={course} classroom={classroom} canTeach={canTeach} note={note} status={status} />}
        {tab === "progress" && <ProgressSection units={units.length} canTeach={canTeach} completed={completed} students={students} />}
        {tab === "people" && <PeopleSection course={course} user={user} students={students} />}
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
      {posts.length === 0 && <div className="empty-state"><strong>Todavía no hay avisos publicados.</strong><p>Cuando el docente publique un aviso, una guía o un dictamen aparecerá aquí.</p></div>}
      <div className="post-list">{posts.map((post) => { const canManage = Boolean(post.authorId) && (user.role === "owner" || post.authorEmail.toLowerCase() === user.email.toLowerCase()); return <article key={post.id}><span className={`post-kind ${post.kind}`}>{kindLabel(post.kind)}</span><div><h3>{post.title}</h3><p>{post.body}</p><footer><span>{post.authorName}</span><time>{formatDate(post.createdAt)}</time>{post.linkUrl && <a href={post.linkUrl} target="_blank" rel="noreferrer">Abrir recurso <ArrowUpRight size={12} /></a>}{canManage && <span className="content-actions"><button onClick={() => editPost(post)} type="button">Modificar</button><button onClick={() => deletePost(post)} type="button">Eliminar</button></span>}</footer></div></article>; })}</div>
    </section>
  );
}

function MaterialsSection({ course, files, user, canTeach, publish, upload, openFile, renameFile, moveFile, deleteFile, status }: { course: Course; files: ClassroomFile[]; user: User; canTeach: boolean; publish: (event: FormEvent<HTMLFormElement>) => void; upload: (event: FormEvent<HTMLFormElement>) => void; openFile: (file: ClassroomFile) => void; renameFile: (file: ClassroomFile) => void; moveFile: (file: ClassroomFile) => void; deleteFile: (file: ClassroomFile) => void; status: Note }) {
  const folders = useMemo(() => groupByFolder(course, files), [course, files]);
  return (
    <section className="materials-view">
      <div className="materials-list">
        <div className="section-title compact-title"><h2>Archivos compartidos</h2></div>
        <a className="material-row featured" href="/biblioteca/index.html"><span className="file-icon"><Sigma size={20} /></span><div><strong>Banco completo del ramo</strong><small>Certámenes, ejercicios resueltos, apuntes y material original</small></div><b>Abrir <ArrowRight size={14} /></b></a>
        {files.length === 0 && <div className="empty-state"><strong>Aún no hay archivos del docente.</strong><p>Cuando publique una guía, PPT, PDF o dictamen aparecerá aquí.</p></div>}
        {folders.map(([folder, items]) => (
          <details className="material-folder" key={folder} open>
            <summary><span>{folder}</span><b>{items.length} {items.length === 1 ? "archivo" : "archivos"}</b></summary>
            {items.map((file) => { const canManage = user.role === "owner" || file.authorEmail.toLowerCase() === user.email.toLowerCase(); return <div className="material-row" key={file.id}><span className="file-icon">{fileExtension(file.name)}</span><div><strong>{file.name}</strong><small>{file.authorName} · {formatBytes(file.size)} · {formatDate(file.createdAt)}</small></div><span className="material-actions"><button onClick={() => openFile(file)} type="button">Descargar</button>{canManage && <span className="content-actions"><button onClick={() => renameFile(file)} type="button">Modificar</button><button onClick={() => moveFile(file)} type="button">Mover</button><button onClick={() => deleteFile(file)} type="button">Eliminar</button></span>}</span></div>; })}
          </details>
        ))}
      </div>
      {canTeach && (
        <aside className="teacher-tools">
          <h2>Publicar en el aula</h2>
          <datalist id="folder-options">{materialFolders(course).map((folder) => <option key={folder} value={folder} />)}</datalist>
          <form onSubmit={publish}>
            <label>Título<input name="title" required /></label>
            <label>Tipo<select name="kind"><option value="notice">Aviso</option><option value="guide">Guía</option><option value="assessment">Dictamen o certamen</option><option value="resource">Recurso</option></select></label>
            <label>Carpeta<input name="folder" list="folder-options" placeholder={DEFAULT_FOLDER} /></label>
            <label>Mensaje<textarea name="body" rows={4} required /></label>
            <label>Enlace Drive opcional<input name="linkUrl" type="url" placeholder="https://…" /></label>
            <button className="primary-button" type="submit">Publicar aviso o enlace</button>
          </form>
          <div className="tool-divider"><span>o subir archivo</span></div>
          <form onSubmit={upload}>
            <label>PDF, PPT, DOCX, XLSX, ZIP o imagen<input name="file" type="file" required /></label>
            <label>Carpeta<input name="folder" list="folder-options" placeholder={DEFAULT_FOLDER} /></label>
            <button className="secondary-button" type="submit">Subir al curso</button>
          </form>
          {status.text && <p className={`tool-status ${status.tone}`} role="status">{status.text}</p>}
        </aside>
      )}
    </section>
  );
}

function GradesSection({ course, classroom, canTeach, note, status }: { course: Course; classroom: ClassroomState; canTeach: boolean; note: (text: string, tone?: Note["tone"]) => void; status: Note }) {
  const { gradebook, exemption } = classroom;
  if (canTeach) return <TeacherGrades course={course} classroom={classroom} note={note} status={status} />;
  return <StudentGrades course={course} gradebook={gradebook} exemption={exemption} officialScores={classroom.officialScores} simulation={classroom.simulation} note={note} status={status} />;
}

function StudentGrades({ course, gradebook, exemption, officialScores, simulation, note, status }: { course: Course; gradebook: GradeItem[]; exemption: number | null; officialScores: GradeScores; simulation: GradeScores; note: (text: string, tone?: Note["tone"]) => void; status: Note }) {
  const [typed, setTyped] = useState<Record<string, string> | null>(null);
  const draft = typed ?? Object.fromEntries(Object.entries(simulation).map(([id, score]) => [id, String(score)]));
  const setDraft = (update: (current: Record<string, string>) => Record<string, string>) => setTyped(update(draft));

  const scores: GradeScores = {};
  for (const item of gradebook) {
    const simulated = Number(draft[item.id]);
    if (isValidGrade(officialScores[item.id])) scores[item.id] = officialScores[item.id];
    else if (isValidGrade(simulated)) scores[item.id] = simulated;
  }

  const summary = summarize(gradebook, scores);
  const passing = requiredGrade(gradebook, scores, PASSING_GRADE);
  const exemptionTarget = exemption ?? DEFAULT_EXEMPTION_GRADE;
  const exempt = requiredGrade(gradebook, scores, exemptionTarget);

  const persist = async () => {
    const next: GradeScores = {};
    for (const [id, value] of Object.entries(draft)) {
      const score = Number(value);
      if (isValidGrade(score)) next[id] = score;
    }
    await saveSimulation(course.id, next).catch((cause) => note(cause instanceof Error ? cause.message : "No se pudo guardar la simulación.", "bad"));
  };

  if (gradebook.length === 0) {
    return <div className="empty-state"><strong>El docente aún no publica la ponderación del ramo.</strong><p>Cuando cargue las evaluaciones y sus porcentajes podrás ver tu promedio y simular la nota que necesitas.</p></div>;
  }

  return (
    <section className="grades-view">
      <div className="grades-table">
        <div className="grades-head"><span>Evaluación</span><span>Pondera</span><span>Nota oficial</span><span>Simulación</span></div>
        {gradebook.map((item) => (
          <div className="grades-row" key={item.id}>
            <span><b>{item.name}</b>{item.date && <small>{formatDay(item.date)}</small>}</span>
            <span className="grades-weight">{item.weight}%</span>
            <span className="grades-official">{isValidGrade(officialScores[item.id]) ? formatGrade(officialScores[item.id]) : "—"}</span>
            <span>
              <input
                aria-label={`Nota simulada de ${item.name}`}
                disabled={isValidGrade(officialScores[item.id])}
                max={MAX_GRADE}
                min={MIN_GRADE}
                onBlur={persist}
                onChange={(event) => setDraft((current) => ({ ...current, [item.id]: event.target.value }))}
                step="0.1"
                type="number"
                value={draft[item.id] ?? ""}
              />
            </span>
          </div>
        ))}
      </div>
      <aside className="grades-summary">
        <div className="grades-average">
          <strong>{summary.average === null ? "—" : formatGrade(summary.average)}</strong>
          <div><h3>{summary.complete ? "Nota final" : "Promedio de lo evaluado"}</h3><p>{summary.gradedWeight}% de {summary.totalWeight}% ya tiene nota</p></div>
        </div>
        <dl className="grades-targets">
          <TargetLine label={`Para aprobar con ${formatGrade(PASSING_GRADE)}`} target={passing} />
          <TargetLine label={`Para eximirte con ${formatGrade(exemptionTarget)}`} target={exempt} />
        </dl>
        <p className="grades-note">La simulación es tuya y privada. Las notas oficiales las carga el docente y no se pueden editar aquí.</p>
        {status.text && <p className={`tool-status ${status.tone}`} role="status">{status.text}</p>}
      </aside>
    </section>
  );
}

function TargetLine({ label, target }: { label: string; target: ReturnType<typeof requiredGrade> }) {
  const copy = target.state === "closed" ? "Ya no quedan evaluaciones pendientes."
    : target.state === "secured" ? "Asegurado con las notas actuales."
    : target.state === "impossible" ? `Ya no es alcanzable: necesitarías ${formatGrade(target.grade)}.`
    : `Necesitas ${formatGrade(target.grade)} en promedio en lo que queda.`;
  return (
    <div className={`grades-target ${target.state}`}>
      <dt>{label}</dt>
      <dd>{copy}</dd>
    </div>
  );
}

function TeacherGrades({ course, classroom, note, status }: { course: Course; classroom: ClassroomState; note: (text: string, tone?: Note["tone"]) => void; status: Note }) {
  const { gradebook, exemption, students, classScores } = classroom;
  const [draftItems, setDraftItems] = useState<GradeItem[] | null>(null);
  const [draftExempt, setDraftExempt] = useState<string | null>(null);
  const items = draftItems ?? gradebook;
  const exempt = draftExempt ?? String(exemption ?? DEFAULT_EXEMPTION_GRADE);
  const setItems = (update: (current: GradeItem[]) => GradeItem[]) => setDraftItems(update(items));

  const totalWeight = items.reduce((total, item) => total + item.weight, 0);

  const patch = (id: string, values: Partial<GradeItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...values } : item));

  const addItem = () => {
    const id = crypto.randomUUID();
    setItems((current) => [...current, { id, name: "", weight: 0, date: "" }]);
  };

  const save = async () => {
    const target = Number(exempt);
    note("Guardando ponderación…");
    try {
      await saveGradebook(course.id, items.filter((item) => item.name.trim() && item.weight > 0), isValidGrade(target) ? target : null);
      setDraftItems(null);
      setDraftExempt(null);
      note("Ponderación guardada. Los estudiantes ya la ven.", "ok");
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible guardar la ponderación.", "bad");
    }
  };

  const setScore = async (userId: string, itemId: string, value: string) => {
    const score = Number(value);
    const next = { ...classScores[userId] };
    if (isValidGrade(score)) next[itemId] = score;
    else delete next[itemId];
    try {
      await saveStudentScores(course.id, userId, next);
    } catch (cause) {
      note(cause instanceof Error ? cause.message : "No fue posible guardar la nota.", "bad");
    }
  };

  return (
    <section className="grades-teacher">
      <div className="section-title compact-title"><h2>Ponderación del ramo</h2></div>
      <div className="grades-editor">
        {items.length === 0 && <p className="empty-row">Agrega la primera evaluación del ramo.</p>}
        {items.map((item) => (
          <div className="grades-editor-row" key={item.id}>
            <label>Evaluación<input onChange={(event) => patch(item.id, { name: event.target.value })} value={item.name} /></label>
            <label>Pondera %<input max={100} min={0} onChange={(event) => patch(item.id, { weight: Number(event.target.value) })} type="number" value={item.weight} /></label>
            <label>Fecha<input onChange={(event) => patch(item.id, { date: event.target.value })} type="date" value={item.date} /></label>
            <button className="remove-row" onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))} type="button">Quitar</button>
          </div>
        ))}
        <div className="grades-editor-foot">
          <label>Nota de eximición<input max={MAX_GRADE} min={MIN_GRADE} onChange={(event) => setDraftExempt(event.target.value)} step="0.1" type="number" value={exempt} /></label>
          <span className={totalWeight === 100 ? "weight-total ok" : "weight-total"}>Suma {totalWeight}%</span>
          <button className="secondary-button" onClick={addItem} type="button">Agregar evaluación</button>
          <button className="primary-button" onClick={save} type="button">Guardar ponderación</button>
        </div>
      </div>
      <div className="section-title compact-title"><h2>Notas oficiales</h2></div>
      {gradebook.length === 0 && <div className="empty-state"><strong>Guarda primero la ponderación.</strong><p>Las columnas de notas aparecen cuando el ramo tiene evaluaciones definidas.</p></div>}
      {gradebook.length > 0 && (
        <div className="grades-matrix">
          <div className="grades-matrix-head"><span>Estudiante</span>{gradebook.map((item) => <span key={item.id}>{item.name}</span>)}<span>Promedio</span></div>
          {students.length === 0 && <p className="empty-row">Los estudiantes aparecerán cuando entren al aula con su cuenta institucional.</p>}
          {students.map((student) => {
            const scores = classScores[student.userId] ?? {};
            const summary = summarize(gradebook, scores);
            return (
              <div className="grades-matrix-row" key={student.userId}>
                <span><b>{student.name}</b><small>{student.email}</small></span>
                {gradebook.map((item) => (
                  <span key={item.id}>
                    <input
                      aria-label={`${item.name} de ${student.name}`}
                      defaultValue={isValidGrade(scores[item.id]) ? scores[item.id] : ""}
                      key={`${item.id}-${scores[item.id] ?? ""}`}
                      max={MAX_GRADE}
                      min={MIN_GRADE}
                      onBlur={(event) => setScore(student.userId, item.id, event.target.value)}
                      step="0.1"
                      type="number"
                    />
                  </span>
                ))}
                <span className="grades-official">{summary.average === null ? "—" : formatGrade(summary.average)}</span>
              </div>
            );
          })}
        </div>
      )}
      {status.text && <p className={`tool-status ${status.tone}`} role="status">{status.text}</p>}
    </section>
  );
}

function ProgressSection({ units, canTeach, completed, students }: { units: number; canTeach: boolean; completed: number; students: ClassroomStudent[] }) {
  return (
    <section className="progress-view">
      {!canTeach && units === 0 && <div className="empty-state"><strong>Este ramo aún no tiene resultados de aprendizaje cargados.</strong><p>Tu avance por unidad aparecerá cuando el curso publique su programa.</p></div>}
      {!canTeach && units > 0 && <div className="personal-progress"><strong>{completed}/{units}</strong><div><h3>Resultados de aprendizaje completados</h3><p>Tu avance se guarda en tu cuenta y aparece en todos tus dispositivos.</p><div className="big-progress"><Bar ratio={completed / units} /></div></div></div>}
      {canTeach && <div className="progress-table"><div className="progress-table-head"><span>Estudiante</span><span>Avance</span><span>Última actividad</span></div>{students.length === 0 && <p className="empty-row">Los estudiantes aparecerán cuando creen su cuenta institucional.</p>}{students.map((student) => <div className="progress-table-row" key={student.userId}><span><b>{student.name}</b><small>{student.email}</small></span><span><b>{student.completed}/{student.total}</b><i><motion.em animate={{ scaleX: student.total ? student.completed / student.total : 0 }} initial={{ scaleX: 0 }} transition={{ duration: 0.6, ease }} /></i></span><span>{student.updatedAt ? formatDate(student.updatedAt) : "Sin actividad"}</span></div>)}</div>}
    </section>
  );
}

function PeopleSection({ course, user, students }: { course: Course; user: User; students: ClassroomStudent[] }) {
  return (
    <section>
      <div className="people-grid"><article><span className="avatar large">{initials(course.name)}</span><div><strong>{course.teacher}</strong><small>Coordinación del curso</small></div></article><article><Avatar large email={user.email} name={user.name} /><div><strong>{user.name}</strong><small>{roleLabel(user.role)} · {user.email}</small></div></article>{students.filter((student) => student.email.toLowerCase() !== user.email.toLowerCase()).map((student) => <article key={student.userId}><span className="avatar large">{initials(student.name)}</span><div><strong>{student.name}</strong><small>Estudiante · {student.email}</small></div></article>)}</div>
    </section>
  );
}

function groupByFolder(course: Course, files: ClassroomFile[]) {
  const groups = new Map<string, ClassroomFile[]>();
  for (const folder of materialFolders(course)) groups.set(folder, []);
  for (const file of files) {
    const folder = file.folder || DEFAULT_FOLDER;
    if (!groups.has(folder)) groups.set(folder, []);
    groups.get(folder)!.push(file);
  }
  return [...groups].filter(([, items]) => items.length > 0);
}

function kindLabel(kind: ClassroomPost["kind"]) {
  return kind === "assessment" ? "Evaluación" : kind === "guide" ? "Guía" : kind === "resource" ? "Recurso" : "Aviso";
}

function tabTitle(tab: Tab) {
  return tab === "materials" ? "Materiales del curso" : tab === "grades" ? "Notas y ponderaciones" : tab === "progress" ? "Progreso y monitoreo" : tab === "people" ? "Participantes" : "Portada del curso";
}

function studentCount(total: number) {
  if (total === 0) return "Sin estudiantes aún";
  return `${total} inscrito${total > 1 ? "s" : ""}`;
}

const dateFormat = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" });

function formatDate(value: string) {
  return dateFormat.format(new Date(value));
}

function formatDay(value: string) {
  return dateFormat.format(new Date(`${value}T12:00:00`));
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function fileExtension(value: string) {
  const extension = value.split(".").pop()?.toUpperCase() ?? "DOC";
  return extension.slice(0, 4);
}
