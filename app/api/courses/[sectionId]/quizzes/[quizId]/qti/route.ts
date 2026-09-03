import {
  interopFailure,
  privateHeaders,
  sessionActor,
} from "../../../../../../../lib/interop/http.ts";
import { exportPublishedQuiz } from "../../../../../../../lib/services/interop-qti.ts";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ sectionId: string; quizId: string }> }
) {
  try {
    const actor = await sessionActor(request);
    const { sectionId, quizId } = await context.params;
    const bytes = await exportPublishedQuiz(actor, sectionId, quizId);
    return new Response(bytes.slice().buffer, {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="banco-qti-' + quizId + '.zip"',
      },
    });
  } catch (error) {
    return interopFailure(error);
  }
}
