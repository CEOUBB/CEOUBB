import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  BookOpen,
  CalendarBlank,
  CheckCircle,
  Eye,
  FileText,
  FloppyDisk,
  Info,
  Lock,
  PaperPlaneTilt,
  X,
} from "@phosphor-icons/react";
import {
  ACTIVITY_LIFECYCLE_LABELS,
  formatDateTime,
  publishedStudentReview,
  validateActivity,
  type ActivityValidationErrors,
  type SubmissionMode,
  type TeacherActivityPreview,
  type TeacherPreviewState,
} from "./teacher-preview-model";
import styles from "./teacher-workspace-preview.module.css";

type ActivityEditorDialogProps = {
  activity: TeacherActivityPreview;
  onClose: () => void;
  onSave: (activity: TeacherActivityPreview, message: string) => void;
};

type StudentPreviewDialogProps = {
  state: TeacherPreviewState;
  submissionId: string | null;
  onClose: () => void;
};

function firstErrorField(form: HTMLFormElement | null, errors: ActivityValidationErrors) {
  const fields: Array<keyof ActivityValidationErrors> = ["title", "instructions", "opensAt", "dueAt", "cutoffAt", "gradeWeight"];
  const ids: Record<keyof ActivityValidationErrors, string> = { title: "activity-title", instructions: "activity-instructions", opensAt: "activity-opens", dueAt: "activity-due", cutoffAt: "activity-cutoff", gradeWeight: "activity-weight" };
  const first = fields.find((field) => errors[field]);
  if (first) form?.querySelector<HTMLElement>(`#${ids[first]}`)?.focus();
}

function finiteInputValue(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

// Implements: REQ-DOC-05, REQ-DOC-06, REQ-DOC-11, REQ-DOC-12
export function ActivityEditorDialog({ activity, onClose, onSave }: ActivityEditorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<TeacherActivityPreview>(() => ({ ...activity, acceptedTypes: [...activity.acceptedTypes] }));
  const [errors, setErrors] = useState<ActivityValidationErrors>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const update = <Key extends keyof TeacherActivityPreview>(key: Key, value: TeacherActivityPreview[Key]) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = (intent: "draft" | "publish") => {
    const nextErrors = validateActivity(draft, intent);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => firstErrorField(formRef.current, nextErrors));
      return;
    }
    const lifecycle = intent === "draft" ? "draft" : "scheduled";
    onSave({ ...draft, lifecycle }, intent === "draft" ? `${draft.title} quedó como borrador privado.` : `${draft.title} quedó programada con datos de ejemplo.`);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit("publish");
  };

  const toggleAcceptedType = (type: string, checked: boolean) => {
    update("acceptedTypes", checked ? [...new Set([...draft.acceptedTypes, type])] : draft.acceptedTypes.filter((value) => value !== type));
  };

  return (
    <dialog className={styles.dialog} ref={dialogRef} onClose={onClose} onCancel={onClose} aria-labelledby="activity-dialog-title">
      <form className={styles.dialogForm} ref={formRef} onSubmit={onSubmit} noValidate>
        <header className={styles.dialogHeader}>
          <div><span className={styles.dialogContext}>Actividad · {draft.lifecycle === "draft" ? "borrador" : ACTIVITY_LIFECYCLE_LABELS[draft.lifecycle]}</span><h2 id="activity-dialog-title">{activity.title ? "Editar actividad" : "Nueva actividad"}</h2></div>
          <button className={styles.iconButton} type="button" aria-label="Cerrar editor" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </header>
        <div className={styles.dialogBody}>
          <div className={styles.formSection}>
            <div className={styles.sectionHeading}><span>01</span><div><h3>Lo esencial</h3><p>La información que orientará al curso.</p></div></div>
            <label className={styles.fieldLabel} htmlFor="activity-title"><span>Título</span><input id="activity-title" value={draft.title} onChange={(event) => update("title", event.target.value)} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "activity-title-error" : undefined} /></label>
            {errors.title && <p className={styles.fieldError} id="activity-title-error" role="alert">{errors.title}</p>}
            <label className={styles.fieldLabel} htmlFor="activity-instructions"><span>Instrucciones</span><textarea id="activity-instructions" rows={5} value={draft.instructions} onChange={(event) => update("instructions", event.target.value)} aria-invalid={Boolean(errors.instructions)} aria-describedby={errors.instructions ? "activity-instructions-error" : undefined} /></label>
            {errors.instructions && <p className={styles.fieldError} id="activity-instructions-error" role="alert">{errors.instructions}</p>}
            <div className={styles.formGrid}>
              <label className={styles.fieldLabel} htmlFor="activity-unit"><span>Unidad</span><input id="activity-unit" value={draft.unit} onChange={(event) => update("unit", event.target.value)} /></label>
              <label className={styles.fieldLabel} htmlFor="activity-outcome"><span>Resultado de aprendizaje</span><input id="activity-outcome" value={draft.learningOutcome} onChange={(event) => update("learningOutcome", event.target.value)} /></label>
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.sectionHeading}><span>02</span><div><h3>Calendario y evaluación</h3><p>Una sola definición alimentará actividad, agenda y libro de notas.</p></div></div>
            <div className={styles.dateGrid}>
              <label className={styles.fieldLabel} htmlFor="activity-opens"><span>Apertura</span><input id="activity-opens" type="datetime-local" value={draft.opensAt} onChange={(event) => update("opensAt", event.target.value)} aria-invalid={Boolean(errors.opensAt)} aria-describedby={errors.opensAt ? "activity-opens-error" : undefined} /></label>
              <label className={styles.fieldLabel} htmlFor="activity-due"><span>Vencimiento</span><input id="activity-due" type="datetime-local" value={draft.dueAt} onChange={(event) => update("dueAt", event.target.value)} aria-invalid={Boolean(errors.dueAt)} aria-describedby={errors.dueAt ? "activity-due-error" : undefined} /></label>
              <label className={styles.fieldLabel} htmlFor="activity-cutoff"><span>Cierre</span><input id="activity-cutoff" type="datetime-local" value={draft.cutoffAt} onChange={(event) => update("cutoffAt", event.target.value)} aria-invalid={Boolean(errors.cutoffAt)} aria-describedby={errors.cutoffAt ? "activity-cutoff-error" : undefined} /></label>
            </div>
            {errors.opensAt && <p className={styles.fieldError} id="activity-opens-error" role="alert">{errors.opensAt}</p>}
            {errors.dueAt && <p className={styles.fieldError} id="activity-due-error" role="alert">{errors.dueAt}</p>}
            {errors.cutoffAt && <p className={styles.fieldError} id="activity-cutoff-error" role="alert">{errors.cutoffAt}</p>}
            <div className={styles.formGrid}>
              <label className={styles.fieldLabel} htmlFor="activity-grade-item"><span>Vinculación de nota</span><select id="activity-grade-item" value={draft.gradeItemId ? "graded" : "none"} onChange={(event) => update("gradeItemId", event.target.value === "graded" ? draft.id : null)}><option value="graded">Crear ítem de calificación</option><option value="none">Actividad sin nota</option></select></label>
              <label className={styles.fieldLabel} htmlFor="activity-weight"><span>Ponderación</span><span className={styles.inputSuffix}><input id="activity-weight" type="number" min="0" max="100" value={draft.gradeWeight} onChange={(event) => update("gradeWeight", finiteInputValue(event.currentTarget.valueAsNumber, 0))} aria-invalid={Boolean(errors.gradeWeight)} aria-describedby={errors.gradeWeight ? "activity-weight-error" : undefined} disabled={!draft.gradeItemId} /><em>%</em></span></label>
            </div>
            {errors.gradeWeight && <p className={styles.fieldError} id="activity-weight-error" role="alert">{errors.gradeWeight}</p>}
          </div>

          <details className={styles.advancedDetails}>
            <summary><span><strong>Configuración de entrega</strong><small>Intentos, formato y archivos aceptados</small></span><Info size={19} aria-hidden="true" /></summary>
            <div className={styles.advancedBody}>
              <div className={styles.formGrid}>
                <label className={styles.fieldLabel} htmlFor="activity-mode"><span>Modalidad</span><select id="activity-mode" value={draft.submissionMode} onChange={(event) => update("submissionMode", event.target.value as SubmissionMode)}><option value="file">Archivo</option><option value="text">Texto en línea</option><option value="file_or_text">Archivo o texto</option></select></label>
                <label className={styles.fieldLabel} htmlFor="activity-attempts"><span>Intentos máximos</span><input id="activity-attempts" type="number" min="1" max="10" value={draft.maxAttempts} onChange={(event) => update("maxAttempts", Math.max(1, finiteInputValue(event.currentTarget.valueAsNumber, 1)))} /></label>
              </div>
              <fieldset className={styles.checkboxGroup}><legend>Tipos de archivo permitidos</legend>
                <label><input type="checkbox" checked={draft.acceptedTypes.includes("application/pdf")} onChange={(event) => toggleAcceptedType("application/pdf", event.target.checked)} /> PDF</label>
                <label><input type="checkbox" checked={draft.acceptedTypes.includes("image/png")} onChange={(event) => toggleAcceptedType("image/png", event.target.checked)} /> PNG</label>
                <label><input type="checkbox" checked={draft.acceptedTypes.includes("image/jpeg")} onChange={(event) => toggleAcceptedType("image/jpeg", event.target.checked)} /> JPG</label>
              </fieldset>
            </div>
          </details>
        </div>
        <footer className={styles.dialogFooter}>
          <span><Lock size={16} weight="fill" aria-hidden="true" /> Los cambios existen solo en esta pestaña.</span>
          <div>
            <button className={styles.utilityButton} type="button" onClick={() => submit("draft")}><FloppyDisk size={17} aria-hidden="true" /> Guardar borrador</button>
            <button className={styles.primaryButton} type="submit"><PaperPlaneTilt size={17} weight="fill" aria-hidden="true" /> Programar actividad</button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}

// Implements: REQ-DOC-03, REQ-DOC-09, REQ-DOC-10, REQ-DOC-11, REQ-DOC-12
export function StudentPreviewDialog({ state, submissionId, onClose }: StudentPreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submission = state.submissions.find((item) => item.id === submissionId);
  const activity = state.activities.find((item) => item.id === submission?.activityId) ?? state.activities.find((item) => item.lifecycle !== "draft");
  const review = submission ? publishedStudentReview(state, submission.id) : null;
  const visibleActivities = state.activities.filter((item) => item.lifecycle !== "draft" && item.lifecycle !== "archived");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (submissionId && dialog && !dialog.open) dialog.showModal();
    if (!submissionId && dialog?.open) dialog.close();
  }, [submissionId]);

  return (
    <dialog className={styles.studentDialog} ref={dialogRef} onClose={onClose} onCancel={onClose} aria-labelledby="student-preview-title">
      <header className={styles.studentDialogHeader}>
        <div><span className={styles.readOnlyBadge}><Eye size={15} aria-hidden="true" /> Solo lectura</span><h2 id="student-preview-title">Así lo verá el estudiante</h2></div>
        <button className={styles.iconButton} type="button" aria-label="Cerrar Vista estudiante" onClick={onClose}><X size={20} aria-hidden="true" /></button>
      </header>
      <div className={styles.studentSurface}>
        <section className={styles.studentCourseHero}>
          <span>{state.section.code} · {state.section.section}</span>
          <h3>{state.section.name}</h3>
          <p>{state.section.period}</p>
        </section>
        <div className={styles.studentContent}>
          <section className={styles.studentModule} aria-labelledby="student-module-title">
            <div className={styles.panelHeading}><div><h3 id="student-module-title">Unidad actual</h3><p>Contenido publicado por el equipo docente.</p></div><BookOpen size={22} weight="duotone" aria-hidden="true" /></div>
            {visibleActivities.map((item) => (
              <div className={styles.studentActivityRow} key={item.id}>
                <span className={styles.studentActivityIcon}><FileText size={19} aria-hidden="true" /></span>
                <div><strong>{item.title}</strong><small>{item.unit}</small></div>
                <span>{formatDateTime(item.dueAt)}</span>
              </div>
            ))}
          </section>
          {activity && (
            <section className={styles.studentResult} aria-labelledby="student-result-title">
              <div className={styles.panelHeading}><div><h3 id="student-result-title">{activity.title}</h3><p>{submission?.studentAlias ?? "Estudiante ficticio"}</p></div><CalendarBlank size={22} weight="duotone" aria-hidden="true" /></div>
              {review ? (
                <div className={styles.publishedFeedback}>
                  <span className={styles.publishedIcon}><CheckCircle size={24} weight="fill" aria-hidden="true" /></span>
                  <div><small>Calificación publicada</small><strong>{review.grade?.toFixed(1).replace(".", ",")}</strong><p>{review.feedback}</p></div>
                </div>
              ) : (
                <div className={styles.privateFeedback}><Lock size={22} weight="fill" aria-hidden="true" /><div><strong>Corrección todavía privada</strong><p>La nota y la retroalimentación aparecerán aquí cuando el docente las publique.</p></div></div>
              )}
            </section>
          )}
        </div>
      </div>
    </dialog>
  );
}
