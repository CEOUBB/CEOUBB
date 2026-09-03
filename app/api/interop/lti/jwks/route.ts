import { interopFailure, json } from "../../../../../lib/interop/http.ts";
import { publicLtiKeys } from "../../../../../lib/interop/lti.ts";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return json(publicLtiKeys());
  } catch (error) {
    return interopFailure(error);
  }
}
