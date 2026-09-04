"use client";

// Implements: REQ-QUIZ-01, REQ-QUIZ-02
import { Exam } from "@phosphor-icons/react";

export function QuizLoading() {
  return (
    <div className="quiz-loading" role="status">
      Cargando cuestionarios…
    </div>
  );
}

export function QuizEmpty({ teacher = false }: { teacher?: boolean }) {
  return (
    <div className="quiz-empty">
      <Exam size={32} weight="duotone" aria-hidden="true" />
      <strong>
        {teacher ? "Aún no publicas cuestionarios" : "No hay cuestionarios disponibles"}
      </strong>
      <p>
        {teacher
          ? "Importa un banco para preparar el primer control."
          : "Los nuevos controles aparecerán aquí cuando el docente los publique."}
      </p>
    </div>
  );
}
