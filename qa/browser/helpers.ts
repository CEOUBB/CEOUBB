import { expect, type Page, type Route } from "@playwright/test";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { z } from "zod";
import { QA_PASSWORD, QA_SECTION_NAMES, QA_USERS } from "../fixtures.ts";
import type { QaRole } from "../catalog.ts";
import { cleanupQaSessions } from "../../scripts/qa/seed.ts";

// Implements: REQ-QA-02, REQ-QA-05
export async function login(
  page: Page,
  role: Exclude<QaRole, "public">,
  baseURL: string,
  options: { preserveSessions?: boolean } = {}
) {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!host || !projectId?.startsWith("demo-") || !apiKey || !/^127\.0\.0\.1:\d+$/.test(host)) {
    throw new Error("QA_AUTH_CONFIG: a demo project and loopback Auth emulator are required.");
  }
  const account = QA_USERS[role];
  if (!options.preserveSessions) await cleanupQaSessions(role);
  const app = initializeApp({ apiKey, projectId }, `qa-${role}-${Date.now()}`);
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${host}`, { disableWarnings: true });
    const credential = await signInWithEmailAndPassword(auth, account.email, QA_PASSWORD);
    expect(credential.user.uid).toBe(account.uid);
    expect(credential.user.emailVerified).toBe(true);
    const idToken = await credential.user.getIdToken();
    const response = await page.context().request.post(`${baseURL}/api/auth/firebase`, {
      headers: { Origin: new URL(baseURL).origin },
      data: { idToken },
    });
    expect(response.status(), "Ordinary Firebase-to-web session exchange").toBe(200);
    const session = await response.json();
    expect(session.user.id).toBe(account.id);
    // Use Firebase's own serialization of the authenticated emulator user. The browser
    // SDK restores and refreshes this real identity; no fabricated FirebaseUser is used.
    await page.addInitScript(
      ({ key, value, origin }) => {
        if (location.origin !== origin || sessionStorage.getItem("qa-auth-restored")) return;
        localStorage.setItem(key, value);
        sessionStorage.setItem("qa-auth-restored", "1");
      },
      {
        key: `firebase:authUser:${apiKey}:[DEFAULT]`,
        value: JSON.stringify(credential.user.toJSON()),
        origin: new URL(baseURL).origin,
      }
    );
  } finally {
    await deleteApp(app);
  }
  await page.goto(baseURL);
  await expect(page.locator(".app-header")).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Hola,/ })).toBeVisible();
  // Confirm the browser SDK restored the emulator identity and its real Firestore
  // subscription before taking stable checkpoints of the authenticated shell.
  const sectionName = QA_SECTION_NAMES[role === "outsider" ? "other" : "active"];
  const expectedPosts = role === "outsider" ? "3 publicaciones" : "4 publicaciones";
  await expect(
    page
      .locator(".course-card")
      .filter({ hasText: sectionName })
      .getByText(expectedPosts, { exact: true })
  ).toBeVisible();
}

export async function navigate(page: Page, label: string) {
  await page.getByRole("button", { name: "Buscar ramos y vistas", exact: true }).click();
  const input = page.getByRole("combobox", { name: "Buscar en Centro de Estudio UBB" });
  await input.fill(label);
  const option = page.getByRole("option").filter({ hasText: label }).first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(input).not.toBeVisible();
}

export async function accountMenu(page: Page) {
  await page.locator(".account-menu > summary").click();
  await expect(page.locator(".account-popover")).toBeVisible();
}

export async function settings(page: Page) {
  await accountMenu(page);
  await page
    .locator(".account-popover")
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Configuración", exact: true })).toBeVisible();
}

export async function course(page: Page, kind: "active" | "empty" | "archived" = "active") {
  const name = { active: "QA Aula activa", empty: "QA Aula vacía", archived: "QA Aula archivada" }[
    kind
  ];
  if (kind === "archived") {
    const archive = page.locator(".archived-courses summary");
    if (await archive.count()) await archive.click();
    await page.getByRole("button", { name: `Abrir en solo lectura el ramo ${name}` }).click();
  } else {
    await page.getByRole("button", { name: `Entrar al aula de ${name}` }).click();
  }
  const enter = page.getByRole("button", { name: "Entrar al aula", exact: true });
  if (await enter.isVisible()) await enter.click();
  await expect(page.getByRole("heading", { name, exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Secciones del aula" })).toBeVisible();
}

export async function classroomTab(page: Page, label: string) {
  const tab = page
    .getByRole("tablist", { name: "Secciones del aula" })
    .getByRole("tab", { name: label, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

export async function controlledError(page: Page, path: string) {
  await page.route(path, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "QA controlled service failure" }),
    })
  );
}

export async function holdRequest(page: Page, path: string) {
  let release: () => void = () => undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const handler = async (route: Route) => {
    if (route.request().method() === "OPTIONS") {
      await route.continue().catch(() => undefined);
      return;
    }
    await pending;
    await route.continue().catch(() => undefined);
  };
  await page.route(path, handler);
  return async () => {
    release();
    await page.unroute(path, handler);
  };
}

export async function firestoreDocument(path: string) {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const project = process.env.FIREBASE_PROJECT_ID;
  if (!host || !/^127\.0\.0\.1:\d+$/.test(host) || !project?.startsWith("demo-"))
    throw new Error("QA_FIRESTORE_CONFIG: local emulator required.");
  const response = await fetch(
    `http://${host}/v1/projects/${project}/databases/(default)/documents/${path}`,
    { headers: { Authorization: "Bearer owner" } }
  );
  if (!response.ok)
    throw new Error(`QA_FIRESTORE_DOCUMENT_FAILED: HTTP ${response.status} for ${path}`);
  expect(response.status, `Persisted document ${path}`).toBe(200);
  return response.json();
}

export async function removeQaMessage(body: string) {
  await removeQaDocuments("courses/qa-active/messageThreads/qa-student", "messages", "body", body);
}

export async function removeQaMutationDocuments() {
  await removeQaMessage("Mensaje sintético de verificación QA");
  await removeQaDocuments("courses/qa-active", "posts", "title", "Publicación sintética QA");
  await removeQaDocuments(
    "users/qa-student",
    "calendar_events",
    "title",
    "QA bloque de verificación"
  );
}

async function removeQaDocuments(
  parentPath: string,
  collection: string,
  field: string,
  value: string
) {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const project = process.env.FIREBASE_PROJECT_ID;
  if (!host || !/^127\.0\.0\.1:\d+$/.test(host) || !project?.startsWith("demo-"))
    throw new Error("QA_FIRESTORE_CONFIG: local emulator required.");
  const parent = `projects/${project}/databases/(default)/documents/${parentPath}`;
  const headers = { Authorization: "Bearer owner", "Content-Type": "application/json" };
  const response = await fetch(`http://${host}/v1/${parent}:runQuery`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { stringValue: value } },
        },
        limit: 10,
      },
    }),
  });
  if (!response.ok)
    throw new Error(`QA_FIRESTORE_QUERY_FAILED: HTTP ${response.status} for ${parentPath}`);
  expect(response.status).toBe(200);
  const records = z
    .array(z.object({ document: z.object({ name: z.string() }).optional() }))
    .parse(await response.json());
  for (const record of records) {
    if (!record.document) continue;
    const path = record.document.name;
    if (
      !path.startsWith(`${parent}/${collection}/`) ||
      path.slice(`${parent}/${collection}/`.length).includes("/")
    )
      throw new Error("QA cleanup refused a document outside the synthetic conversation.");
    const removed = await fetch(`http://${host}/v1/${path}`, { method: "DELETE", headers });
    if (!removed.ok)
      throw new Error(`QA_FIRESTORE_DELETE_FAILED: HTTP ${removed.status} for ${path}`);
    expect(removed.status).toBe(200);
  }
}
