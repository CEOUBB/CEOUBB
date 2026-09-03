import { platformOrigin } from "../../../../../lib/interop/config.ts";
import { interopFailure, json } from "../../../../../lib/interop/http.ts";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const origin = platformOrigin();
    return json({
      issuer: origin,
      authorization_endpoint: origin + "/api/interop/lti/authorize",
      jwks_uri: origin + "/api/interop/lti/jwks",
      response_types_supported: ["id_token"],
      response_modes_supported: ["form_post"],
      scopes_supported: ["openid"],
      subject_types_supported: ["pairwise"],
      id_token_signing_alg_values_supported: ["RS256"],
      claims_supported: ["iss", "sub", "aud", "iat", "exp", "nonce"],
      lti_version: "1.3.0",
      lti_message_types: ["LtiResourceLinkRequest"],
    });
  } catch (error) {
    return interopFailure(error);
  }
}
