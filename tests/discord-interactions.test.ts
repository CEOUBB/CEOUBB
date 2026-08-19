import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  verifyDiscordSignature,
  verifyDiscordRequestSignature,
  getDiscordPublicKeys,
} from "../lib/discord/signature.ts";
import {
  sanitizeTaskTitle,
  slugifyTitle,
  buildBranchName,
  buildAgentPromptResponse,
} from "../lib/discord/agent-prompt.ts";

test("verifyDiscordSignature: valida correctamente una firma Ed25519 auténtica", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const rawBody = JSON.stringify({ type: 1 });
  const timestamp = "1723766400";
  const message = Buffer.from(timestamp + rawBody);

  const signature = crypto.sign(null, message, privateKey).toString("hex");

  // Export raw 32-byte public key hex from SPKI
  const exportedSpki = publicKey.export({ type: "spki", format: "der" });
  // The Ed25519 SPKI DER prefix is 12 bytes: 302a300506032b6570032100 followed by 32-byte raw key
  const rawPublicKeyHex = exportedSpki.subarray(12).toString("hex");

  const isValid = verifyDiscordSignature(rawBody, signature, timestamp, rawPublicKeyHex);
  assert.equal(isValid, true, "La firma válida debe ser aceptada");
});

test("verifyDiscordSignature: rechaza un payload alterado o firma inválida", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const rawBody = JSON.stringify({ type: 1 });
  const timestamp = "1723766400";
  const signature = crypto.sign(null, Buffer.from(timestamp + rawBody), privateKey).toString("hex");
  const exportedSpki = publicKey.export({ type: "spki", format: "der" });
  const rawPublicKeyHex = exportedSpki.subarray(12).toString("hex");

  const tampered = verifyDiscordSignature(
    JSON.stringify({ type: 2 }),
    signature,
    timestamp,
    rawPublicKeyHex
  );
  assert.equal(tampered, false, "El payload alterado debe ser rechazado");

  const invalidKey = verifyDiscordSignature(
    rawBody,
    signature,
    timestamp,
    "0000000000000000000000000000000000000000000000000000000000000000"
  );
  assert.equal(invalidKey, false, "La clave pública incorrecta debe ser rechazada");
});

test("verifyDiscordSignature: maneja entradas vacías o malformadas sin lanzar excepción", () => {
  assert.equal(verifyDiscordSignature("", "", "", ""), false);
  assert.equal(verifyDiscordSignature("{}", "invalid-sig", "123", "invalid-pk"), false);
});

test("verifyDiscordRequestSignature: rechaza peticiones si no hay claves configuradas (fail-closed)", () => {
  const allowed = verifyDiscordRequestSignature("{}", "sig", "123", []);
  assert.equal(allowed, false);
});

test("getDiscordPublicKeys: retorna un array de claves públicas configuradas", () => {
  const keys = getDiscordPublicKeys();
  assert.ok(Array.isArray(keys));
});

test("verifyDiscordRequestSignature: valida contra lista de claves", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const rawBody = JSON.stringify({ type: 1 });
  const timestamp = "1723766400";
  const signature = crypto.sign(null, Buffer.from(timestamp + rawBody), privateKey).toString("hex");
  const rawPublicKeyHex = publicKey
    .export({ type: "spki", format: "der" })
    .subarray(12)
    .toString("hex");

  const keys = [
    "otherkey12345678901234567890123456789012345678901234567890123456",
    rawPublicKeyHex,
  ];
  const valid = verifyDiscordRequestSignature(rawBody, signature, timestamp, keys);
  assert.equal(valid, true);
});

test("sanitizeTaskTitle: limpia prefijos de Linear y prompts correctamente", () => {
  assert.equal(sanitizeTaskTitle("CEO-38: Sistema de calificaciones"), "Sistema de calificaciones");
  assert.equal(sanitizeTaskTitle("CEO-12 - Modularización"), "Modularización");
  assert.equal(sanitizeTaskTitle("Prompt: Revisar estilos"), "Revisar estilos");
  assert.equal(sanitizeTaskTitle("   "), "Tarea del sprint");
});

test("slugifyTitle: genera slugs limpios y sin acentos", () => {
  assert.equal(
    slugifyTitle("Gestión de Calificaciones & Evaluaciones"),
    "gestion-de-calificaciones-evaluaciones"
  );
  assert.equal(slugifyTitle(""), "tarea");
});

test("buildBranchName: deriva nombres de rama canónicos con formato feat/ceo-xx-slug", () => {
  assert.equal(
    buildBranchName("CEO-38", "Sistema de calificaciones"),
    "feat/ceo-38-sistema-de-calificaciones"
  );
  assert.equal(buildBranchName("", ""), "feat/ceo-task-tarea");
});

test("buildAgentPromptResponse: genera plantilla estructurada con reglas de AGENTS.md", () => {
  const response = buildAgentPromptResponse("CEO-42", "Refactorización de Interacciones");
  assert.ok(response.includes("CEO-42: Refactorización de Interacciones"));
  assert.ok(response.includes("feat/ceo-42-refactorizacion-de-interacciones"));
  assert.ok(response.includes("pnpm"));
  assert.ok(response.includes("lib/access-policy.ts"));
  assert.ok(response.includes("DESIGN.md"));
  assert.ok(response.includes("pnpm run test:unit"));
});
