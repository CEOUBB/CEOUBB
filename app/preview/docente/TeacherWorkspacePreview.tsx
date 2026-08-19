"use client";

import { useCallback, useReducer, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { ChartBar, Eye, FolderSimple, House, List, Notebook, Tray, X } from "@phosphor-icons/react";
import { ActivitiesPanel, GradebookPanel, HomePanel, ReviewPanel } from "./teacher-preview-panels";
import { ActivityEditorDialog, StudentPreviewDialog } from "./teacher-preview-dialogs";
import {
  createInitialTeacherPreviewState,
  emptyActivity,
  publishedStudentReview,
  teacherPreviewReducer,
  type TeacherActivityPreview,
} from "./teacher-preview-model";
import styles from "./teacher-workspace-preview.module.css";

export type TeacherView = "home" | "activities" | "review" | "grades";

const NARROW = "(max-width: 900px)";

/* Bajo 900px el riel del portal deja de ocupar columna y flota sobre el
   contenido. Se consulta el medio en lugar de fijar el estado en un efecto,
   así el teléfono no estrena la vista con el menú encima. */
function useNarrowViewport() {
  const subscribe = useCallback((notify: () => void) => {
    const query = window.matchMedia(NARROW);
    query.addEventListener("change", notify);
    return () => query.removeEventListener("change", notify);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW).matches,
    () => false
  );
}

const NAVIGATION = [
  { id: "home", label: "Inicio", Icon: House },
  { id: "activities", label: "Actividades", Icon: Notebook },
  { id: "review", label: "Por corregir", Icon: Tray },
  { id: "grades", label: "Calificaciones", Icon: ChartBar },
] as const;

// Implements: REQ-DOC-02, REQ-DOC-03, REQ-DOC-04, REQ-DOC-07, REQ-DOC-11, REQ-DOC-12, REQ-DOC-13
export function TeacherWorkspacePreview() {
  const [state, dispatch] = useReducer(
    teacherPreviewReducer,
    undefined,
    createInitialTeacherPreviewState
  );
  const [view, setView] = useState<TeacherView>("home");
  const [manualSidebar, setManualSidebar] = useState<boolean | null>(null);
  const [editingActivity, setEditingActivity] = useState<TeacherActivityPreview | null>(null);
  const [studentPreviewSubmissionId, setStudentPreviewSubmissionId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("Vista previa cargada con datos de ejemplo.");

  const narrow = useNarrowViewport();
  const sidebarOpen = manualSidebar ?? !narrow;

  const pendingReviews = state.submissions.filter((submission) =>
    ["submitted", "late", "review_draft"].includes(submission.state)
  ).length;

  const navigate = (nextView: TeacherView, activityId?: string) => {
    const requestedActivityId = activityId ?? state.selectedActivityId;
    const reviewActivityId =
      nextView === "review" &&
      !state.submissions.some((submission) => submission.activityId === requestedActivityId)
        ? state.activities.find((activity) =>
            state.submissions.some((submission) => submission.activityId === activity.id)
          )?.id
        : requestedActivityId;
    if (reviewActivityId) {
      dispatch({ type: "select_activity", activityId: reviewActivityId });
      const firstSubmission = state.submissions.find(
        (submission) => submission.activityId === reviewActivityId
      );
      if (nextView === "review" && firstSubmission)
        dispatch({ type: "select_submission", submissionId: firstSubmission.id });
    }
    setView(nextView);
    if (narrow) setManualSidebar(false);
    setAnnouncement(
      `Sección ${NAVIGATION.find((item) => item.id === nextView)?.label ?? "docente"} abierta.`
    );
  };

  const openStudentPreview = (submissionId?: string) => {
    const fallback = state.submissions.find((submission) =>
      publishedStudentReview(state, submission.id)
    );
    setStudentPreviewSubmissionId(submissionId ?? fallback?.id ?? state.selectedSubmissionId);
  };

  const openNewActivity = () =>
    setEditingActivity(emptyActivity(state.section.id, state.activities.length + 1));

  return (
    <div className="app-shell" data-sidebar={sidebarOpen ? "open" : "closed"}>
      <a className={styles.skipLink} href="#espacio-docente">
        Saltar al contenido docente
      </a>

      <header className="app-header">
        <button
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? "Cerrar el menú" : "Abrir el menú"}
          className="icon-button"
          onClick={() => setManualSidebar(!sidebarOpen)}
          type="button"
        >
          {sidebarOpen ? <X size={20} aria-hidden="true" /> : <List size={20} aria-hidden="true" />}
        </button>
        <span className={`app-brand ${styles.brandStatic}`}>
          <Image src="/brand/ubb-shield.webp" alt="" aria-hidden="true" width={388} height={594} />
          <strong>Centro de Estudio UBB</strong>
        </span>
        <p className="header-context">
          <span aria-hidden="true" className="header-context-sep">
            /
          </span>
          <span className="header-context-label">Espacio docente</span>
          <span className={styles.previewChip}>
            <i aria-hidden="true" />
            Vista previa<span> · datos de ejemplo · nada se guardará</span>
          </span>
        </p>
        <div className="header-actions">
          <button
            className={styles.headerAction}
            type="button"
            onClick={() => openStudentPreview()}
          >
            <Eye size={17} aria-hidden="true" />
            <span>Vista estudiante</span>
          </button>
          <span className={styles.headerIdentity}>
            <span className="avatar" aria-hidden="true">
              DE
            </span>
            <span className="account-copy">
              <strong>Docente</strong>
              <small>{state.section.section}</small>
            </span>
          </span>
        </div>
      </header>

      <aside
        className="app-sidebar"
        aria-label="Navegación del espacio docente"
        inert={!sidebarOpen}
      >
        <nav aria-label="Herramientas docentes" className="side-nav">
          {NAVIGATION.map(({ id, label, Icon }) => {
            const active = view === id;
            return (
              <button
                aria-current={active ? "page" : undefined}
                aria-label={id === "review" ? `${label}, ${pendingReviews} pendientes` : undefined}
                className={active ? "side-item active" : "side-item"}
                key={id}
                onClick={() => navigate(id)}
                type="button"
              >
                <span className="side-icon">
                  <Icon size={18} weight={active ? "fill" : "regular"} />
                </span>
                <span className="side-label">{label}</span>
                {id === "review" && pendingReviews > 0 && (
                  <span className={styles.sideCount} aria-hidden="true">
                    {pendingReviews}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Implements: REQ-DELIB-08 */}
        <div className="side-group">
          <span className="side-group-title">Sección a cargo</span>
          <p className={styles.sideSection}>
            <span className="side-icon tone" aria-hidden="true">
              <FolderSimple size={18} weight="fill" />
            </span>
            <span>
              <b>{state.section.name}</b>
              <small>
                {state.section.code} · {state.section.section}
              </small>
            </span>
          </p>
        </div>

        <div className={styles.sideTeacher}>
          <span className="avatar" aria-hidden="true">
            DE
          </span>
          <div>
            <strong>Docente de ejemplo</strong>
            <small>{state.section.period}</small>
          </div>
        </div>
      </aside>

      <button
        aria-label="Cerrar el menú"
        className="sidebar-scrim"
        onClick={() => setManualSidebar(false)}
        type="button"
      />

      <main className="app-main" id="espacio-docente">
        <div className="portal-main">
          <p className="sr-only" aria-live="polite">
            {announcement}
          </p>
          {view === "home" && (
            <HomePanel
              state={state}
              onNavigate={navigate}
              onEditActivity={setEditingActivity}
              onCreate={openNewActivity}
            />
          )}
          {view === "activities" && (
            <ActivitiesPanel
              state={state}
              onCreate={openNewActivity}
              onEdit={setEditingActivity}
              onNavigate={navigate}
              onStudentPreview={() => openStudentPreview()}
            />
          )}
          {view === "review" && (
            <ReviewPanel
              state={state}
              dispatch={dispatch}
              onAnnouncement={setAnnouncement}
              onStudentPreview={openStudentPreview}
            />
          )}
          {view === "grades" && <GradebookPanel state={state} />}
          <p className={styles.disclaimer}>
            CEOUBB es una iniciativa independiente y esta vista no representa un servicio oficial de
            la Universidad del Bío-Bío.
          </p>
        </div>
      </main>

      {editingActivity && (
        <ActivityEditorDialog
          activity={editingActivity}
          onClose={() => setEditingActivity(null)}
          onSave={(activity, message) => {
            dispatch({ type: "save_activity", activity });
            setEditingActivity(null);
            setAnnouncement(message);
          }}
          key={editingActivity.id}
        />
      )}
      <StudentPreviewDialog
        state={state}
        submissionId={studentPreviewSubmissionId}
        onClose={() => setStudentPreviewSubmissionId(null)}
      />
    </div>
  );
}
