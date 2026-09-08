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
          setLoading(false);
        },
        (message) => {
          noteRef.current(message, "bad");
          setLoading(false);
        }
      ),
    [canTeach, course.id]
  );

  if (canTeach) {
    return (
      <TeacherQuizzes
        classroom={classroom}
        course={course}
        loading={loading}
        note={note}
        quizzes={quizzes}
        readOnly={readOnly}
      />
    );
  }
  return (
    <StudentQuizzes
      course={course}
      loading={loading}
      note={note}
      quizzes={quizzes}
      readOnly={readOnly}
    />
  );
}

export default QuizzesSection;
