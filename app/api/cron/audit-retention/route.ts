import { createHash, timingSafeEqual } from "node:crypto";
import {
  auditIpRetentionCutoff,
  purgeAgedAuditIpAddresses,
} from "../../../../lib/services/academic-catalog";
import { purgeExpiredPendingAdeccaEnrollments } from "../../../../lib/services/adecca-import";
import { purgeExpiredPendingMoodleEnrollments } from "../../../../lib/services/moodle-import";

export const dynamic = "force-dynamic";

/*
  Borra la IP vencida de la bitácora de notas. Muta auditoría, así que —a diferencia
  del cron de standup, que sólo lee y publica— exige credencial: un endpoint abierto
  que limpia campos de auditoría es una forma de lavar un cambio de nota.
*/

function credentialMatches(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

// Implements: REQ-PRIV-08
export async function GET(request: Request) {
  if (!credentialMatches(request.headers.get("authorization")))
    return Response.json({ error: "Credencial de programador inválida." }, { status: 401 });

  try {
    const purged = await purgeAgedAuditIpAddresses(auditIpRetentionCutoff(new Date()));
    let pendingAdeccaPurged = 0;
    let pendingMoodlePurged = 0;
    for (let batch = 0; batch < 50; batch += 1) {
      const [adecca, moodle] = await Promise.all([
        purgeExpiredPendingAdeccaEnrollments(),
        purgeExpiredPendingMoodleEnrollments(),
      ]);
      pendingAdeccaPurged += adecca;
      pendingMoodlePurged += moodle;
      if (adecca < 100 && moodle < 100) break;
    }
    return Response.json({ purged, pendingAdeccaPurged, pendingMoodlePurged });
  } catch {
    return Response.json({ error: "No se pudo ejecutar la purga de retención." }, { status: 500 });
  }
}
