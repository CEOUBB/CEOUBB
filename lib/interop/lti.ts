import { z } from "zod";
import { platformOrigin, secureUrl } from "./config.ts";
import { escapeXml, fail } from "./errors.ts";
import type { SectionRole } from "../section-roles.ts";

const jwkSchema = z.object({
  kty: z.literal("RSA"),
  kid: z.string().min(1).max(100),
  n: z.string().min(342).max(1400),
  e: z.literal("AQAB"),
  d: z.string().min(1),
  p: z.string().min(1),
  q: z.string().min(1),
  dp: z.string().min(1),
  dq: z.string().min(1),
  qi: z.string().min(1),
  alg: z.literal("RS256").optional(),
  use: z.literal("sig").optional(),
  key_ops: z.array(z.string()).optional(),
  ext: z.boolean().optional(),
});
export function privateLtiKey() {
  try {
    const key = jwkSchema.parse(JSON.parse(process.env.LTI_PRIVATE_JWK ?? ""));
    const modulus = Buffer.from(key.n, "base64url");
    if (modulus.length < 256 || (modulus[0] & 0x80) === 0) throw new Error();
    return key;
  } catch {
    return fail("La clave RSA de LTI no está configurada correctamente.", 503);
  }
}
export function publicLtiKeys() {
  const key = privateLtiKey();
  const keys = [{ kty: "RSA", n: key.n, e: key.e, kid: key.kid, alg: "RS256", use: "sig" }];
  if (process.env.LTI_PREVIOUS_PUBLIC_JWKS) {
    try {
      const previous = z
        .object({
          keys: z
            .array(
              z
                .object({
                  kty: z.literal("RSA"),
                  n: z.string().min(342).max(1400),
                  e: z.literal("AQAB"),
                  kid: z.string().min(1).max(100),
                  alg: z.literal("RS256").optional(),
                  use: z.literal("sig").optional(),
                })
                .strict()
            )
            .max(3),
        })
        .strict()
        .parse(JSON.parse(process.env.LTI_PREVIOUS_PUBLIC_JWKS));
      for (const item of previous.keys) {
        if (keys.some((k) => k.kid === item.kid)) throw new Error();
        keys.push({ ...item, alg: "RS256", use: "sig" });
      }
    } catch {
      return fail("Las claves públicas anteriores de LTI no son válidas.", 503);
    }
  }
  return { keys };
}
export const oidcSchema = z
  .object({
    client_id: z.string().min(1).max(128),
    login_hint: z.string().regex(/^[a-f0-9]{64}$/),
    lti_message_hint: z.string().min(1).max(128).optional(),
    redirect_uri: z.string().max(2000),
    response_type: z.literal("id_token"),
    response_mode: z.literal("form_post"),
    scope: z.literal("openid"),
    prompt: z.literal("none"),
    nonce: z.string().min(1).max(512),
    state: z.string().min(1).max(2048),
  })
  .strict();
export function ltiRole(role: SectionRole | "owner") {
  const names = {
    student: "Learner",
    teacher: "Instructor",
    coordinator: "Instructor",
    assistant: "Learner",
    owner: "Administrator",
  };
  return "http://purl.imsglobal.org/vocab/lis/v2/membership#" + names[role];
}
export async function signLtiLaunch(input: {
  clientId: string;
  deploymentId: string;
  userId: string;
  resourceId: string;
  sectionId: string;
  title: string;
  role: SectionRole | "owner";
  targetUrl: string;
  nonce: string;
}) {
  const key = privateLtiKey();
  const now = Math.floor(Date.now() / 1000);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input.clientId + "\0" + input.userId)
  );
  const claims = {
    iss: platformOrigin(),
    sub: Buffer.from(digest).toString("hex"),
    aud: input.clientId,
    iat: now,
    exp: now + 60,
    nonce: input.nonce,
    "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
    "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
    "https://purl.imsglobal.org/spec/lti/claim/deployment_id": input.deploymentId,
    "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": secureUrl(input.targetUrl),
    "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
      id: input.resourceId,
      title: input.title,
    },
    "https://purl.imsglobal.org/spec/lti/claim/context": {
      id: input.sectionId,
      type: ["http://purl.imsglobal.org/vocab/lis/v2/course#CourseSection"],
    },
    "https://purl.imsglobal.org/spec/lti/claim/roles": [ltiRole(input.role)],
  };
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: key.kid })).toString(
    "base64url"
  );
  const body = header + "." + Buffer.from(JSON.stringify(claims)).toString("base64url");
  const imported = await crypto.subtle.importKey(
    "jwk",
    key,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    imported,
    new TextEncoder().encode(body)
  );
  return body + "." + Buffer.from(signature).toString("base64url");
}
export function ltiFormResponse(redirect: string, token: string, state: string) {
  const nonce = crypto.randomUUID();
  const html =
    '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Abrir herramienta académica</title><body><form method="post" action="' +
    escapeXml(redirect) +
    '"><input type="hidden" name="id_token" value="' +
    escapeXml(token) +
    '"><input type="hidden" name="state" value="' +
    escapeXml(state) +
    '"><button type="submit">Continuar a la herramienta</button></form><script nonce="' +
    nonce +
    '">document.forms[0].submit()</script></body></html>';
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'none'; script-src 'nonce-" +
        nonce +
        "'; form-action " +
        new URL(redirect).origin +
        "; frame-ancestors 'none'; base-uri 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
