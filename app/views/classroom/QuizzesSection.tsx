"use client";

// Implements: REQ-QUIZ-01, REQ-QUIZ-02
import { useEffect, useRef, useState } from "react";
import type { Course } from "../../../lib/courses.ts";
import { watchQuizzes, type ClassroomState } from "../../../lib/firebase-classroom-client.ts";
import type { QuizDefinition } from "../../../lib/quizzes.ts";
import type { Note } from "./classroom-utils.ts";
import { TeacherQuizzes } from "./TeacherQuizzes.tsx";
import { StudentQuizzes } from "./StudentQuizzes.tsx";

export function QuizzesSection({
  course,
  classroom,
  canTeach,
  readOnly,
  note,
}: {
  course: Course;
  classroom: ClassroomState;
  canTeach: boolean;
  readOnly: boolean;
  note: (text: string, tone?: Note["tone"]) => void;
}) {
  const [quizzes, setQuizzes] = useState<QuizDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const noteRef = useRef(note);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  useEffect(
    () =>
      watchQuizzes(
        course.id,
        canTeach,
        (next) => {
          setQuizzes(next);
          setError("");
          setLoading(false);
        },
        (message) => {
          setError(message);
          noteRef.current(message, "bad");
          setLoading(false);
        }
      ),
    [canTeach, course.id, retry]
  );

  const unavailable = error && (
    <div className="grades-load-status" role="status">
      <h2>No se pudieron actualizar los cuestionarios</h2>
      <p>{error} No podemos confirmar si hay nuevos controles disponibles.</p>
      <button
        className="secondary-button"
        type="button"
        onClick={() => {
          setLoading(true);
          setError("");
          setRetry((value) => value + 1);
        }}
      >
        Reintentar
      </button>
    </div>
  );
  if (error && quizzes.length === 0) return unavailable;

  if (canTeach) {
    return (
      <>
        {unavailable}
        <TeacherQuizzes
          classroom={classroom}
          course={course}
          loading={loading}
          note={note}
          quizzes={quizzes}
          readOnly={readOnly || Boolean(error) || loading}
        />
      </>
    );
  }
  return (
    <>
      {unavailable}
      <StudentQuizzes
        course={course}
        loading={loading}
        note={note}
        quizzes={quizzes}
        readOnly={readOnly || Boolean(error) || loading}
      />
    </>
  );
}

export default QuizzesSection;
