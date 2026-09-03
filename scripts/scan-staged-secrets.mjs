import { execSync } from "node:child_process";

const SECRET_PATTERNS = [
  { name: "Google API Key", regex: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: "Turso JWT Token", regex: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/ },
  { name: "Discord Bot Token", regex: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27}/ },
  { name: "Private Key PEM", regex: /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/ },
];

try {
  const stagedDiff = execSync("git diff --cached --unified=0", { encoding: "utf8" });
  if (!stagedDiff) process.exit(0);

  const lines = stagedDiff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
  const found = [];

  for (const line of lines) {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(line)) {
        found.push(pattern.name);
      }
    }
  }

  if (found.length > 0) {
    console.error("\n[Pre-commit] ALERTA DE SEGURIDAD: Secretos detectados en staged diff:");
    found.forEach((name) => console.error(` - Posible ${name}`));
    console.error("Operación de commit cancelada para prevenir fuga de credenciales.\n");
    process.exit(1);
  }
} catch {
  process.exit(0);
}
