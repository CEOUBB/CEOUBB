const { roleForEmail } = require("./generated/access-policy");

// Implements: REQ-SEC-01 — SEC-01/INV-02: política institucional y revocación compartidas.
function authenticationIsActive(auth, marker) {
  if (
    !auth ||
    auth.token.email_verified !== true ||
    typeof auth.token.email !== "string" ||
    !roleForEmail(auth.token.email)
  ) {
    return false;
  }
  return (
    !marker ||
    (marker.disabled !== true &&
      Number.isFinite(marker.revokedAt) &&
      Number.isFinite(auth.token.auth_time) &&
      auth.token.auth_time > marker.revokedAt)
  );
}

module.exports = { authenticationIsActive };
