"use client";

import { Course } from "../../../lib/courses";
import { ClassroomStudent } from "../../../lib/firebase-classroom-client";
import { initials, roleLabel, type User } from "../../../lib/portal-utils";
import { Avatar } from "../../portal-ui";

export function PeopleSection({
  course,
  user,
  students,
}: {
  course: Course;
  user: User;
  students: ClassroomStudent[];
}) {
  const currentEmail = user.email.toLowerCase();
  return (
    <section>
      <div className="people-grid">
        <article>
          <span className="avatar large">{initials(course.name)}</span>
          <div>
            <strong>{course.teacher}</strong>
            <small>Coordinación del curso</small>
          </div>
        </article>
        <article>
          <Avatar large email={user.email} name={user.name} />
          <div>
            <strong>{user.name}</strong>
            <small>
              {roleLabel(user.role)} · {user.email}
            </small>
          </div>
        </article>
        {students.flatMap((student) =>
          student.email.toLowerCase() === currentEmail ? (
            []
          ) : (
            <article key={student.userId}>
              <span className="avatar large">{initials(student.name)}</span>
              <div>
                <strong>{student.name}</strong>
                <small>Estudiante · {student.email}</small>
              </div>
            </article>
          )
        )}
      </div>
    </section>
  );
}
