"use client";

// Implements: REQ-QUIZ-01, REQ-QUIZ-02
import { Exam } from "@phosphor-icons/react";
import { EmptyState } from "./EmptyState";

export function QuizLoading() {
  return (
    <div className="quiz-loading" role="status">
      Cargando cuestionarios…
    </div>
  );
}

export function QuizEmpty({ teacher = false }: { teacher?: boolean }) {
  return (
    <EmptyState
      icon={Exam}
      title={teacher ? "Aún no publicas cuestionarios" : "No hay cuestionarios disponibles"}
      description={
        teacher
          ? "Importa un banco GIFT, CSV o QTI para preparar el primer control."
          : "Los nuevos controles aparecerán aquí cuando el docente los publique."
      }
    />
  );
}
