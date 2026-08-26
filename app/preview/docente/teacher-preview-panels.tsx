import { useMemo, useState, type Dispatch } from "react";
import {
  CaretLeft,
  CaretRight,
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
  onCreate: () => void;
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
const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function formatGrade(grade: number | null | undefined) {
  return typeof grade === "number" ? grade.toFixed(1).replace(".", ",") : "sin nota";
}

function ActivityFlow({ state }: { state: TeacherPreviewState }) {
  const activity = state.activities.find((item) => item.id === "control-1") ?? state.activities[0];
  const submissions = state.submissions.filter(
    (submission) => submission.activityId === activity.id
  );
  const graded = submissions.filter((submission) => submission.state === "graded").length;
  const ratio = submissions.length ? graded / submissions.length : 0;

  return (
    <section className={styles.card} aria-labelledby="flujo-docente-title">
      <div className="section-title compact-title">
        <h2 id="flujo-docente-title">Flujo de la actividad</h2>
        <span className={styles.pill} data-tone="review">
          En corrección
        </span>
      </div>
      <p className="grades-note">
        {activity.title} · una sola definición alimenta agenda, entregas y libro de notas.
      </p>
      <ol className={styles.flowSteps} aria-label="Etapas de la actividad">
        {PROGRESS_STEPS.map((step, index) => (
          <li data-state={index < 3 ? "done" : index === 3 ? "active" : "pending"} key={step}>
            <span>
              {index < 3 ? <Check size={13} weight="bold" aria-hidden="true" /> : index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <div>
        {/* Implements: REQ-DELIB-02 */}
        <p className={styles.progressMeta}>
          <span>Calificaciones publicadas</span>
          <strong className="num">
            {graded} de {submissions.length}
          </strong>
        </p>
        <span
          className="big-progress"
          role="progressbar"
          aria-label="Calificaciones publicadas"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio * 100)}
        >
          <span style={{ transform: `scaleX(${ratio})` }} />
        </span>
      </div>
      <p className={styles.safetyNote}>
        <Lock size={18} weight="fill" aria-hidden="true" />
        Las notas y los comentarios permanecen privados hasta que el docente los publica.
      </p>
    </section>
  );
}

// Implements: REQ-DOC-04, REQ-DOC-07
export function HomePanel({ state, onNavigate, onEditActivity, onCreate }: HomePanelProps) {
  const counters = teacherCounters(state);
  const work = prioritizedWork(state);
  const nextActivity = state.activities
    .filter((activity) => ["open", "scheduled"].includes(activity.lifecycle))
    .sort((left, right) => Date.parse(left.dueAt) - Date.parse(right.dueAt))[0];
  const nextDue = nextActivity ? new Date(nextActivity.dueAt) : null;

  return (
    <section>
      <header className="page-head">
        <div>
          <h1>Buenos días, docente</h1>
          <p>
            {state.section.name} · {state.section.section} · {state.section.period}
          </p>
        </div>
        <button className="primary-button" type="button" onClick={onCreate}>
          <Plus size={18} weight="bold" aria-hidden="true" /> Crear actividad
        </button>
      </header>

      {nextActivity && nextDue && (
        <div className="next-strip" style={{ marginBottom: "var(--space-lg)" }}>
          <span className="next-strip-date">
            <span className="next-strip-day">{nextDue.getDate()}</span>
            <span className="next-strip-month">{MONTHS[nextDue.getMonth()]}</span>
          </span>
          <span className="next-strip-body">
            <span className="next-strip-line">
              <strong>{nextActivity.title}</strong>
            </span>
            <span className="next-strip-detail">
              Próximo vencimiento · {formatDateTime(nextActivity.dueAt)} · visible para estudiantes
            </span>
          </span>
          <span className="next-strip-end">
            <button
              className="next-strip-action"
              type="button"
              onClick={() => onEditActivity(nextActivity)}
            >
              <PencilSimple size={16} aria-hidden="true" /> Editar
            </button>
          </span>
        </div>
      )}

      <div className={styles.pulse}>
        {counters.map((counter) => (
          <button
            className={styles.pulseCell}
            data-tone={counter.id === "pending" ? "alert" : undefined}
            type="button"
            onClick={() => onNavigate(counter.id === "drafts" ? "activities" : "review")}
            key={counter.id}
          >
            <span>{counter.label}</span>
            <b className={`${styles.pulseValue} num`}>{counter.value}</b>
            <small>{counter.detail}</small>
          </button>
        ))}
      </div>

      <div className="classroom-columns" style={{ marginTop: "var(--space-lg)" }}>
        <ActivityFlow state={state} />

        <section
          className={`${styles.card} ${styles.cardFlush}`}
          aria-labelledby="trabajo-pendiente-title"
        >
          <div className="section-title compact-title">
            <h2 id="trabajo-pendiente-title">Trabajo pendiente</h2>
            <button
              className="course-action"
              type="button"
              onClick={() => onNavigate("activities")}
            >
              Ver actividades <CaretRight size={15} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.workList}>
            {work.map((item, index) => (
              <button
                className={styles.workRow}
                type="button"
                onClick={() =>
                  onNavigate(item.kind === "review" ? "review" : "activities", item.activityId)
                }
                key={item.id}
              >
                <span className={`${styles.workRank} num`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <span className={styles.workWhen}>
                  {item.kind === "review" ? "Corregir" : formatDateTime(item.dueAt)}
                  <CaretRight size={15} aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

// Implements: REQ-DOC-04, REQ-DOC-05
export function ActivitiesPanel({
  state,
  onCreate,
  onEdit,
  onNavigate,
  onStudentPreview,
}: ActivitiesPanelProps) {
  const [query, setQuery] = useState("");
  const [lifecycle, setLifecycle] = useState<"all" | TeacherActivityPreview["lifecycle"]>("all");
  const filtered = state.activities.filter(
    (activity) =>
      (lifecycle === "all" || activity.lifecycle === lifecycle) &&
      activity.title.toLocaleLowerCase("es-CL").includes(query.trim().toLocaleLowerCase("es-CL"))
  );

  return (
    <section>
      <header className="page-head">
        <div>
          <h1>Actividades</h1>
          <p>Fechas, evaluación y publicación reunidas en una sola mesa.</p>
        </div>
        <button className="primary-button" type="button" onClick={onCreate}>
          <Plus size={18} weight="bold" aria-hidden="true" /> Nueva actividad
        </button>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span className="sr-only">Buscar actividad</span>
          <MagnifyingGlass size={18} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar actividad"
            type="search"
          />
        </label>
        <label className={`${styles.field} ${styles.fieldNarrow}`}>
          <Funnel size={17} aria-hidden="true" />
          <span className="sr-only">Filtrar por estado</span>
          <select
            value={lifecycle}
            onChange={(event) => setLifecycle(event.target.value as typeof lifecycle)}
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borradores</option>
            <option value="scheduled">Programadas</option>
            <option value="open">Abiertas</option>
            <option value="closed">En corrección</option>
            <option value="archived">Archivadas</option>
          </select>
        </label>
        <button className="secondary-button" type="button" onClick={onStudentPreview}>
          <Eye size={17} aria-hidden="true" /> Vista estudiante
        </button>
      </div>

      <div className="post-list" style={{ marginTop: "var(--space-md)" }}>
        {filtered.map((activity) => {
          const activitySubmissions = state.submissions.filter(
            (submission) => submission.activityId === activity.id
          );
          const pending = activitySubmissions.filter((submission) =>
            ["submitted", "late", "review_draft"].includes(submission.state)
          ).length;
          return (
            <article key={activity.id}>
              <span className={styles.pill} data-tone={activity.lifecycle}>
                {ACTIVITY_LIFECYCLE_LABELS[activity.lifecycle]}
              </span>
              <div>
                <div className={styles.activityHead}>
                  <div>
                    <h3>{activity.title}</h3>
                    <small>{activity.unit}</small>
                  </div>
                  <span className="content-actions">
                    {pending > 0 && (
                      <button type="button" onClick={() => onNavigate("review", activity.id)}>
                        <Tray size={15} aria-hidden="true" /> Corregir {pending}
                      </button>
                    )}
                    <button type="button" onClick={() => onEdit(activity)}>
                      <PencilSimple size={15} aria-hidden="true" /> Editar
                    </button>
                  </span>
                </div>
                <p>{activity.instructions}</p>
                <dl className={styles.activityMeta}>
                  <div>
                    <dt>Vencimiento</dt>
                    <dd>{formatDateTime(activity.dueAt)}</dd>
                  </div>
                  <div>
                    <dt>Ponderación</dt>
                    <dd>{activity.gradeItemId ? `${activity.gradeWeight}%` : "Sin nota"}</dd>
                  </div>
                  <div>
                    <dt>Entregas</dt>
                    <dd>
                      {activitySubmissions.length
                        ? `${activitySubmissions.length} registradas`
                        : "Aún no abiertas"}
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          );
        })}
        {!filtered.length && (
          <div className="empty-state">
            <strong>No encontramos actividades</strong>
            <p>
              Ninguna actividad de la sección coincide con ese nombre o estado. Prueba con otro
              filtro.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function ReviewEditor({
  state,
  submission,
  dispatch,
  onAnnouncement,
  onStudentPreview,
}: ReviewPanelProps & { submission: SubmissionPreview | undefined }) {
  const savedReview = submission ? state.reviews[submission.id] : undefined;
  const [grade, setGrade] = useState(() => savedReview?.grade?.toString().replace(".", ",") ?? "");
  const [feedback, setFeedback] = useState(() => savedReview?.feedback ?? "");
  const [rubric, setRubric] = useState<RubricPreview>(
    () => savedReview?.rubric ?? { planteamiento: 0, desarrollo: 0, comunicacion: 0 }
  );
  const [errors, setErrors] = useState<ReturnType<typeof validateReview>>({});
  const parsedGrade = Number(grade.replace(",", "."));

  const saveDraft = () => {
    if (!submission || submission.state === "missing") {
      setErrors({ submission: "No existe una entrega disponible para corregir." });
      return;
    }
    dispatch({
      type: "save_review_draft",
      submissionId: submission.id,
      grade: Number.isFinite(parsedGrade) ? parsedGrade : null,
      feedback,
      rubric,
    });
    setErrors({});
    onAnnouncement(`Corrección de ${submission.studentAlias} guardada como borrador privado.`);
  };

  const publish = () => {
    const nextErrors = validateReview(
      submission,
      Number.isFinite(parsedGrade) ? parsedGrade : null,
      feedback
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !submission) return;
    dispatch({
      type: "publish_review",
      submissionId: submission.id,
      grade: parsedGrade,
      feedback,
      rubric,
    });
    onAnnouncement(`Nota y retroalimentación de ${submission.studentAlias} publicadas juntas.`);
  };

  if (!submission) {
    return (
      <div className="empty-state">
        <strong>No hay entregas en esta página</strong>
        <p>Cambia el filtro o vuelve a la primera página para continuar corrigiendo.</p>
      </div>
    );
  }

  return (
    <section aria-labelledby="correccion-title">
      <div className="section-title compact-title">
        <h2 id="correccion-title">Mesa de corrección · {submission.studentAlias}</h2>
        <span className={styles.pill} data-tone={submission.state}>
          {SUBMISSION_STATE_LABELS[submission.state]}
        </span>
      </div>

      <div className={styles.reviewGrid} style={{ marginTop: "var(--space-md)" }}>
        <section className={styles.documentPane} aria-label="Entrega ficticia">
          <div className={styles.documentBar}>
            <FileText size={18} aria-hidden="true" />
            <strong>{submission.fileName ?? "Sin archivo"}</strong>
            <span>PDF ficticio</span>
          </div>
          {submission.state === "missing" ? (
            <div className={styles.documentEmpty}>
              <Warning size={28} aria-hidden="true" />
              <strong>Sin entrega</strong>
              <p>No se puede calificar hasta recibir un trabajo del estudiante.</p>
            </div>
          ) : (
            <div className={styles.documentSheet} aria-hidden="true">
              <span className={styles.documentTitle} />
              <span />
              <span />
              <span className={styles.shortLine} />
              <div className={styles.fakeDiagram}>
                <i />
                <i />
                <i />
              </div>
              <span />
              <span className={styles.shortLine} />
              <span />
            </div>
          )}
        </section>

        <aside
          className={`teacher-tools ${styles.reviewForm}`}
          aria-label="Nota y retroalimentación"
        >
          <h2>Rúbrica y nota</h2>
          {errors.submission && (
            <p className={styles.formError} role="alert">
              <Warning size={17} weight="fill" aria-hidden="true" />
              {errors.submission}
            </p>
          )}
          <form onSubmit={(event) => event.preventDefault()}>
            <div className={styles.rubric}>
              {RUBRIC_ROWS.map(([key, label, max]) => (
                <label className={styles.rubricRow} key={key}>
                  <span>
                    {label}
                    <small>máx. {String(max).replace(".", ",")}</small>
                  </span>
                  <input
                    min="0"
                    max={max}
                    step="0.1"
                    type="number"
                    value={rubric[key]}
                    onChange={(event) => {
                      const value = event.currentTarget.valueAsNumber;
                      setRubric((current) => ({
                        ...current,
                        [key]: Number.isFinite(value) ? value : 0,
                      }));
                    }}
                    disabled={submission.state === "missing"}
                  />
                </label>
              ))}
            </div>

            <label>
              <span className={styles.fieldHead}>
                Nota final <small>Escala 1,0–7,0</small>
              </span>
              <input
                className={styles.gradeInput}
                inputMode="decimal"
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                aria-invalid={Boolean(errors.grade)}
                aria-describedby={errors.grade ? "review-grade-error" : undefined}
                disabled={submission.state === "missing"}
              />
            </label>
            {errors.grade && (
              <p className={styles.fieldError} id="review-grade-error" role="alert">
                {errors.grade}
              </p>
            )}

            <label>
              <span className={styles.fieldHead}>
                Retroalimentación <small>Se publica junto con la nota</small>
              </span>
              <textarea
                rows={5}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                aria-invalid={Boolean(errors.feedback)}
                aria-describedby={errors.feedback ? "review-feedback-error" : undefined}
                disabled={submission.state === "missing"}
              />
            </label>
            {errors.feedback && (
              <p className={styles.fieldError} id="review-feedback-error" role="alert">
                {errors.feedback}
              </p>
            )}

            <div className={styles.reviewActions}>
              <button
                className="secondary-button"
                type="button"
                onClick={saveDraft}
                disabled={submission.state === "missing"}
              >
                <FloppyDisk size={17} aria-hidden="true" /> Guardar borrador
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={publish}
                disabled={submission.state === "missing"}
              >
                <PaperPlaneTilt size={17} weight="fill" aria-hidden="true" /> Publicar
              </button>
            </div>
          </form>
          <button
            className={styles.linkButton}
            type="button"
            onClick={() => onStudentPreview(submission.id)}
          >
            <Eye size={17} aria-hidden="true" /> Comprobar Vista estudiante
          </button>
          {savedReview?.history.length ? (
            <p className={styles.historyLine}>
              <Clock size={15} aria-hidden="true" /> {savedReview.history.length} evento
              {savedReview.history.length === 1 ? "" : "s"} en el historial simulado
            </p>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

// Implements: REQ-DOC-08, REQ-DOC-09, REQ-DOC-10
export function ReviewPanel({
  state,
  dispatch,
  onAnnouncement,
  onStudentPreview,
}: ReviewPanelProps) {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const activities = state.activities.filter((activity) =>
    state.submissions.some((submission) => submission.activityId === activity.id)
  );
  const pageData = useMemo(
    () => paginateSubmissions(state.submissions, state.selectedActivityId, filter, query, page),
    [filter, page, query, state.selectedActivityId, state.submissions]
  );
  const selected =
    state.submissions.find(
      (submission) =>
        submission.id === state.selectedSubmissionId &&
        submission.activityId === state.selectedActivityId
    ) ?? pageData.items[0];
  const selectedActivity = state.activities.find(
    (activity) => activity.id === state.selectedActivityId
  );

  const chooseActivity = (activityId: string) => {
    dispatch({ type: "select_activity", activityId });
    const first = state.submissions.find((submission) => submission.activityId === activityId);
    if (first) dispatch({ type: "select_submission", submissionId: first.id });
    setPage(1);
  };

  return (
    <section>
      <header className="page-head">
        <div>
          <h1>Por corregir</h1>
          <p>Entrega, rúbrica, nota y retroalimentación sin perder el contexto de la actividad.</p>
        </div>
        <span className={styles.pill} data-tone="count">
          {pageData.total} resultado{pageData.total === 1 ? "" : "s"}
        </span>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.labelledField}>
          <span>Actividad</span>
          <span className={styles.field}>
            <select
              value={state.selectedActivityId}
              onChange={(event) => chooseActivity(event.target.value)}
            >
              {activities.map((activity) => (
                <option value={activity.id} key={activity.id}>
                  {activity.title}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className={styles.field}>
          <span className="sr-only">Buscar estudiante ficticio</span>
          <MagnifyingGlass size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar alias"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className={`${styles.field} ${styles.fieldNarrow}`}>
          <Funnel size={17} aria-hidden="true" />
          <span className="sr-only">Filtrar entregas</span>
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as ReviewFilter);
              setPage(1);
            }}
          >
            {FILTER_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section
        className={`${styles.card} ${styles.cardFlush}`}
        style={{ marginTop: "var(--space-md)" }}
        aria-labelledby="cola-entregas-title"
      >
        <div className="section-title compact-title">
          <h2 id="cola-entregas-title">Cola de entregas</h2>
          <span className="grades-note">
            {selectedActivity?.title ?? "Actividad"} · página {pageData.page} de{" "}
            {pageData.pageCount}
          </span>
        </div>
        <div className={styles.queue}>
          <table className={styles.queueTable}>
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Entrega</th>
                <th>Estado</th>
                <th>Nota</th>
                <th>
                  <span className="sr-only">Acción</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageData.items.map((submission) => {
                const review = state.reviews[submission.id];
                const current = selected?.id === submission.id;
                return (
                  <tr data-selected={current} key={submission.id}>
                    <td>
                      <span className="avatar" aria-hidden="true">
                        {submission.studentAlias.slice(-2)}
                      </span>
                      {submission.studentAlias}
                    </td>
                    <td>
                      {submission.submittedAt
                        ? formatDateTime(submission.submittedAt)
                        : "sin entrega"}
                    </td>
                    <td>
                      <span className={styles.pill} data-tone={submission.state}>
                        {SUBMISSION_STATE_LABELS[submission.state]}
                      </span>
                    </td>
                    <td className={styles.numericCell}>{formatGrade(review?.grade)}</td>
                    <td>
                      <button
                        className={styles.rowButton}
                        data-current={current}
                        type="button"
                        onClick={() =>
                          dispatch({ type: "select_submission", submissionId: submission.id })
                        }
                      >
                        {current ? "Abierta" : "Corregir"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={styles.pagination}>
          <button
            className="icon-button"
            type="button"
            aria-label="Página anterior"
            disabled={pageData.page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <CaretLeft size={18} aria-hidden="true" />
          </button>
          <span>
            Página {pageData.page} de {pageData.pageCount}
          </span>
          <button
            className="icon-button"
            type="button"
            aria-label="Página siguiente"
            disabled={pageData.page >= pageData.pageCount}
            onClick={() => setPage((value) => Math.min(pageData.pageCount, value + 1))}
          >
            <CaretRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>

      <div style={{ marginTop: "var(--space-lg)" }}>
        <ReviewEditor
          key={selected?.id ?? "empty"}
          state={state}
          submission={selected}
          dispatch={dispatch}
          onAnnouncement={onAnnouncement}
          onStudentPreview={onStudentPreview}
        />
      </div>
    </section>
  );
}

// Implements: REQ-DOC-04, REQ-DOC-10
export function GradebookPanel({ state }: { state: TeacherPreviewState }) {
  const overview = gradebookOverview(state);

  return (
    <section>
      <header className="page-head">
        <div>
          <h1>Calificaciones</h1>
          <p>Ponderaciones, borradores privados y publicación controlada para la sección.</p>
        </div>
        <button className="secondary-button" type="button">
          <DownloadSimple size={17} aria-hidden="true" /> Exportar simulación
        </button>
      </header>

      <div className="grades-summary">
        <div className="grades-average">
          <strong>{overview.average}</strong>
          <div>
            <h3>Promedio de notas publicadas</h3>
            <p>Escala chilena 1,0–7,0 · sólo entregas ya publicadas</p>
          </div>
        </div>
        <div className={styles.gradeStats}>
          <div>
            <CheckCircle size={20} weight="duotone" aria-hidden="true" />
            <strong>{overview.gradedCount}</strong> publicadas
          </div>
          <div>
            <Clock size={20} weight="duotone" aria-hidden="true" />
            <strong>{overview.pendingCount}</strong> pendientes
          </div>
        </div>
      </div>

      <section
        className="grades-table"
        style={{ marginTop: "var(--space-lg)" }}
        aria-labelledby="ponderaciones-title"
      >
        <div className="grades-head">
          <span id="ponderaciones-title">Esquema de evaluación</span>
          <span>Ponderación</span>
          <span>Estado</span>
          <span>Promedio</span>
        </div>
        {overview.items.map((item) => (
          <div className="grades-row" key={item.id}>
            <span>
              <b>{item.name}</b>
            </span>
            <span className={styles.weightChip}>{item.weight}%</span>
            <span className="grades-weight">{ACTIVITY_LIFECYCLE_LABELS[item.lifecycle]}</span>
            <span className="grades-official">{item.average ?? "sin nota"}</span>
          </div>
        ))}
      </section>

      <p className={styles.safetyNote} style={{ marginTop: "var(--space-md)" }}>
        <Lock size={18} weight="fill" aria-hidden="true" />
        Las correcciones en borrador no participan del promedio ni aparecen en la Vista estudiante.
      </p>
    </section>
  );
}
