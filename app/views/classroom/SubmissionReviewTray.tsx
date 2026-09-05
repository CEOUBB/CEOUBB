"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  CaretLeft,
  CaretRight,
  CheckCircle,
  ClipboardText,
  DownloadSimple,
  FileText,
  Funnel,
  MagnifyingGlass,
  Tray,
  UsersThree,
  Warning,
  X,
} from "@phosphor-icons/react";
import type { Course } from "../../../lib/courses";
import {
  classroomFileUrl,
  saveGradeFeedback,
  saveStudentScores,
  watchSectionSubmissions,
  type ClassroomState,
  type StudentSubmission,
} from "../../../lib/firebase-classroom-client";
import {
  MAX_GRADE_FEEDBACK_LENGTH,
  formatGrade,
  type GradeItem,
  type GradeScores,
} from "../../../lib/grades";
import { hapticTap } from "../../../lib/mobile-bridge";
import { formatBytes, formatDateTime } from "../../../lib/portal-utils";
import { paginateList } from "./classroom-utils";
import { EmptyState } from "./EmptyState";
import { RichText } from "./RichText";
import {
  REVIEW_FILTERS,
  SUBMISSION_STATE_LABELS,
  buildReviewQueue,
  createDeferredSave,
  filterReviewQueue,
  guidePosts,
  isPdfSubmission,
  isTypingTarget,
  parseGradeDraft,
  reviewProgress,
  stepIndex,
  type ReviewFilter,
  type ReviewRow,
} from "./submission-review-model";
import { DocumentPaneSkeleton } from "../ViewSkeletons";

/*
  El visor arrastra PDF.js y su worker: se descarga cuando el docente abre una
  entrega, nunca durante el arranque del aula.
*/
// Implements: REQ-REV-01 REQ-PERF-01
const PDFViewerPane = dynamic(
  () => import("./PDFViewerPane").then((module) => module.PDFViewerPane),
  { ssr: false, loading: () => <DocumentPaneSkeleton /> }
);

const QUEUE_PAGE_SIZE = 25;

type SaveState = "idle" | "saving" | "saved" | "error";

/** Escucha en tiempo real las entregas de la evaluación abierta en la bandeja. */
// Implements: REQ-REV-04
function useSectionSubmissions(courseId: string, evalId: string) {
  const [state, setState] = useState<{ key: string; items: StudentSubmission[]; error: string }>({
    key: `${courseId}:${evalId}`,
    items: [],
    error: "",
  });

  useEffect(() => {
    if (!evalId) return;
    const key = `${courseId}:${evalId}`;
    return watchSectionSubmissions(
      courseId,
      evalId,
      (items) => setState({ key, items, error: "" }),
      (message) => setState({ key, items: [], error: message })
    );
  }, [courseId, evalId]);

  const key = `${courseId}:${evalId}`;
  return state.key === key ? state : { key, items: [], error: "" };
}

/** Resuelve la URL descargable del archivo entregado por el estudiante abierto. */
// Implements: REQ-REV-01
function useSubmissionUrl(storagePath: string) {
  const [state, setState] = useState<{ path: string; url: string; failed: boolean }>({
    path: "",
    url: "",
    failed: false,
  });

  useEffect(() => {
    if (!storagePath) return;
    let active = true;
    classroomFileUrl(storagePath)
      .then((url) => active && setState({ path: storagePath, url, failed: false }))
      .catch(() => active && setState({ path: storagePath, url: "", failed: true }));
    return () => {
      active = false;
    };
  }, [storagePath]);

  return state.path === storagePath ? state : { path: storagePath, url: "", failed: false };
}

// Implements: REQ-REV-01 REQ-REV-02 REQ-REV-03 REQ-REV-04 REQ-REV-05
export function SubmissionReviewTray({
  course,
  classroom,
  readOnly,
  onClose,
}: {
  course: Course;
  classroom: ClassroomState;
  readOnly: boolean;
  onClose: () => void;
}) {
  const { gradebook, students, classScores, classFeedback, posts } = classroom;
  const [itemId, setItemId] = useState(gradebook[0]?.id ?? "");
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);

  const item: GradeItem | undefined =
    gradebook.find((entry) => entry.id === itemId) ?? gradebook[0];
  const evaluationId = item?.id ?? "";
  const { items: submissions, error: queueError } = useSectionSubmissions(course.id, evaluationId);

  const rows = useMemo(
    () =>
      buildReviewQueue(students, submissions, {
        itemId: evaluationId,
        dueDate: item?.date ?? "",
        classScores,
        classFeedback,
      }),
    [classFeedback, classScores, evaluationId, item?.date, students, submissions]
  );

  const filtered = useMemo(() => filterReviewQueue(rows, filter, query), [filter, query, rows]);
  const progress = useMemo(() => reviewProgress(rows), [rows]);

  const selectedIndex = Math.max(
    0,
    filtered.findIndex((row) => row.userId === selectedId)
  );
  const selected: ReviewRow | undefined = filtered[selectedIndex];
  const page = paginateList(
    filtered,
    Math.floor(selectedIndex / QUEUE_PAGE_SIZE) + 1,
    QUEUE_PAGE_SIZE
  );

  const select = useCallback((row: ReviewRow | undefined) => {
    if (!row) return;
    hapticTap();
    setSelectedId(row.userId);
  }, []);

  const move = useCallback(
    (step: number) => select(filtered[stepIndex(selectedIndex, filtered.length, step)]),
    [filtered, select, selectedIndex]
  );

  /*
    Los atajos aceleran la corrección secuencial, pero se ignoran por completo
    mientras el foco está en un campo editable para no mover de alumno a quien
    está redactando la retroalimentación.
  */
  // Implements: REQ-REV-03
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key !== "j" && key !== "k") return;
      event.preventDefault();
      move(key === "j" ? 1 : -1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [move]);

  const guides = useMemo(() => guidePosts(posts), [posts]);

  return (
    <section
      aria-labelledby="review-tray-title"
      className="review-tray"
      data-requirement="Implements: REQ-REV-01 REQ-REV-02 REQ-REV-03 REQ-REV-04 REQ-REV-05"
    >
      <header className="review-bar">
        <button
          className="publish-back"
          data-hardware-back="review"
          onClick={onClose}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={17} />
          Volver al aula
        </button>
        <div className="review-bar-context">
          <h1 id="review-tray-title">Bandeja de corrección</h1>
          <p>
            <span>{course.name}</span>
            <small className="num">
              {progress.graded.toLocaleString("es-CL")} de {progress.total.toLocaleString("es-CL")}{" "}
              calificadas · {progress.delivered.toLocaleString("es-CL")} entregas recibidas
            </small>
          </p>
        </div>
        {gradebook.length > 0 && (
          <label className="review-evaluation">
            <span className="sr-only">Evaluación por corregir</span>
            <select
              onChange={(event) => {
                setItemId(event.target.value);
                setSelectedId("");
              }}
              value={evaluationId}
            >
              {gradebook.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} · {entry.weight}%
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {gradebook.length === 0 ? (
        <div className="review-empty">
          <EmptyState
            icon={Tray}
            title="Guarda primero la ponderación del ramo"
            description="La bandeja corrige entregas por evaluación. Define las evaluaciones y sus porcentajes en la pestaña Notas para abrir la cola."
          />
        </div>
      ) : (
        <div className="review-workspace">
          <aside aria-label="Cola de entregas" className="review-queue">
            <div className="review-queue-tools">
              <div className="classroom-search-box">
                <MagnifyingGlass aria-hidden="true" size={16} />
                <input
                  aria-label="Buscar estudiante por nombre o correo"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar estudiante…"
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
              </div>
              <label className="review-filter">
                <Funnel aria-hidden="true" size={16} />
                <span className="sr-only">Filtrar por estado de entrega</span>
                <select
                  onChange={(event) => setFilter(event.target.value as ReviewFilter)}
                  value={filter}
                >
                  {REVIEW_FILTERS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {queueError && (
              <p className="tool-status bad" role="alert">
                {queueError}
              </p>
            )}

            {filtered.length === 0 ? (
              <p className="review-queue-empty" role="status">
                {students.length === 0
                  ? "Los estudiantes aparecerán cuando entren al aula con su cuenta institucional."
                  : "Ninguna entrega coincide con este filtro."}
              </p>
            ) : (
              <ul className="review-queue-list">
                {page.items.map((row) => (
                  <li key={row.userId}>
                    <button
                      aria-current={row.userId === selected?.userId ? "true" : undefined}
                      className="review-queue-row"
                      onClick={() => select(row)}
                      type="button"
                    >
                      <span className="review-queue-name">
                        <b>{row.name}</b>
                        <small>
                          {row.submittedAt
                            ? formatDateTime(row.submittedAt)
                            : "Nada recibido todavía"}
                        </small>
                      </span>
                      <span className="review-state" data-state={row.state}>
                        {SUBMISSION_STATE_LABELS[row.state]}
                      </span>
                      <span className="review-queue-grade num">
                        {row.grade === null ? "—" : formatGrade(row.grade)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <nav aria-label="Paginación de la cola" className="review-queue-pages">
              <button
                aria-label="Página anterior"
                className="pagination-btn"
                disabled={page.page <= 1}
                onClick={() => select(filtered[(page.page - 2) * QUEUE_PAGE_SIZE])}
                type="button"
              >
                <CaretLeft aria-hidden="true" size={15} />
              </button>
              <span className="num">
                {page.startIndex}–{page.endIndex} de {page.totalItems}
              </span>
              <button
                aria-label="Página siguiente"
                className="pagination-btn"
                disabled={page.page >= page.totalPages}
                onClick={() => select(filtered[page.page * QUEUE_PAGE_SIZE])}
                type="button"
              >
                <CaretRight aria-hidden="true" size={15} />
              </button>
            </nav>
          </aside>

          <div className="review-stage">
            <DocumentPane row={selected} />
            {guideOpen && item && (
              <GuidePanel
                guides={guides}
                item={item}
                onClose={() => setGuideOpen(false)}
                openAttachment={classroomFileUrl}
              />
            )}
          </div>

          <aside aria-label="Nota y retroalimentación" className="review-rail">
            {selected && item ? (
              <GradingPanel
                courseId={course.id}
                guideOpen={guideOpen}
                item={item}
                key={`${evaluationId}:${selected.userId}`}
                onGuideToggle={() => setGuideOpen((open) => !open)}
                onMove={move}
                position={{ index: selectedIndex, total: filtered.length }}
                readOnly={readOnly}
                row={selected}
                scores={classScores[selected.userId] ?? {}}
              />
            ) : (
              <p className="review-queue-empty" role="status">
                Elige una entrega de la cola para corregirla.
              </p>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

/*
  Panel del documento: sólo monta el visor cuando hay un PDF legible. Sin
  entrega, o con un archivo que PDF.js no abre, el docente recibe el estado real
  y la descarga directa en vez de un lienzo vacío.
*/
// Implements: REQ-REV-01
function DocumentPane({ row }: { row: ReviewRow | undefined }) {
  const { url, failed } = useSubmissionUrl(row?.storagePath ?? "");

  if (!row)
    return (
      <div className="review-doc review-doc-placeholder">
        <FileText aria-hidden="true" size={30} />
        <strong>Sin entrega abierta</strong>
        <p>Selecciona a un estudiante de la cola para leer su trabajo.</p>
      </div>
    );

  if (row.state === "missing" || !row.storagePath)
    return (
      <div className="review-doc review-doc-placeholder">
        <Warning aria-hidden="true" size={30} />
        <strong>{row.name} todavía no entrega</strong>
        <p>Puedes registrar la nota igual, pero no hay documento que revisar en esta evaluación.</p>
      </div>
    );

  return (
    <div className="review-doc" key={row.userId}>
      <div className="review-doc-file">
        <FileText aria-hidden="true" size={18} />
        <span>
          <b>{row.fileName}</b>
          <small className="num">
            {formatBytes(row.size)} · {formatDateTime(row.submittedAt)}
          </small>
          {/* Implements: REQ-TEAM-03, REQ-TEAM-04 */}
          {(row.teamSize > 1 || row.sha256) && (
            <small className="review-doc-trace">
              {row.teamSize > 1 && (
                <span>
                  <UsersThree aria-hidden="true" size={13} weight="fill" />
                  Equipo de <span className="num">{row.teamSize}</span>
                  {row.submittedByName ? ` · subió ${row.submittedByName}` : ""}
                </span>
              )}
              {row.sha256 && (
                <code className="num" title={`SHA-256: ${row.sha256}`}>
                  {row.sha256.slice(0, 12)}
                </code>
              )}
            </small>
          )}
        </span>
        {url ? (
          <a className="review-doc-download" download={row.fileName} href={url} rel="noopener">
            <DownloadSimple aria-hidden="true" size={16} />
            Descargar
          </a>
        ) : (
          <span className="review-doc-download is-pending">
            {failed ? "Enlace no disponible" : "Preparando enlace…"}
          </span>
        )}
      </div>
      {failed ? (
        <p className="review-doc-error" role="alert">
          <Warning aria-hidden="true" size={20} weight="fill" />
          No fue posible obtener el archivo desde el almacenamiento del ramo. Vuelve a intentarlo en
          unos segundos.
        </p>
      ) : !isPdfSubmission(row) ? (
        <p className="review-doc-error" role="status">
          <FileText aria-hidden="true" size={20} />
          <strong>{row.fileName}</strong> no es un PDF, así que se revisa fuera del visor. Descarga
          el archivo para abrirlo con la aplicación correspondiente.
        </p>
      ) : url ? (
        <PDFViewerPane fileName={row.fileName} url={url} />
      ) : (
        <p className="review-doc-loading">Abriendo la entrega…</p>
      )}
    </div>
  );
}

/*
  Nota y retroalimentación de la entrega abierta. La nota viaja al libro
  auditado cuando el campo queda validado y el comentario se guarda con retardo
  mientras se escribe, de modo que cambiar de alumno nunca pierde texto.
*/
// Implements: REQ-REV-02 REQ-REV-03 REQ-REV-05
function GradingPanel({
  courseId,
  guideOpen,
  item,
  onGuideToggle,
  onMove,
  position,
  readOnly,
  row,
  scores,
}: {
  courseId: string;
  guideOpen: boolean;
  item: GradeItem;
  onGuideToggle: () => void;
  onMove: (step: number) => void;
  position: { index: number; total: number };
  readOnly: boolean;
  row: ReviewRow;
  scores: GradeScores;
}) {
  /*
    La nota y el comentario son borradores editables sembrados con lo guardado.
    El panel se monta con la clave `evaluación:estudiante`, de modo que cambiar
    de alumno los reinicia sin efectos y sin pisar lo que el docente escribe
    mientras llega una actualización en tiempo real.
  */
  // Implements: REQ-REV-02
  const initialGrade = row.grade === null ? "" : formatGrade(row.grade);
  const initialFeedback = row.feedback;
  const [grade, setGrade] = useState(initialGrade);
  const [gradeError, setGradeError] = useState("");
  const [feedback, setFeedback] = useState(initialFeedback);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");

  const persistFeedback = useCallback(
    async (value: string) => {
      setState("saving");
      try {
        await saveGradeFeedback(courseId, row.userId, item.id, value);
        setState("saved");
        setError("");
      } catch (cause) {
        setState("error");
        setError(
          cause instanceof Error ? cause.message : "No fue posible guardar la retroalimentación."
        );
      }
    },
    [courseId, item.id, row.userId]
  );

  const saver = useRef<ReturnType<typeof createDeferredSave> | null>(null);
  const deferredSave = () =>
    (saver.current ??= createDeferredSave((value) => void persistFeedback(value)));

  /*
    Al cambiar de alumno el panel se desmonta: lo que quedó escrito y sin
    guardar se envía en ese mismo instante.
  */
  // Implements: REQ-REV-02
  useEffect(() => {
    const deferred = saver.current;
    return () => deferred?.flush();
  }, []);

  const changeFeedback = (value: string) => {
    setFeedback(value);
    if (readOnly) return;
    setState("saving");
    deferredSave().schedule(value);
  };

  const commitGrade = async () => {
    if (readOnly) return;
    const { score, error: invalid } = parseGradeDraft(grade);
    setGradeError(invalid);
    if (invalid) return;
    const next = { ...scores };
    if (score === null) delete next[item.id];
    else next[item.id] = score;
    setState("saving");
    try {
      await saveStudentScores(courseId, row.userId, next);
      setState("saved");
      setError("");
    } catch (cause) {
      setState("error");
      setError(cause instanceof Error ? cause.message : "No fue posible guardar la nota.");
    }
  };

  return (
    <>
      <div className="review-student" role="status">
        <span className="avatar" aria-hidden="true">
          {row.name.slice(0, 2).toUpperCase()}
        </span>
        <span>
          <b>{row.name}</b>
          <small>{row.email}</small>
        </span>
        <span className="review-state" data-state={row.state}>
          {SUBMISSION_STATE_LABELS[row.state]}
        </span>
      </div>

      <nav aria-label="Recorrer la cola" className="review-move">
        <button
          className="pagination-btn"
          disabled={position.index <= 0}
          onClick={() => onMove(-1)}
          type="button"
        >
          <CaretLeft aria-hidden="true" size={15} />
          Anterior
        </button>
        <span className="num">
          {(position.index + 1).toLocaleString("es-CL")} de {position.total.toLocaleString("es-CL")}
        </span>
        <button
          className="pagination-btn"
          disabled={position.index >= position.total - 1}
          onClick={() => onMove(1)}
          type="button"
        >
          Siguiente
          <CaretRight aria-hidden="true" size={15} />
        </button>
      </nav>
      <p className="review-shortcut-hint">
        Con el foco fuera de los campos, <kbd>J</kbd> avanza y <kbd>K</kbd> retrocede.
      </p>

      {readOnly && (
        <p className="tool-status info" role="status">
          Este ramo está archivado: la bandeja abre las entregas en solo lectura.
        </p>
      )}

      <form onSubmit={(event) => event.preventDefault()}>
        <label className="review-grade-field" htmlFor="review-grade">
          <span>
            Nota de {item.name}
            <small>Escala 1,0 a 7,0</small>
          </span>
          <input
            aria-describedby={gradeError ? "review-grade-error" : undefined}
            aria-invalid={Boolean(gradeError)}
            className="num"
            disabled={readOnly}
            id="review-grade"
            inputMode="decimal"
            onBlur={() => void commitGrade()}
            onChange={(event) => {
              setGrade(event.target.value);
              if (gradeError) setGradeError("");
            }}
            placeholder="Sin nota"
            value={grade}
          />
        </label>
        {gradeError && (
          <p className="review-field-error" id="review-grade-error" role="alert">
            <Warning aria-hidden="true" size={15} weight="fill" />
            {gradeError}
          </p>
        )}

        <label className="review-feedback-field" htmlFor="review-feedback">
          <span>
            Retroalimentación privada
            <small>Sólo la ve este estudiante</small>
          </span>
          <textarea
            disabled={readOnly}
            id="review-feedback"
            maxLength={MAX_GRADE_FEEDBACK_LENGTH}
            onBlur={() => saver.current?.flush()}
            onChange={(event) => changeFeedback(event.target.value)}
            placeholder="Explica qué estuvo bien, qué debe revisar y cómo puede mejorar."
            rows={8}
            value={feedback}
          />
        </label>
        <p className="review-save-state" data-state={state} role="status">
          {state === "saving" && "Guardando…"}
          {state === "saved" && (
            <>
              <CheckCircle aria-hidden="true" size={15} weight="fill" />
              Guardado en el libro auditado
            </>
          )}
          {state === "error" && error}
          {state === "idle" && (
            <span className="num">
              {feedback.length.toLocaleString("es-CL")} /{" "}
              {MAX_GRADE_FEEDBACK_LENGTH.toLocaleString("es-CL")}
            </span>
          )}
        </p>
      </form>

      <button
        aria-expanded={guideOpen}
        className="review-guide-toggle"
        onClick={onGuideToggle}
        type="button"
      >
        <ClipboardText aria-hidden="true" size={17} />
        {guideOpen ? "Ocultar la pauta" : "Consultar la pauta"}
      </button>
    </>
  );
}

/*
  Pauta de la evaluación junto al documento. Se abre y cierra sobre el lienzo
  del visor, sin tocar los campos de nota y retroalimentación del alumno en
  curso.
*/
// Implements: REQ-REV-05
function GuidePanel({
  guides,
  item,
  onClose,
  openAttachment,
}: {
  guides: ReturnType<typeof guidePosts>;
  item: GradeItem;
  onClose: () => void;
  openAttachment: (storagePath: string) => Promise<string>;
}) {
  const [index, setIndex] = useState(0);
  const [fileError, setFileError] = useState("");
  const guide = guides[index];

  const openGuideFile = async (storagePath: string) => {
    setFileError("");
    try {
      const url = await openAttachment(storagePath);
      if (url && url !== "#") window.open(url, "_blank", "noopener");
      else setFileError("El archivo de la pauta no está disponible en este entorno.");
    } catch {
      setFileError("No fue posible abrir el archivo de la pauta.");
    }
  };

  return (
    <aside aria-labelledby="review-guide-title" className="review-guide">
      <header>
        <h2 id="review-guide-title">Pauta de {item.name}</h2>
        <button aria-label="Cerrar la pauta" onClick={onClose} type="button">
          <X aria-hidden="true" size={16} />
        </button>
      </header>
      {guides.length === 0 ? (
        <p className="review-guide-empty">
          Esta sección aún no publica certámenes ni guías. Publica la pauta en el aula y quedará
          disponible aquí mientras corriges.
        </p>
      ) : (
        <>
          {guides.length > 1 && (
            <label className="review-guide-picker">
              <span className="sr-only">Elegir la publicación de referencia</span>
              <select onChange={(event) => setIndex(Number(event.target.value))} value={index}>
                {guides.map((post, position) => (
                  <option key={post.id} value={position}>
                    {post.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {guide && (
            <div className="review-guide-body">
              <RichText body={guide.body} />
              {guide.attachments.length > 0 && (
                <ul className="review-guide-files">
                  {guide.attachments.map((attachment) => (
                    <li key={attachment.storagePath}>
                      <button
                        onClick={() => void openGuideFile(attachment.storagePath)}
                        type="button"
                      >
                        <FileText aria-hidden="true" size={16} />
                        <span>{attachment.name}</span>
                        <small className="num">{formatBytes(attachment.size)}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {fileError && (
                <p className="review-field-error" role="alert">
                  <Warning aria-hidden="true" size={15} weight="fill" />
                  {fileError}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </aside>
  );
}

export default SubmissionReviewTray;
