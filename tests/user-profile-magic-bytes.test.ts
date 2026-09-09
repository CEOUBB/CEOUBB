// Implements: REQ-SEC-12, REQ-CFG-02, REQ-CFG-04, REQ-CFG-05
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  defaultPreferences,
  detectImageMagicBytes,
  projectUserPhotoToFirestore,
  readPreferencesFromFirestore,
  writePreferencesToFirestore,
} from "../lib/services/user-profile.ts";

function createBufferFromBytes(bytes: number[]): ArrayBuffer {
  const array = new Uint8Array(bytes);
  return array.buffer;
}

function createTextBuffer(text: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(text).buffer;
}

test("REQ-SEC-12/REQ-CFG-02: detectImageMagicBytes detecta correctamente formatos de imagen admitidos", () => {
  // 1. PNG válido (cabecera de 8 bytes canónica + padding hasta >= 12 bytes)
  const validPng = createBufferFromBytes([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
  assert.equal(detectImageMagicBytes(validPng), "image/png");

  // Exactamente 12 bytes PNG
  const exact12Png = createBufferFromBytes([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02, 0x03, 0x04,
  ]);
  assert.equal(detectImageMagicBytes(exact12Png), "image/png");

  // 2. JPEG válido (SOI: 0xFF, 0xD8, 0xFF + marcador JFIF/EXIF + padding >= 12 bytes)
  const validJpegJfif = createBufferFromBytes([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  assert.equal(detectImageMagicBytes(validJpegJfif), "image/jpeg");

  const validJpegExif = createBufferFromBytes([
    0xff, 0xd8, 0xff, 0xe1, 0x00, 0x18, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
  ]);
  assert.equal(detectImageMagicBytes(validJpegExif), "image/jpeg");

  // 3. WebP válido (RIFF en 0..3 y WEBP en 8..11)
  const validWebp = createBufferFromBytes([
    0x52,
    0x49,
    0x46,
    0x46, // 'R', 'I', 'F', 'F'
    0x24,
    0x00,
    0x00,
    0x00, // tamaño
    0x57,
    0x45,
    0x42,
    0x50, // 'W', 'E', 'B', 'P'
    0x56,
    0x50,
    0x38,
    0x20, // 'V', 'P', '8', ' '
  ]);
  assert.equal(detectImageMagicBytes(validWebp), "image/webp");
});

test("REQ-SEC-12/REQ-CFG-02: detectImageMagicBytes rechaza buffers nulos, vacíos o menores a 12 bytes", () => {
  assert.equal(detectImageMagicBytes(null as unknown as ArrayBuffer), null);
  assert.equal(detectImageMagicBytes(undefined as unknown as ArrayBuffer), null);
  assert.equal(detectImageMagicBytes(new ArrayBuffer(0)), null);
  assert.equal(detectImageMagicBytes(new ArrayBuffer(4)), null);
  assert.equal(detectImageMagicBytes(new ArrayBuffer(11)), null);

  // Buffer con prefijo JPEG pero de sólo 11 bytes
  const shortJpeg = createBufferFromBytes([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
  ]);
  assert.equal(detectImageMagicBytes(shortJpeg), null);

  // Buffer con prefijo PNG pero de sólo 8 bytes
  const shortPng = createBufferFromBytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(detectImageMagicBytes(shortPng), null);
});

test("REQ-SEC-12/REQ-CFG-02: detectImageMagicBytes rechaza formatos no admitidos", () => {
  // GIF89a y GIF87a
  const gif89a = createTextBuffer("GIF89a\x01\x00\x01\x00\x80\x00\x00");
  assert.equal(detectImageMagicBytes(gif89a), null);

  const gif87a = createTextBuffer("GIF87a\x01\x00\x01\x00\x80\x00\x00");
  assert.equal(detectImageMagicBytes(gif87a), null);

  // PDF
  const pdfBuffer = createTextBuffer("%PDF-1.4\n1 0 obj\n<<>>");
  assert.equal(detectImageMagicBytes(pdfBuffer), null);

  // HTML / SVG
  const htmlBuffer = createTextBuffer("<!DOCTYPE html><html><body></body></html>");
  assert.equal(detectImageMagicBytes(htmlBuffer), null);

  const svgBuffer = createTextBuffer('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  assert.equal(detectImageMagicBytes(svgBuffer), null);

  // Ejecutable DOS/PE (MZ)
  const exeBuffer = createBufferFromBytes([
    0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
  ]);
  assert.equal(detectImageMagicBytes(exeBuffer), null);

  // Archivo ZIP / JAR
  const zipBuffer = createBufferFromBytes([
    0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00,
  ]);
  assert.equal(detectImageMagicBytes(zipBuffer), null);
});

test("REQ-SEC-12/REQ-CFG-02: detectImageMagicBytes rechaza cabeceras corruptas o variantes RIFF ajenas", () => {
  // RIFF contenedor de Audio WAV (bytes 8..11 son WAVE, no WEBP)
  const wavAudio = createBufferFromBytes([
    0x52,
    0x49,
    0x46,
    0x46, // 'RIFF'
    0x24,
    0x00,
    0x00,
    0x00,
    0x57,
    0x41,
    0x56,
    0x45, // 'WAVE'
  ]);
  assert.equal(detectImageMagicBytes(wavAudio), null);

  // RIFF contenedor AVI (bytes 8..11 son 'AVI ')
  const aviVideo = createBufferFromBytes([
    0x52,
    0x49,
    0x46,
    0x46, // 'RIFF'
    0x60,
    0x00,
    0x00,
    0x00,
    0x41,
    0x56,
    0x49,
    0x20, // 'AVI '
  ]);
  assert.equal(detectImageMagicBytes(aviVideo), null);

  // RIFF con offset 8..11 nulos
  const riffEmpty = createBufferFromBytes([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  assert.equal(detectImageMagicBytes(riffEmpty), null);

  // Cabecera que tiene WEBP en offset 8..11 pero no RIFF al inicio
  const fakeWebp = createBufferFromBytes([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);
  assert.equal(detectImageMagicBytes(fakeWebp), null);

  // Cabecera que casi es PNG pero con un byte corrupto en la posición 4
  const corruptPng = createBufferFromBytes([
    0x89, 0x50, 0x4e, 0x47, 0x00, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  assert.equal(detectImageMagicBytes(corruptPng), null);

  // Cabecera que casi es JPEG pero con el tercer byte corrupto
  const corruptJpeg = createBufferFromBytes([
    0xff, 0xd8, 0x00, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  assert.equal(detectImageMagicBytes(corruptJpeg), null);
});

test("REQ-CFG-04: readPreferencesFromFirestore rechaza identificadores de usuario malformados", async () => {
  const invalidUserIds = [
    "",
    "   ",
    "\t",
    "\n",
    "../escape",
    "../../etc/passwd",
    "user/traversal",
    "path/to/resource",
    "user name with spaces",
    "firebase:../malformed",
    "firebase:with space",
    "firebase:",
    "firebase:   ",
  ];

  for (const userId of invalidUserIds) {
    await assert.rejects(
      async () => await readPreferencesFromFirestore(userId),
      (err: unknown) => err instanceof Error && err.message === "Identificador de usuario inválido."
    );
  }
});

test("REQ-CFG-04: readPreferencesFromFirestore degrada suavemente retornando valores por defecto ante 404 o fallos de red", async (t) => {
  const originalEmail = process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL;
  const originalKey = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY;

  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

  process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL = "profile-test@example.test";
  process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY = privateKeyPem;

  t.after(() => {
    if (originalEmail !== undefined) {
      process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL = originalEmail;
    } else {
      delete process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL;
    }
    if (originalKey !== undefined) {
      process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY = originalKey;
    } else {
      delete process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY;
    }
  });

  const defaults = defaultPreferences();

  // Caso A: Firestore responde con HTTP 404 (documento inexistente para usuario nuevo)
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    if (url === "https://oauth2.googleapis.com/token") {
      return Response.json({ access_token: "mock-pref-token-404", expires_in: 3600 });
    }
    if (url.includes("/settings/preferences")) {
      return new Response("Not Found", { status: 404 });
    }
    return new Response("Unexpected", { status: 500 });
  });

  const res404 = await readPreferencesFromFirestore("user-without-settings-123");
  assert.deepEqual(res404, defaults);

  // Caso B: Fallo de red simulado (fetch arroja excepción de transporte)
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    if (url === "https://oauth2.googleapis.com/token") {
      return Response.json({ access_token: "mock-pref-token-net", expires_in: 3600 });
    }
    if (url.includes("/settings/preferences")) {
      throw new TypeError("Failed to fetch: simulated network drop");
    }
    return new Response("Unexpected", { status: 500 });
  });

  const resNetwork = await readPreferencesFromFirestore("user-network-error-456");
  assert.deepEqual(resNetwork, defaults);

  // Caso C: Firestore responde con HTTP 500 (degradación suave requerida)
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    if (url === "https://oauth2.googleapis.com/token") {
      return Response.json({ access_token: "mock-pref-token-500", expires_in: 3600 });
    }
    if (url.includes("/settings/preferences")) {
      return new Response("Internal Server Error", { status: 500 });
    }
    return new Response("Unexpected", { status: 500 });
  });

  const res500 = await readPreferencesFromFirestore("user-server-error-789");
  assert.deepEqual(res500, defaults);

  // Caso D: Credenciales de servicio ausentes en entorno sin backend (degradación suave en try-catch)
  delete process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const resNoCreds = await readPreferencesFromFirestore("user-no-credentials-999");
  assert.deepEqual(resNoCreds, defaults);
});

test("REQ-CFG-04: readPreferencesFromFirestore retorna preferencias personalizadas cuando el documento existe", async (t) => {
  const originalEmail = process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL;
  const originalKey = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY;

  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

  process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL = "profile-test@example.test";
  process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY = privateKeyPem;

  t.after(() => {
    if (originalEmail !== undefined) {
      process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL = originalEmail;
    } else {
      delete process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL;
    }
    if (originalKey !== undefined) {
      process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY = originalKey;
    } else {
      delete process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY;
    }
  });

  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = String(input);
    if (url === "https://oauth2.googleapis.com/token") {
      return Response.json({ access_token: "mock-pref-token-custom", expires_in: 3600 });
    }
    if (url.includes("/settings/preferences")) {
      return Response.json({
        fields: {
          channels: {
            mapValue: {
              fields: {
                sectionPublications: {
                  mapValue: {
                    fields: { web: { booleanValue: false }, push: { booleanValue: true } },
                  },
                },
                teacherAnnouncements: {
                  mapValue: {
                    fields: { web: { booleanValue: true }, push: { booleanValue: false } },
                  },
                },
                gradeChanges: {
                  mapValue: {
                    fields: { web: { booleanValue: false }, push: { booleanValue: false } },
                  },
                },
                assessmentReminders: {
                  mapValue: {
                    fields: { web: { booleanValue: true }, push: { booleanValue: true } },
                  },
                },
              },
            },
          },
          reducedMotion: { booleanValue: true },
        },
      });
    }
    return new Response("Not Found", { status: 404 });
  });

  const custom = await readPreferencesFromFirestore("firebase:user-with-custom-settings");
  assert.equal(custom.reducedMotion, true);
  assert.equal(custom.channels.sectionPublications.web, false);
  assert.equal(custom.channels.sectionPublications.push, true);
  assert.equal(custom.channels.teacherAnnouncements.web, true);
  assert.equal(custom.channels.teacherAnnouncements.push, false);
  assert.equal(custom.channels.gradeChanges.web, false);
  assert.equal(custom.channels.gradeChanges.push, false);
  assert.equal(custom.channels.assessmentReminders.web, true);
  assert.equal(custom.channels.assessmentReminders.push, true);
});

test("REQ-CFG-02/REQ-CFG-03: projectUserPhotoToFirestore rechaza identificadores con recorrido o escape de ruta", async () => {
  const dangerousUids = [
    "",
    "   ",
    "\t",
    "\n",
    "../admin",
    "../../secrets",
    "users/victim",
    "path/to/avatar",
    "firebase:../root",
    "firebase:user/subdir",
    "firebase:",
    "firebase:  ",
  ];

  for (const uid of dangerousUids) {
    await assert.rejects(
      async () => await projectUserPhotoToFirestore(uid, "https://storage.example.test/photo.png"),
      (err: unknown) => err instanceof Error && err.message === "Identificador de usuario inválido."
    );

    await assert.rejects(
      async () => await projectUserPhotoToFirestore(uid, null),
      (err: unknown) => err instanceof Error && err.message === "Identificador de usuario inválido."
    );
  }
});

test("REQ-CFG-04/REQ-CFG-05: writePreferencesToFirestore rechaza identificadores con recorrido o escape de ruta", async () => {
  const prefs = defaultPreferences();
  const dangerousUids = [
    "",
    "   ",
    "\t",
    "\n",
    "../admin",
    "../../secrets",
    "users/victim",
    "path/to/prefs",
    "firebase:../root",
    "firebase:user/subdir",
    "firebase:",
    "firebase:  ",
  ];

  for (const uid of dangerousUids) {
    await assert.rejects(
      async () => await writePreferencesToFirestore(uid, prefs),
      (err: unknown) => err instanceof Error && err.message === "Identificador de usuario inválido."
    );
  }
});
