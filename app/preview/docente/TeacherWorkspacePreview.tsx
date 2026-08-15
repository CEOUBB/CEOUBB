"use client";

import { useReducer, useState } from "react";
import {
  ChartBar,
  Eye,
  GraduationCap,
  House,
  Notebook,
  Plus,
  Tray,
} from "@phosphor-icons/react";
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

const NAVIGATION = [
  { id: "home", label: "Inicio", Icon: House },
  { id: "activities", label: "Actividades", Icon: Notebook },
  { id: "review", label: "Por corregir", Icon: Tray },
  { id: "grades", label: "Calificaciones", Icon: ChartBar },
] as const;

// Implements: REQ-DOC-02, REQ-DOC-03, REQ-DOC-04, REQ-DOC-07, REQ-DOC-11, REQ-DOC-12, REQ-DOC-13
export function TeacherWorkspacePreview() {
  const [state, dispatch] = useReducer(teacherPreviewReducer, undefined, createInitialTeacherPreviewState);
  const [view, setView] = useState<TeacherView>("home");
  const [editingActivity, setEditingActivity] = useState<TeacherActivityPreview | null>(null);
  const [studentPreviewSubmissionId, setStudentPreviewSubmissionId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("Vista previa cargada con datos de ejemplo.");

  const pendingReviews = state.submissions.filter((submission) => ["submitted", "late", "review_draft"].includes(submission.state)).length;

  const navigate = (nextView: TeacherView, activityId?: string) => {
    const requestedActivityId = activityId ?? state.selectedActivityId;
    const reviewActivityId = nextView === "review" && !state.submissions.some((submission) => submission.activityId === requestedActivityId)
      ? state.activities.find((activity) => state.submissions.some((submission) => submission.activityId === activity.id))?.id
      : requestedActivityId;
    if (reviewActivityId) {
      dispatch({ type: "select_activity", activityId: reviewActivityId });
      const firstSubmission = state.submissions.find((submission) => submission.activityId === reviewActivityId);
      if (nextView === "review" && firstSubmission) dispatch({ type: "select_submission", submissionId: firstSubmission.id });
    }
    setView(nextView);
    setAnnouncement(`Sección ${NAVIGATION.find((item) => item.id === nextView)?.label ?? "docente"} abierta.`);
  };

  const openStudentPreview = (submissionId?: string) => {
    const fallback = state.submissions.find((submission) => publishedStudentReview(state, submission.id));
    setStudentPreviewSubmissionId(submissionId ?? fallback?.id ?? state.selectedSubmissionId);
  };

  const openNewActivity = () => setEditingActivity(emptyActivity(state.section.id, state.activities.length + 1));

  return (
    <div className={styles.previewPage}>
      <a className={styles.skipLink} href="#espacio-docente">Saltar al contenido docente</a>
      <div className={styles.previewBanner} role="status">
        <span className={styles.previewPulse} aria-hidden="true" />
        <strong>Vista previa</strong>
        <span>Datos de ejemplo · nada se guardará</span>
      </div>

      <header className={styles.appBar}>
        <div className={styles.brandLockup}>
          <span className={styles.brandMark} aria-hidden="true"><GraduationCap size={22} weight="fill" /></span>
          <span><strong>CEOUBB Aula</strong><small>Espacio docente</small></span>
        </div>
        <div className={styles.topActions}>
          <button className={styles.secondaryButton} type="button" onClick={() => openStudentPreview()}>
            <Eye size={18} aria-hidden="true" />
            <span>Vista estudiante</span>
          </button>
          <button className={styles.primaryButton} type="button" onClick={openNewActivity}>
            <Plus size={18} weight="bold" aria-hidden="true" />
            <span>Crear actividad</span>
          </button>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.sidebar} aria-label="Navegación del espacio docente">
          <div className={styles.courseContext}>
            <span className={styles.courseCode}>{state.section.code}</span>
            <strong>{state.section.name}</strong>
            <small>{state.section.section} · {state.section.period}</small>
          </div>
          <nav className={styles.navigation} aria-label="Herramientas docentes">
            {NAVIGATION.map(({ id, label, Icon }) => (
              <button
                className={styles.navButton}
                data-active={view === id}
                type="button"
                aria-current={view === id ? "page" : undefined}
                aria-label={id === "review" ? `${label}, ${pendingReviews} pendientes` : label}
                onClick={() => navigate(id)}
                key={id}
              >
                <Icon size={19} weight={view === id ? "fill" : "regular"} aria-hidden="true" />
                <span>{label}</span>
                {id === "review" && <span className={styles.navCount} aria-label={`${pendingReviews} pendientes`}>{pendingReviews}</span>}
              </button>
            ))}
          </nav>
          <div className={styles.teacherCard}>
            <span className={styles.teacherAvatar} aria-hidden="true">DE</span>
            <span><strong>Docente de ejemplo</strong><small>Responsable de la sección</small></span>
          </div>
        </aside>

        <main className={styles.main} id="espacio-docente">
          <p className={styles.srOnly} aria-live="polite">{announcement}</p>
          {view === "home" && (
            <HomePanel
              state={state}
              onNavigate={navigate}
              onEditActivity={setEditingActivity}
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
        </main>
      </div>

      <footer className={styles.previewFooter}>
        CEOUBB es una iniciativa independiente y esta vista no representa un servicio oficial de la Universidad del Bío-Bío.
      </footer>

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
