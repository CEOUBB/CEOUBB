import worker, {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from "./.open-next/worker.js";

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache };

async function runAuditRetention(env, ctx) {
  const secret = typeof env.CRON_SECRET === "string" ? env.CRON_SECRET : "";
  if (!secret) throw new Error("CRON_SECRET no está configurado para la purga programada.");
  const response = await worker.fetch(
    new Request("https://ceoubb.com/api/cron/audit-retention", {
      headers: { authorization: `Bearer ${secret}` },
    }),
    env,
    ctx
  );
  if (!response.ok) {
    throw new Error(`La purga programada respondió HTTP ${response.status}.`);
  }
}

export default {
  fetch: worker.fetch,
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(runAuditRetention(env, ctx));
  },
};
