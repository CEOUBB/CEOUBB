import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canManageSectionContent,
  canTeachSection,
  parseSectionMemberships,
  sectionRoleFor,
  sectionRoleLabel,
} from "../lib/section-roles.ts";

// Implements: REQ-ASST-01, REQ-ASST-05
test("section capabilities keep assistant content access separate from teaching", () => {
  assert.equal(canManageSectionContent("owner", null), true);
  assert.equal(canTeachSection("owner", null), true);
  assert.equal(canManageSectionContent("teacher", "teacher"), true);
  assert.equal(canTeachSection("teacher", "teacher"), true);
  assert.equal(canManageSectionContent("teacher", "coordinator"), true);
  assert.equal(canTeachSection("teacher", "coordinator"), true);
  assert.equal(canManageSectionContent("student", "assistant"), true);
  assert.equal(canTeachSection("student", "assistant"), false);
  assert.equal(canManageSectionContent("student", "student"), false);
  assert.equal(canTeachSection("student", "student"), false);
  assert.equal(canManageSectionContent("teacher", "student"), false);
  assert.equal(canTeachSection("teacher", "student"), false);
});

// Implements: REQ-ASST-01, REQ-ASST-02
test("membership parsing rejects malformed roles and ambiguous duplicate sections", () => {
  const memberships = parseSectionMemberships([
    { sectionId: "mat-2026-2-1", role: "assistant" },
    { sectionId: "fis-2026-2-2", role: "student" },
    { sectionId: "dup-2026-2-1", role: "student" },
    { sectionId: "dup-2026-2-1", role: "assistant" },
    { sectionId: "bad role", role: "assistant" },
    { sectionId: "qui-2026-2-1", role: "owner" },
    null,
  ]);

  assert.deepEqual(memberships, [
    { sectionId: "mat-2026-2-1", role: "assistant" },
    { sectionId: "fis-2026-2-2", role: "student" },
  ]);
  assert.equal(sectionRoleFor(memberships, "mat-2026-2-1"), "assistant");
  assert.equal(sectionRoleFor(memberships, "fis-2026-2-2"), "student");
  assert.equal(sectionRoleFor(memberships, "dup-2026-2-1"), null);
  assert.equal(sectionRoleLabel("assistant"), "Ayudante");
});

// Implements: REQ-ASST-02
test("session APIs transport bounded section memberships alongside legacy ids", async () => {
  const catalog = await readFile(
    new URL("../lib/services/academic-catalog.ts", import.meta.url),
    "utf8"
  );
  const authRoute = await readFile(new URL("../app/api/auth/me/route.ts", import.meta.url), "utf8");
  const enrollmentRoute = await readFile(
    new URL("../app/api/enrollments/me/route.ts", import.meta.url),
    "utf8"
  );

  assert.match(catalog, /function listUserSectionMemberships\([\s\S]*?\.limit\(limit\)/);
  assert.match(authRoute, /listUserSectionMemberships/);
  assert.match(authRoute, /Response\.json\(\{ user, sectionIds, memberships \}\)/);
  assert.match(enrollmentRoute, /listUserSectionMemberships/);
  assert.match(enrollmentRoute, /Response\.json\(\{ sectionIds, memberships \}\)/);
});

// Implements: REQ-ASST-03, REQ-ASST-04, REQ-ASST-05
test("Firebase grants assistants content only and preserves teacher-only academic paths", async () => {
  const firestore = await readFile(new URL("../firebase/firestore.rules", import.meta.url), "utf8");
  const storage = await readFile(new URL("../firebase/storage.rules", import.meta.url), "utf8");

  assert.match(firestore, /function sectionRole\(seccionId\)/);
  assert.match(firestore, /function assistsSection\(seccionId\)/);
  assert.match(firestore, /function managesSectionContent\(seccionId\)/);
  assert.match(
    firestore,
    /match \/courses\/\{courseId\}\/posts\/\{postId\}[\s\S]*?allow create: if managesSectionContent\(courseId\)/
  );
  assert.match(
    firestore,
    /match \/courses\/\{courseId\}\/meta\/\{documentId\}[\s\S]*?allow write: if teachesSection\(courseId\)/
  );
  assert.match(
    firestore,
    /match \/courses\/\{courseId\}\/grades\/\{userId\}[\s\S]*?allow write: if false;/
  );
  assert.match(
    storage,
    /match \/courses\/\{courseId\}\/\{userId\}\/\{fileName\}[\s\S]*?allow create, update: if managesSectionContent\(courseId\)/
  );
  assert.match(
    storage,
    /match \/courses\/\{courseId\}\/submissions\/[\s\S]*?allow create, update: if isMember\(\) && isEnrolled\(courseId\)/
  );
});

// Implements: REQ-ASST-01, REQ-ASST-03, REQ-ASST-04
test("the classroom UI separates content controls from teacher data listeners", async () => {
  const handler = await readFile(
    new URL("../app/views/classroom/use-classroom-handlers.ts", import.meta.url),
    "utf8"
  );
  const view = await readFile(
    new URL("../app/views/classroom/ClassroomView.tsx", import.meta.url),
    "utf8"
  );
  const materials = await readFile(
    new URL("../app/views/classroom/MaterialsSection.tsx", import.meta.url),
    "utf8"
  );

  assert.match(handler, /sectionRole/);
  assert.match(handler, /canManageSectionContent/);
  assert.match(handler, /canTeachSection/);
  assert.match(view, /canManageContent=\{canManageContent\}/);
  assert.match(view, /canTeach=\{canTeach\}/);
  assert.match(materials, /canManageContent/);
  assert.match(view, /sectionRole=\{sectionRole\}/);
});
