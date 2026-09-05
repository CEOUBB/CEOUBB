const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}\b/giu;
const RUT_PATTERN = /(?<!\d)(?:\d{1,2}(?:\.\d{3}){2}|\d{7,8})[-\s]?[0-9K](?!\d)/giu;
const JWT_PATTERN = /\beyJ[A-Z0-9_-]{5,}\.[A-Z0-9_-]{5,}\.[A-Z0-9_-]{5,}\b/giu;
const BEARER_PATTERN = /\bbearer\s+[^\s,;]{3,}/giu;
const CREDENTIAL_NAME =
  "(?:api[\\s_-]*key|access[\\s_-]*token|refresh[\\s_-]*token|client[\\s_-]*secret|password|passwd|passphrase|contrase(?:n|ñ)a|clave|token|cookie|jwt|authorization|credencial(?:es)?|credentials?|secret(?:o)?)";
const CREDENTIAL_ASSIGNMENT_PATTERN = new RegExp(
  `\\b(${CREDENTIAL_NAME})\\s*(=|:|\\bis\\b|\\bes\\b)\\s*(?:"[^"\\r\\n]{1,1000}"|'[^'\\r\\n]{1,1000}'|[^\\r\\n,;}\\]]{2,1000})`,
  "giu"
);
const HTTP_URL_PATTERN = /https?:\/\/[^\s<>"']+/giu;
const SECRET_WORDS = new Set([
  "apikey",
  "authorization",
  "clave",
  "contrasena",
  "cookie",
  "credencial",
  "credenciales",
  "credential",
  "credentials",
  "jwt",
  "passwd",
  "passphrase",
  "password",
  "rut",
  "secret",
  "secreto",
  "token",
]);

function normalizedIdentifier(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

function identifierWords(value: string) {
  return normalizedIdentifier(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function compactIdentifier(value: string) {
  return normalizedIdentifier(value).replace(/[^a-z0-9]/g, "");
}

function decodedComponent(value: string) {
  let decoded = value;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) return decoded;
      decoded = next;
    } catch {
      return null;
    }
  }
  try {
    return decodeURIComponent(decoded) === decoded ? decoded : null;
  } catch {
    return null;
  }
}

function patternMatches(pattern: RegExp, value: string) {
  pattern.lastIndex = 0;
  return pattern.test(value);
}

function redactPattern(pattern: RegExp, value: string, replacement: string) {
  pattern.lastIndex = 0;
  return value.replace(pattern, replacement);
}

function componentContainsSecretName(value: string) {
  return value
    .split(/[\s/&=?#;:,.+]+/)
    .filter(Boolean)
    .some(isSecretFieldName);
}

function urlContainsSecretMaterial(url: URL) {
  const path = decodedComponent(url.pathname);
  const hash = decodedComponent(url.hash.slice(1));
  if (
    path === null ||
    hash === null ||
    componentContainsSecretName(path) ||
    componentContainsSecretName(hash) ||
    containsDirectCredentialMaterial(path) ||
    containsDirectCredentialMaterial(hash)
  ) {
    return true;
  }
  for (const [key, value] of url.searchParams) {
    const decodedKey = decodedComponent(key);
    const decodedValue = decodedComponent(value);
    if (
      decodedKey === null ||
      decodedValue === null ||
      isSecretFieldName(decodedKey) ||
      componentContainsSecretName(decodedValue) ||
      containsDirectCredentialMaterial(decodedValue)
    ) {
      return true;
    }
  }
  return false;
}

function urlContainsPersonalData(url: URL) {
  const values = [decodedComponent(url.pathname), decodedComponent(url.hash.slice(1))];
  for (const [key, value] of url.searchParams) {
    values.push(decodedComponent(key), decodedComponent(value));
  }
  return values.some((value) => value === null || containsPersonalData(value));
}

function containsDirectCredentialMaterial(value: string) {
  return (
    patternMatches(CREDENTIAL_ASSIGNMENT_PATTERN, value) ||
    patternMatches(BEARER_PATTERN, value) ||
    patternMatches(JWT_PATTERN, value)
  );
}

function parsedHttpUrl(value: string) {
  const candidate = value.trim();
  const hasInvalidCharacter = Array.from(candidate).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f || /\s/u.test(character);
  });
  if (!candidate || hasInvalidCharacter) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function containsEmailAddress(value: string) {
  return patternMatches(EMAIL_PATTERN, value);
}

export function containsChileanRut(value: string) {
  return patternMatches(RUT_PATTERN, value);
}

export function containsPersonalData(value: string) {
  return containsEmailAddress(value) || containsChileanRut(value);
}

export function redactPersonalData(value: string) {
  return redactPattern(
    RUT_PATTERN,
    redactPattern(EMAIL_PATTERN, value, "[correo omitido]"),
    "[RUT omitido]"
  );
}

export function isSecretFieldName(value: string) {
  const compact = compactIdentifier(value);
  if (!compact) return false;
  const words = identifierWords(value);
  if (words.some((word) => SECRET_WORDS.has(word))) return true;
  if (compact.includes("apikey")) return true;
  return ["accesstoken", "refreshtoken", "clientsecret", "sessioncookie", "userpassword"].some(
    (secret) => compact.includes(secret)
  );
}

export function containsCredentialLikeMaterial(value: string) {
  if (containsDirectCredentialMaterial(value)) return true;
  HTTP_URL_PATTERN.lastIndex = 0;
  for (const match of value.matchAll(HTTP_URL_PATTERN)) {
    const url = parsedHttpUrl(match[0].replace(/[),.;]+$/u, ""));
    if (url && (url.username || url.password || urlContainsSecretMaterial(url))) return true;
  }
  return false;
}

export function containsForbiddenSecretMaterial(value: unknown) {
  const pending: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
  let visited = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) break;
    visited += 1;
    if (visited > 100_000 || current.depth > 64) return true;
    if (typeof current.value === "string") {
      if (containsCredentialLikeMaterial(current.value)) return true;
      continue;
    }
    if (Array.isArray(current.value)) {
      for (const child of current.value) {
        pending.push({ value: child, depth: current.depth + 1 });
      }
      continue;
    }
    if (typeof current.value !== "object" || current.value === null) continue;
    for (const [key, child] of Object.entries(current.value)) {
      if (isSecretFieldName(key)) return true;
      pending.push({ value: child, depth: current.depth + 1 });
    }
  }
  return false;
}

export const containsForbiddenSecretField = containsForbiddenSecretMaterial;

export function redactSensitiveText(value: string) {
  let redacted = redactPersonalData(value);
  redacted = redactPattern(JWT_PATTERN, redacted, "[JWT omitido]");
  redacted = redactPattern(BEARER_PATTERN, redacted, "Bearer [secreto omitido]");
  CREDENTIAL_ASSIGNMENT_PATTERN.lastIndex = 0;
  return redacted.replace(
    CREDENTIAL_ASSIGNMENT_PATTERN,
    (_match, name: string, separator: string) => `${name}${separator} [secreto omitido]`
  );
}

export function isAdeccaHost(hostname: string) {
  return hostname
    .toLowerCase()
    .split(".")
    .some((label) => label.includes("adecca"));
}

export function safeAdeccaHttpUrl(value: string) {
  const url = parsedHttpUrl(value);
  if (
    !url ||
    url.username ||
    url.password ||
    isAdeccaHost(url.hostname) ||
    urlContainsSecretMaterial(url) ||
    urlContainsPersonalData(url)
  ) {
    return "";
  }
  return url.href;
}

export function containsUnsafeHttpUrl(value: string) {
  HTTP_URL_PATTERN.lastIndex = 0;
  for (const match of value.matchAll(HTTP_URL_PATTERN)) {
    const candidate = match[0].replace(/[),.;]+$/u, "");
    if (!safeAdeccaHttpUrl(candidate)) return true;
  }
  return false;
}
