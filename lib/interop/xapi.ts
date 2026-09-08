import { z } from "zod";
import { fail } from "./errors.ts";

const iri = z.string().max(1000).url();
// Implements: REQ-INT-05
const scoreSchema = z
  .strictObject({
    scaled: z.number().min(-1).max(1).optional(),
    raw: z.number().finite().optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  })
  .refine(
    (v) =>
      (v.min === undefined || v.max === undefined || v.min < v.max) &&
      (v.raw === undefined ||
        ((v.min === undefined || v.raw >= v.min) && (v.max === undefined || v.raw <= v.max)))
  );

// Implements: REQ-INT-05
const statementSchema = z.strictObject({
  id: z.uuid().optional(),
  actor: z.strictObject({
    objectType: z.literal("Agent").optional(),
    name: z.string().max(160).optional(),
    account: z.strictObject({ homePage: iri, name: z.string().min(1).max(200) }),
  }),
  verb: z.strictObject({
    id: iri,
    display: z.record(z.string().max(40), z.string().max(200)).optional(),
  }),
  object: z.strictObject({
    objectType: z.literal("Activity").optional(),
    id: iri,
    definition: z
      .strictObject({
        name: z.record(z.string(), z.string().max(200)).optional(),
        description: z.record(z.string(), z.string().max(2000)).optional(),
        type: iri.optional(),
      })
      .optional(),
  }),
  result: z
    .strictObject({
      score: scoreSchema.optional(),
      success: z.boolean().optional(),
      completion: z.boolean().optional(),
      response: z.string().max(2000).optional(),
      duration: z
        .string()
        .max(100)
        .regex(/^P(?=\d|T\d)(?:\d+D)?(?:T(?=\d)(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/)
        .optional(),
    })
    .optional(),
  context: z.strictObject({ registration: z.uuid() }).optional(),
  timestamp: z.iso.datetime({ offset: true }).optional(),
});

export type StatementContext = {
  actorId: string;
  activityId: string;
  registration: string;
  platformOrigin: string;
};
export function validateStatement(input: unknown, context: StatementContext) {
  const parsed = statementSchema.safeParse(input);
  if (!parsed.success) return fail("El Statement xAPI contiene campos no válidos o no soportados.");
  const data = parsed.data;
  if (
    data.actor.account.homePage !== context.platformOrigin ||
    data.actor.account.name !== context.actorId ||
    data.object.id !== context.activityId ||
    (data.context && data.context.registration !== context.registration)
  )
    fail("El Statement no pertenece a esta sesión de aprendizaje.", 403);
  return {
    ...data,
    id: data.id ?? crypto.randomUUID(),
    context: { registration: context.registration },
  };
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonicalJson(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
