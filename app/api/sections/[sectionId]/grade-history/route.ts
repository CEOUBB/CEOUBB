import { getSessionUser } from "../../../../../lib/auth";
import { handleGradeHistory } from "../../../../../lib/grade-history-handler";
import { isSectionId } from "../../../../../lib/section-roles";
import { activeSectionRoleForUser } from "../../../../../lib/services/academic-catalog";
import { readGradeHistoryPage } from "../../../../../lib/services/grade-history";

// Implements: REQ-SEC-21
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const { sectionId } = await params;
  if (!sectionId || sectionId.length > 100 || !isSectionId(sectionId)) {
    return Response.json(
      { error: "La sección no es válida." },
      { status: 400, headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" } }
    );
  }

  return handleGradeHistory(request, sectionId, {
    session: getSessionUser,
    membership: activeSectionRoleForUser,
    read: readGradeHistoryPage,
  });
}
