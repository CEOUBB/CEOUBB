import { useMemo, useState, type Dispatch } from "react";
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ChartBar,
  Check,
  CheckCircle,
  Clock,
  DownloadSimple,
  Eye,
  FileText,
  FloppyDisk,
  Funnel,
  Lock,
  MagnifyingGlass,
  PaperPlaneTilt,
  PencilSimple,
  Plus,
  Tray,
  Users,
  Warning,
} from "@phosphor-icons/react";
import type { TeacherView } from "./TeacherWorkspacePreview";
import {
  ACTIVITY_LIFECYCLE_LABELS,
  SUBMISSION_STATE_LABELS,
  formatDateTime,
  gradebookOverview,
  paginateSubmissions,
  prioritizedWork,
  teacherCounters,
  validateReview,
  type ReviewFilter,
  type RubricPreview,
  type SubmissionPreview,
  type TeacherActivityPreview,
  type TeacherPreviewAction,
  type TeacherPreviewState,
} from "./teacher-preview-model";
import styles from "./teacher-workspace-preview.module.css";

type HomePanelProps = {
  state: TeacherPreviewState;
  onNavigate: (view: TeacherView, activityId?: string) => void;
  onEditActivity: (activity: TeacherActivityPreview) => void;
};

type ActivitiesPanelProps = {
  state: TeacherPreviewState;
  onCreate: () => void;
  onEdit: (activity: TeacherActivityPreview) => void;
  onNavigate: (view: TeacherView, activityId?: string) => void;
  onStudentPreview: () => void;
};

type ReviewPanelProps = {
  state: TeacherPreviewState;
  dispatch: Dispatch<TeacherPreviewAction>;
  onAnnouncement: (message: string) => void;
  onStudentPreview: (submissionId?: string) => void;
};

const COUNTER_ICONS = { pending: Tray, missing: Users, drafts: FileText } as const;
const FILTER_OPTIONS: Array<{ value: ReviewFilter; label: string }> = [
  { value: "all", label: "Todos los estados" },
  { value: "submitted", label: "Entregadas" },
  { value: "late", label: "Atrasadas" },
  { value: "review_draft", label: "Corrección en borrador" },
  { value: "graded", label: "Calificadas" },
  { value: "missing", label: "Sin entrega" },
];
const PROGRESS_STEPS = ["Diseñar", "Programar", "Recibir", "Corregir", "Publicar"];
const RUBRIC_ROWS = [
  ["planteamiento", "Planteamiento", 2.2],
  ["desarrollo", "Desarrollo", 2.2],
  ["comunicacion", "Comunicación", 2.1],
] as const;

function ProgressFlow({ state }: { state: TeacherPreviewState }) {
  const activity = state.activities.find((item) => item.id === "control-1") ?? state.activities[0];
  const submissions = state.submissions.filter((submission) => submission.activityId === activity.id);
  const graded = submissions.filter((submission) => submission.state === "graded").length;
  const percentage = submissions.length ? Math.round((graded / submissions.length) * 100) : 0;

  return (
    <section className={styles.featurePanel} aria-labelledby="flujo-docente-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="flujo-docente-title">Flujo docente unificado</h2>
          <p>{activity.title}</p>
        </div>
        <span className={styles.statusPill} data-tone="review">En corrección</span>
      </div>
      <ol className={styles.flowSteps} aria-label="Etapas de la actividad">
        {PROGRESS_STEPS.map((step, index) => (
          <li data-state={index < 3 ? "done" : index === 3 ? "active" : "pending"} key={step}>
            <span>{index < 3 ? <Check size={13} weight="bold" aria-hidden="true" /> : index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <div className={styles.progressMeta}><span>Calificaciones publicadas</span><strong>{graded} de {submissions.length}</strong></div>
      <div className={styles.progressTrack} role="progressbar" aria-label="Calificaciones publicadas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <span style={{ width: `${percentage}%` }} />
      </div>
      <div className={styles.safetyNote}>
        <Lock size={18} weight="fill" aria-hidden="true" />
        <span>Las notas y comentarios permanecen privados hasta que el docente los publica.</span>
      </div>
    </section>
  );
}

// Implements: REQ-DOC-04, REQ-DOC-07
export function HomePanel({ state, onNavigate, onEditActivity }: HomePanelProps) {
  const counters = teacherCounters(state);
  const work = prioritizedWork(state);
  const nextActivity = state.activities.filter((activity) => ["open", "scheduled"].includes(activity.lifecycle)).sort((left, right) => Date.parse(left.dueAt) - Date.parse(right.dueAt))[0];

  return (
    <div className={styles.viewStack}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Buenos días, docente</h1>
          <p>Tu sección está ordenada por lo que requiere atención primero.</p>
        </div>
        <span className={styles.sectionChip}>{state.section.name} · {state.section.section}</span>
      </header>

      <section className={styles.metricsGrid} aria-label="Resumen de trabajo docente">
        {counters.map((counter) => {
          const Icon = COUNTER_ICONS[counter.id];
          return (
            <button className={styles.metricCard} type="button" onClick={() => onNavigate(counter.id === "drafts" ? "activities" : "review")} key={counter.id}>
              <span className={styles.metricIcon}><Icon size={20} weight="duotone" aria-hidden="true" /></span>
              <span><small>{counter.label}</small><strong>{counter.value}</strong><em>{counter.detail}</em></span>
            </button>
          );
        })}
      </section>

      <div className={styles.homeGrid}>
        <ProgressFlow state={state} />
        <section className={styles.featurePanel} aria-labelledby="proxima-entrega-title">
          <div className={styles.panelHeading}>
            <div><h2 id="proxima-entrega-title">Próximo vencimiento</h2><p>Visible para estudiantes</p></div>
            <CalendarBlank size={22} weight="duotone" aria-hidden="true" />
          </div>
          {nextActivity ? (
            <div className={styles.deadlineCard}>
              <span className={styles.deadlineDate}><strong>18</strong><small>AGO</small></span>
              <div><h3>{nextActivity.title}</h3><p>{formatDateTime(nextActivity.dueAt)}</p></div>
              <button className={styles.utilityButton} type="button" onClick={() => onEditActivity(nextActivity)}><PencilSimple size={17} aria-hidden="true" /> Editar</button>
            </div>
          ) : <p className={styles.emptyCopy}>No hay vencimientos programados.</p>}
        </section>
      </div>

      <section className={styles.featurePanel} aria-labelledby="acciones-docentes-title">
        <div className={styles.panelHeading}>
          <div><h2 id="acciones-docentes-title">Trabajo pendiente</h2><p>Ordenado por urgencia y contexto de la sección.</p></div>
          <button className={styles.textButton} type="button" onClick={() => onNavigate("activities")}>Ver todas las actividades</button>
        </div>
        <div className={styles.workList}>
          {work.map((item, index) => (
            <button className={styles.workRow} type="button" onClick={() => onNavigate(item.kind === "review" ? "review" : "activities", item.activityId)} key={item.id}>
              <span className={styles.workRank}>{String(index + 1).padStart(2, "0")}</span>
              <span><strong>{item.title}</strong><small>{item.detail}</small></span>
              <span className={styles.workWhen}>{item.kind === "review" ? "Corregir ahora" : formatDateTime(item.dueAt)} <CaretRight size={15} aria-hidden="true" /></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// Implements: REQ-DOC-04, REQ-DOC-05
export function ActivitiesPanel({ state, onCreate, onEdit, onNavigate, onStudentPreview }: ActivitiesPanelProps) {
  const [query, setQuery] = useState("");
  const [lifecycle, setLifecycle] = useState<"all" | TeacherActivityPreview["lifecycle"]>("all");
  const filtered = state.activities.filter((activity) => (
    (lifecycle === "all" || activity.lifecycle === lifecycle)
      && activity.title.toLocaleLowerCase("es-CL").includes(query.trim().toLocaleLowerCase("es-CL"))
  ));

  return (
    <div className={styles.viewStack}>
      <header className={styles.pageHeader}>
        <div><h1>Actividades</h1><p>Fechas, evaluación y publicación reunidas en una sola mesa.</p></div>
        <button className={styles.primaryButton} type="button" onClick={onCreate}><Plus size={18} weight="bold" aria-hidden="true" /> Nueva actividad</button>
      </header>
      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <span className={styles.srOnly}>Buscar actividad</span>
          <MagnifyingGlass size={18} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar actividad" type="search" />
        </label>
        <label className={styles.selectField}>
          <Funnel size={17} aria-hidden="true" />
          <span className={styles.srOnly}>Filtrar por estado</span>
          <select value={lifecycle} onChange={(event) => setLifecycle(event.target.value as typeof lifecycle)}>
            <option value="all">Todos los estados</option>
            <option value="draft">Borradores</option>
            <option value="scheduled">Programadas</option>
            <option value="open">Abiertas</option>
            <option value="closed">En corrección</option>
            <option value="archived">Archivadas</option>
          </select>
        </label>
        <button className={styles.utilityButton} type="button" onClick={onStudentPreview}><Eye size={17} aria-hidden="true" /> Vista estudiante</button>
      </div>
      <div className={styles.activityList}>
        {filtered.map((activity) => {
          const activitySubmissions = state.submissions.filter((submission) => submission.activityId === activity.id);
          const pending = activitySubmissions.filter((submission) => ["submitted", "late", "review_draft"].includes(submission.state)).length;
          return (
            <article className={styles.activityCard} key={activity.id}>
              <div className={styles.activityStripe} data-state={activity.lifecycle} />
              <div className={styles.activityBody}>
                <div className={styles.activityTitleRow}>
                  <div><span className={styles.activityUnit}>{activity.unit}</span><h2>{activity.title}</h2></div>
                  <span className={styles.statusPill} data-tone={activity.lifecycle}>{ACTIVITY_LIFECYCLE_LABELS[activity.lifecycle]}</span>
                </div>
                <p>{activity.instructions}</p>
                <dl className={styles.activityMeta}>
                  <div><dt>Vencimiento</dt><dd>{formatDateTime(activity.dueAt)}</dd></div>
                  <div><dt>Ponderación</dt><dd>{activity.gradeItemId ? `${activity.gradeWeight}%` : "Sin nota"}</dd></div>
                  <div><dt>Entregas</dt><dd>{activitySubmissions.length ? `${activitySubmissions.length} registradas` : "Aún no abiertas"}</dd></div>
                </dl>
              </div>
              <div className={styles.activityActions}>
                {pending > 0 && <button className={styles.utilityButton} type="button" onClick={() => onNavigate("review", activity.id)}><Tray size={17} aria-hidden="true" /> Corregir {pending}</button>}
                <button className={styles.utilityButton} type="button" onClick={() => onEdit(activity)}><PencilSimple size={17} aria-hidden="true" /> Editar</button>
              </div>
            </article>
          );
        })}
        {!filtered.length && <div className={styles.emptyState}><MagnifyingGlass size={28} aria-hidden="true" /><strong>No encontramos actividades</strong><span>Prueba con otro nombre o estado.</span></div>}
      </div>
    </div>
  );
}

function ReviewEditor({ state, submission, dispatch, onAnnouncement, onStudentPreview }: ReviewPanelProps & { submission: SubmissionPreview | undefined }) {
  const savedReview = submission ? state.reviews[submission.id] : undefined;
  const [grade, setGrade] = useState(() => savedReview?.grade?.toString().replace(".", ",") ?? "");
  const [feedback, setFeedback] = useState(() => savedReview?.feedback ?? "");
  const [rubric, setRubric] = useState<RubricPreview>(() => savedReview?.rubric ?? { planteamiento: 0, desarrollo: 0, comunicacion: 0 });
  const [errors, setErrors] = useState<ReturnType<typeof validateReview>>({});
  const parsedGrade = Number(grade.replace(",", "."));

  const saveDraft = () => {
    if (!submission || submission.state === "missing") {
      setErrors({ submission: "No existe una entrega disponible para corregir." });
      return;
    }
    dispatch({ type: "save_review_draft", submissionId: submission.id, grade: Number.isFinite(parsedGrade) ? parsedGrade : null, feedback, rubric });
    setErrors({});
    onAnnouncement(`Corrección de ${submission.studentAlias} guardada como borrador privado.`);
  };

  const publish = () => {
    const nextErrors = validateReview(submission, Number.isFinite(parsedGrade) ? parsedGrade : null, feedback);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !submission) return;
    dispatch({ type: "publish_review", submissionId: submission.id, grade: parsedGrade, feedback, rubric });
    onAnnouncement(`Nota y retroalimentación de ${submission.studentAlias} publicadas juntas.`);
  };

  if (!submission) return <div className={styles.emptyState}><Tray size={28} aria-hidden="true" /><strong>No hay entregas en esta página</strong><span>Cambia el filtro para continuar.</span></div>;

  return (
    <section className={styles.reviewEditor} aria-labelledby="correccion-title">
      <div className={styles.editorHeader}>
        <div><span className={styles.studentAlias}>{submission.studentAlias}</span><h2 id="correccion-title">Mesa de corrección</h2></div>
        <span className={styles.statusPill} data-tone={submission.state}>{SUBMISSION_STATE_LABELS[submission.state]}</span>
      </div>
      {errors.submission && <p className={styles.formError} role="alert"><Warning size={17} weight="fill" aria-hidden="true" />{errors.submission}</p>}
      <div className={styles.reviewColumns}>
        <section className={styles.documentPreview} aria-label="Entrega ficticia">
          <div className={styles.documentBar}><FileText size={18} aria-hidden="true" /><strong>{submission.fileName ?? "Sin archivo"}</strong><span>PDF ficticio</span></div>
          {submission.state === "missing" ? (
            <div className={styles.documentEmpty}><Warning size={30} aria-hidden="true" /><strong>Sin entrega</strong><span>No se puede calificar hasta recibir un trabajo.</span></div>
          ) : (
            <div className={styles.documentSheet} aria-hidden="true">
              <span className={styles.documentTitle} />
              <span /><span /><span className={styles.shortLine} />
              <div className={styles.fakeDiagram}><i /><i /><i /></div>
              <span /><span className={styles.shortLine} /><span />
            </div>
          )}
        </section>
        <section className={styles.feedbackPanel} aria-label="Nota y retroalimentación">
          <div className={styles.rubricBlock}>
            <div className={styles.subheading}><h3>Rúbrica simple</h3><span>6,5 puntos sugeridos</span></div>
            {RUBRIC_ROWS.map(([key, label, max]) => (
              <label className={styles.rubricRow} key={key}>
                <span>{label}<small>máx. {String(max).replace(".", ",")}</small></span>
                <input min="0" max={max} step="0.1" type="number" value={rubric[key]} onChange={(event) => { const value = event.currentTarget.valueAsNumber; setRubric((current) => ({ ...current, [key]: Number.isFinite(value) ? value : 0 })); }} disabled={submission.state === "missing"} />
              </label>
            ))}
          </div>
          <label className={styles.fieldLabel}>
            <span>Nota final <small>Escala 1,0–7,0</small></span>
            <input className={styles.gradeInput} inputMode="decimal" value={grade} onChange={(event) => setGrade(event.target.value)} aria-invalid={Boolean(errors.grade)} aria-describedby={errors.grade ? "review-grade-error" : undefined} disabled={submission.state === "missing"} />
          </label>
          {errors.grade && <p className={styles.fieldError} id="review-grade-error" role="alert">{errors.grade}</p>}
          <label className={styles.fieldLabel}>
            <span>Retroalimentación <small>Se publica junto con la nota</small></span>
            <textarea rows={5} value={feedback} onChange={(event) => setFeedback(event.target.value)} aria-invalid={Boolean(errors.feedback)} aria-describedby={errors.feedback ? "review-feedback-error" : undefined} disabled={submission.state === "missing"} />
          </label>
          {errors.feedback && <p className={styles.fieldError} id="review-feedback-error" role="alert">{errors.feedback}</p>}
          <div className={styles.editorActions}>
            <button className={styles.utilityButton} type="button" onClick={saveDraft} disabled={submission.state === "missing"}><FloppyDisk size={17} aria-hidden="true" /> Guardar borrador</button>
            <button className={styles.primaryButton} type="button" onClick={publish} disabled={submission.state === "missing"}><PaperPlaneTilt size={17} weight="fill" aria-hidden="true" /> Publicar calificación</button>
          </div>
          <button className={styles.textButton} type="button" onClick={() => onStudentPreview(submission.id)}><Eye size={17} aria-hidden="true" /> Comprobar Vista estudiante</button>
          {savedReview?.history.length ? <p className={styles.historyLine}><Clock size={15} aria-hidden="true" /> {savedReview.history.length} evento{savedReview.history.length === 1 ? "" : "s"} en el historial simulado</p> : null}
        </section>
      </div>
    </section>
  );
}

// Implements: REQ-DOC-08, REQ-DOC-09, REQ-DOC-10
export function ReviewPanel({ state, dispatch, onAnnouncement, onStudentPreview }: ReviewPanelProps) {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const activities = state.activities.filter((activity) => state.submissions.some((submission) => submission.activityId === activity.id));
  const pageData = useMemo(() => paginateSubmissions(state.submissions, state.selectedActivityId, filter, query, page), [filter, page, query, state.selectedActivityId, state.submissions]);
  const selected = state.submissions.find((submission) => submission.id === state.selectedSubmissionId && submission.activityId === state.selectedActivityId) ?? pageData.items[0];
  const selectedActivity = state.activities.find((activity) => activity.id === state.selectedActivityId);

  const chooseActivity = (activityId: string) => {
    dispatch({ type: "select_activity", activityId });
    const first = state.submissions.find((submission) => submission.activityId === activityId);
    if (first) dispatch({ type: "select_submission", submissionId: first.id });
    setPage(1);
  };

  return (
    <div className={styles.viewStack}>
      <header className={styles.pageHeader}>
        <div><h1>Por corregir</h1><p>Entrega, rúbrica, nota y feedback sin perder el contexto de la actividad.</p></div>
        <span className={styles.sectionChip}>{pageData.total} resultado{pageData.total === 1 ? "" : "s"}</span>
      </header>
      <div className={styles.reviewToolbar}>
        <label className={styles.selectFieldWide}><span>Actividad</span><select value={state.selectedActivityId} onChange={(event) => chooseActivity(event.target.value)}>{activities.map((activity) => <option value={activity.id} key={activity.id}>{activity.title}</option>)}</select></label>
        <label className={styles.searchField}><span className={styles.srOnly}>Buscar estudiante ficticio</span><MagnifyingGlass size={18} aria-hidden="true" /><input type="search" placeholder="Buscar alias" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label>
        <label className={styles.selectField}><Funnel size={17} aria-hidden="true" /><span className={styles.srOnly}>Filtrar entregas</span><select value={filter} onChange={(event) => { setFilter(event.target.value as ReviewFilter); setPage(1); }}>{FILTER_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
      </div>
      <section className={styles.queuePanel} aria-labelledby="cola-entregas-title">
        <div className={styles.panelHeading}>
          <div><h2 id="cola-entregas-title">Cola de entregas</h2><p>{selectedActivity?.title ?? "Actividad"} · página {pageData.page} de {pageData.pageCount}</p></div>
          <span className={styles.statusPill} data-tone="review">{pageData.total} en el filtro</span>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.submissionTable}>
            <thead><tr><th>Estudiante</th><th>Entrega</th><th>Estado</th><th>Nota</th><th><span className={styles.srOnly}>Acción</span></th></tr></thead>
            <tbody>
              {pageData.items.map((submission) => {
                const review = state.reviews[submission.id];
                return (
                  <tr data-selected={selected?.id === submission.id} key={submission.id}>
                    <td><span className={styles.aliasAvatar} aria-hidden="true">{submission.studentAlias.slice(-2)}</span><strong>{submission.studentAlias}</strong></td>
                    <td>{submission.submittedAt ? formatDateTime(submission.submittedAt) : "—"}</td>
                    <td><span className={styles.statusPill} data-tone={submission.state}>{SUBMISSION_STATE_LABELS[submission.state]}</span></td>
                    <td className={styles.numericCell}>{review?.grade ? review.grade.toFixed(1).replace(".", ",") : "—"}</td>
                    <td><button className={styles.rowButton} type="button" onClick={() => dispatch({ type: "select_submission", submissionId: submission.id })}>{selected?.id === submission.id ? "Abierta" : "Corregir"}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={styles.pagination}>
          <button className={styles.iconButton} type="button" aria-label="Página anterior" disabled={pageData.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><CaretLeft size={18} aria-hidden="true" /></button>
          <span>Página {pageData.page} de {pageData.pageCount}</span>
          <button className={styles.iconButton} type="button" aria-label="Página siguiente" disabled={pageData.page >= pageData.pageCount} onClick={() => setPage((value) => Math.min(pageData.pageCount, value + 1))}><CaretRight size={18} aria-hidden="true" /></button>
        </div>
      </section>
      <ReviewEditor key={selected?.id ?? "empty"} state={state} submission={selected} dispatch={dispatch} onAnnouncement={onAnnouncement} onStudentPreview={onStudentPreview} />
    </div>
  );
}

// Implements: REQ-DOC-04, REQ-DOC-10
export function GradebookPanel({ state }: { state: TeacherPreviewState }) {
  const overview = gradebookOverview(state);

  return (
    <div className={styles.viewStack}>
      <header className={styles.pageHeader}>
        <div><h1>Calificaciones</h1><p>Ponderaciones, borradores privados y publicación controlada para la sección.</p></div>
        <button className={styles.utilityButton} type="button"><DownloadSimple size={17} aria-hidden="true" /> Exportar simulación</button>
      </header>
      <section className={styles.gradeSummary} aria-label="Resumen del libro de calificaciones">
        <div className={styles.averageCard}><span>Promedio de notas publicadas</span><strong>{overview.average}</strong><small>Escala chilena 1,0–7,0</small></div>
        <div className={styles.gradeStat}><CheckCircle size={22} weight="duotone" aria-hidden="true" /><span><strong>{overview.gradedCount}</strong><small>Publicadas</small></span></div>
        <div className={styles.gradeStat}><Clock size={22} weight="duotone" aria-hidden="true" /><span><strong>{overview.pendingCount}</strong><small>Pendientes</small></span></div>
      </section>
      <section className={styles.featurePanel} aria-labelledby="ponderaciones-title">
        <div className={styles.panelHeading}>
          <div><h2 id="ponderaciones-title">Esquema de evaluación</h2><p>Los resultados provienen exclusivamente de los fixtures publicados.</p></div>
          <ChartBar size={23} weight="duotone" aria-hidden="true" />
        </div>
        <div className={styles.gradeItems}>
          {overview.items.map((item) => (
            <article className={styles.gradeItem} key={item.id}>
              <span className={styles.gradeWeight}>{item.weight}%</span>
              <div><h3>{item.name}</h3><p>{ACTIVITY_LIFECYCLE_LABELS[item.lifecycle]}</p></div>
              <div className={styles.gradeAverage}><small>Promedio</small><strong>{item.average ?? "—"}</strong></div>
            </article>
          ))}
        </div>
        <div className={styles.safetyNote}><Lock size={18} weight="fill" aria-hidden="true" /><span>Las correcciones en borrador no participan del promedio ni aparecen en la Vista estudiante.</span></div>
      </section>
    </div>
  );
}
