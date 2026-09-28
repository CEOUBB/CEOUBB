import { fail } from "../../../../../../../lib/interop/errors.ts";
import {
  interopFailure,
  privateHeaders,
  sessionActor,
} from "../../../../../../../lib/interop/http.ts";
import { isSectionId } from "../../../../../../../lib/section-roles.ts";
import { exportPublishedQuiz } from "../../../../../../../lib/services/interop-qti.ts";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ sectionId: string; quizId: string }> }
) {
  try {
    const actor = await sessionActor(request);
    const { sectionId, quizId } = await context.params;
    if (!sectionId || sectionId.length > 100 || !isSectionId(sectionId)) {
      fail("La sección no es válida.", 400);
    }
    const bytes = await exportPublishedQuiz(actor, sectionId, quizId);
    const safeQuizId = quizId.replace(/[^a-zA-Z0-9_-]/g, "") || "quiz";
    return new Response(bytes.slice().buffer, {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="banco-qti-' + safeQuizId + '.zip"',
      },
    });
  } catch (error) {
    return interopFailure(error);
  }
}
