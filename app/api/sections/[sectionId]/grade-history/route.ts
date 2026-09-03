import { getSessionUser } from "../../../../../lib/auth";
import { handleGradeHistory } from "../../../../../lib/grade-history-handler";
import { activeSectionRoleForUser } from "../../../../../lib/services/academic-catalog";
import { readGradeHistoryPage } from "../../../../../lib/services/grade-history";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const { sectionId } = await params;
  return handleGradeHistory(request, sectionId, {
    session: getSessionUser,
    membership: activeSectionRoleForUser,
    read: readGradeHistoryPage,
  });
}
