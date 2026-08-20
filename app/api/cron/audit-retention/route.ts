import { createHash, timingSafeEqual } from "node:crypto";
import {
  auditIpRetentionCutoff,
  purgeAgedAuditIpAddresses,
} from "../../../../lib/services/academic-catalog";

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
    return Response.json({ purged });
  } catch {
    return Response.json({ error: "No se pudo ejecutar la purga de retención." }, { status: 500 });
  }
}
