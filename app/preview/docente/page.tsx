import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeacherWorkspacePreview } from "./TeacherWorkspacePreview";
import { isTeacherPreviewEnabled } from "./teacher-preview-environment";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vista previa docente | CEOUBB",
  description: "Recorrido docente con datos sintéticos para revisión de producto.",
  robots: { index: false, follow: false, nocache: true },
};

// Implements: REQ-DOC-01, REQ-DOC-02, REQ-DOC-14
export default function TeacherPreviewPage() {
  if (!isTeacherPreviewEnabled()) notFound();
  return <TeacherWorkspacePreview />;
}
