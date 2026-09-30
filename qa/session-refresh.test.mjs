import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import React, { act } from "react";
import { transformSync } from "esbuild";

const transpile = (code, loader = "ts") =>
  transformSync(code, {
    loader,
    format: "cjs",
    ...(loader === "tsx" ? { jsx: "automatic" } : {}),
  }).code.replace(/\bimport\(([^)]+)\)/g, "Promise.resolve().then(() => require($1))");

const require = createRequire(import.meta.url);
const { JSDOM } = createRequire(require.resolve("isomorphic-dompurify"))("jsdom");
const { portalSessionReducer } = require("../app/portal-session.ts");
const icons = new Proxy({}, { get: () => () => null });
const navSource = await readFile(new URL("../app/portal-types.ts", import.meta.url), "utf8");
const navModule = { exports: {} };
new Function("require", "module", "exports", transpile(navSource, "ts"))(
  () => icons,
  navModule,
  navModule.exports
);
const { navReducer } = navModule.exports;
const source = await readFile(new URL("../app/usePortalCore.tsx", import.meta.url), "utf8");
const compiled = transpile(source, "tsx");

// Implements: REQ-PERF-LOAD-02
test("server refresh replaces retained client sessions and rejects old private responses", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://127.0.0.1" });
  const globals = [
    "window",
    "document",
    "IS_REACT_ACT_ENVIRONMENT",
    "requestAnimationFrame",
    "cancelAnimationFrame",
  ];
  const previous = globals.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.requestAnimationFrame = () => 0;
  globalThis.cancelAnimationFrame = () => {};
  dom.window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
  const listeners = { activity: [], activityError: [], gradebooks: [], communications: [] };
  let bootstrapRequests = 0;
  let archive;
  let core;
  const watch =
    (key) =>
    (_sections, ...args) => {
      listeners[key].push(args.find((value) => typeof value === "function"));

      if (key === "activity") listeners.activityError.push(args[1]);
      return () => {};
    };
  const adapters = {
    "@phosphor-icons/react": icons,
    "next/navigation": { useRouter: () => ({ refresh() {} }) },
    "../lib/mobile-bridge": {
      useAppVisibility: () => true,
      useExternalLinks() {},
      useHardwareBack() {},
      useIsMobileApp: () => false,
      useStatusBar() {},
    },
    "../lib/courses": {
      COURSES: [],
      partitionAcademicCourses: (sections) => ({
        current: sections.map((section) => ({ id: section.seccionId })),
        archived: [],
      }),
    },
    "../lib/teacher-course-client": { loadMyCourses: async () => [] },
    "./portal-types": {
      navReducer,
      readSeen: () => ({}),
      navItems: [],
      SEEN_KEY: "qa-seen",
      SETTINGS_SCREEN_LABEL: "Configuración",
    },
    "../lib/portal-utils": {
      calendarEntries: () => [],
      forgetPhoto() {},
      loadArchivedAcademicSections: () => {
        archive = Promise.withResolvers();
        return archive.promise;
      },
      loadCurrentSession: async () => {
        bootstrapRequests += 1;
        throw new Error("Unexpected client session bootstrap");
      },
      loadEnrolledSectionMemberships: async () => [],
    },
    "../lib/communications.ts": {
      announcementCursorKey: () => "",
      deriveNotifications: () => [],
      firebaseUserId: (value) => value,
      threadCursorKey: () => "",
      unreadCommunicationCount: () => 0,
      unreadCursorKeys: () => [],
    },
    "../lib/user-preferences": { forgetPreferences() {}, useReducedMotionPreference: () => false },
    "./portal-session": { portalSessionReducer },
    "../lib/section-roles": { sectionRoleFor: () => null },
    "../lib/push-notifications": { registerPushNotifications: async () => {} },
    "../lib/firebase-classroom-client": {
      watchCourseActivity: watch("activity"),
      watchGradebooks: watch("gradebooks"),
      watchCommunications: watch("communications"),
    },
  };
  const proxyModule = { exports: {} };
  new Function("require", "module", "exports", compiled)(
    (specifier) => adapters[specifier] ?? require(specifier),
    proxyModule,
    proxyModule.exports
  );
  const { usePortalCore } = proxyModule.exports;
  const { createRoot } = require("react-dom/client");
  const root = createRoot(dom.window.document.getElementById("root"));
  function Probe({ session }) {
    core = usePortalCore(session);
    return React.createElement("output", null, core.user?.id ?? "anonymous");
  }
  const session = (id, sectionIds) => ({
    user: id ? { id, name: id, email: `${id}@alumnos.ubiobio.cl`, role: "student" } : null,
    sectionIds,
    memberships: sectionIds.map((sectionId) => ({ sectionId, role: "student" })),
    sections: sectionIds.map((seccionId) => ({ seccionId })),
    archivedNextCursor: "archive-page",
  });
  const render = (value) =>
    act(async () => root.render(React.createElement(Probe, { session: value })));

  try {
    const first = session("first", ["old-course"]);
    await render(first);
    const stale = Object.fromEntries(
      Object.entries(listeners).map(([key, values]) => [key, values[0]])
    );
    await act(async () => {
      stale.communications({ threads: [], cursors: [], ready: true });
    });
    assert.equal(core.communicationsReady, false);
    assert.equal(core.notificationsLoading, true);
    await act(async () => {
      stale.activity([], true);
      stale.activityError("");
    });
    assert.equal(core.communicationsReady, true);
    assert.equal(core.notificationsLoading, false);
    assert.equal(core.communicationError, "");
    await act(async () => stale.activityError("No se pudieron actualizar los avisos."));
    assert.equal(core.communicationsReady, false);
    assert.equal(core.communicationError, "No se pudieron actualizar los avisos.");
    await act(async () => stale.activityError(""));
    assert.equal(core.communicationsReady, false);
    assert.equal(core.notificationsLoading, true);
    assert.equal(core.communicationError, "");
    await act(async () => {
      stale.activity([], true);
      stale.activityError("");
    });
    assert.equal(core.communicationsReady, true);
    assert.equal(core.notificationsLoading, false);
    await act(async () => {
      stale.activity([{ courseId: "old-course", createdAt: "old" }], true);
      stale.gradebooks([{ courseId: "old-course" }]);
      stale.communications({ threads: [{ courseId: "old-course" }], cursors: [] });
      core.enterCourse(core.courses[0]);
      core.setSearchOpen(true);
    });
    let pendingArchive;
    await act(async () => {
      pendingArchive = core.loadMoreArchived();
    });
    assert.equal(core.activity.length, 1);
    assert.equal(core.screen, "course");

    await render(session("second", ["new-course"]));
    assert.equal(core.user.id, "second");
    assert.deepEqual(
      core.courses.map(({ id }) => id),
      ["new-course"]
    );
    assert.deepEqual(
      core.memberships.map(({ sectionId }) => sectionId),
      ["new-course"]
    );
    assert.deepEqual(core.activity, []);
    assert.deepEqual(core.gradebooks, []);
    assert.deepEqual(core.communications.threads, []);
    assert.equal(core.screen, "courses");
    assert.equal(core.course, null);
    assert.equal(core.searchOpen, false);
    assert.equal(core.notificationsLoading, true);
    await act(async () => {
      stale.activity([], true);
      stale.activityError("");
    });
    assert.equal(core.communicationsReady, false);
    assert.equal(core.notificationsLoading, true);
    const current = Object.fromEntries(
      Object.entries(listeners).map(([key, values]) => [key, values.at(-1)])
    );
    await act(async () => {
      current.communications({ threads: [], cursors: [], ready: true });
      current.activity([], true);
      current.activityError("");
    });
    assert.equal(core.communicationsReady, true);
    assert.equal(core.notificationsLoading, false);
    await act(async () => {
      stale.activity([], false);
      stale.activityError("Error de la sesión anterior.");
    });
    assert.equal(core.communicationError, "");
    assert.equal(core.communicationsReady, true);
    assert.equal(core.notificationsLoading, false);
    await act(async () => {
      stale.activity([{ courseId: "old-course" }], true);
      stale.gradebooks([{ courseId: "old-course" }]);
      stale.communications({ threads: [{ courseId: "old-course" }], cursors: [] });
      stale.activityError("");
      archive.resolve({ sections: [{ seccionId: "old-archive" }], nextCursor: null });
      await pendingArchive;
    });
    assert.deepEqual(core.activity, []);
    assert.deepEqual(core.gradebooks, []);
    assert.deepEqual(core.communications.threads, []);
    assert.deepEqual(
      core.courses.map(({ id }) => id),
      ["new-course"]
    );

    assert.equal(core.communicationError, "");
    assert.equal(core.communicationsReady, true);
    assert.equal(core.notificationsLoading, false);

    await render(session("second", []));
    assert.deepEqual(core.memberships, []);
    assert.deepEqual(core.courses, []);
    const expired = session(null, []);
    await render(expired);
    assert.equal(core.user, null);
    assert.equal(core.checking, false);
    assert.equal(dom.window.document.querySelector("output").textContent, "anonymous");
    await act(async () => core.finishSignedInWithSession(first));
    await render(expired);
    assert.equal(core.user.id, "first");
    assert.equal(bootstrapRequests, 0);

    const hookSource = await readFile(
      new URL("../lib/hooks/use-hydrated-reduced-motion.ts", import.meta.url),
      "utf8"
    );
    let reducedMotion = null;
    const motionModule = { exports: {} };
    new Function("require", "module", "exports", transpile(hookSource, "ts"))(
      (specifier) =>
        specifier === "motion/react"
          ? { useReducedMotion: () => reducedMotion }
          : require(specifier),
      motionModule,
      motionModule.exports
    );
    const snapshots = [];
    function MotionProbe() {
      const reduce = motionModule.exports.useHydratedReducedMotion();
      snapshots.push(reduce);
      return React.createElement("div", {
        style: reduce ? { opacity: 1 } : { opacity: 1, transform: "none" },
      });
    }
    const { renderToString } = require("react-dom/server");
    const { hydrateRoot } = require("react-dom/client");
    const container = dom.window.document.createElement("div");
    container.innerHTML = renderToString(React.createElement(MotionProbe));
    reducedMotion = true;
    const failures = [];
    let hydratedRoot;
    await act(async () => {
      hydratedRoot = hydrateRoot(container, React.createElement(MotionProbe), {
        onRecoverableError: (error) => failures.push(error),
      });
    });
    assert.deepEqual(snapshots, [false, false, true]);
    assert.deepEqual(failures, []);
    assert.equal(container.firstElementChild.style.transform, "");
    await act(async () => hydratedRoot.unmount());
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

// Implements: REQ-PERF-LOAD-02
test("header platform shortcuts hydrate consistently and then show the Mac or Windows label", async () => {
  const headerSource = await readFile(new URL("../app/portal-shell.tsx", import.meta.url), "utf8");
  const headerModule = { exports: {} };
  const adapters = {
    "@phosphor-icons/react": icons,
    "next/dynamic": { __esModule: true, default: () => () => null },
    "../lib/portal-utils": require("../lib/portal-utils.ts"),
    "./animated-menu": icons,
    "./portal-types": { navItems: [] },
    "./portal-ui": icons,
    "./notification-panel": icons,
    "./site-footer": icons,
    "./views/CoursesDashboard": icons,
    "./views/ViewSkeletons": icons,
  };
  new Function("require", "module", "exports", transpile(headerSource, "tsx"))(
    (specifier) => adapters[specifier] ?? require(specifier),
    headerModule,
    headerModule.exports
  );
  const { PortalHeader } = headerModule.exports;
  const { renderToString } = require("react-dom/server");
  const { hydrateRoot } = require("react-dom/client");
  const keys = ["window", "document", "navigator", "IS_REACT_ACT_ENVIRONMENT"];
  const previous = keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);

  try {
    for (const [userAgent, expected] of [
      ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "⌘K"],
      ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "⌘K"],
      ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Ctrl K"],
    ]) {
      const dom = new JSDOM('<div id="root"></div>', { url: "http://127.0.0.1" });
      Object.defineProperty(dom.window.navigator, "userAgent", { value: userAgent });
      globalThis.window = dom.window;
      globalThis.document = dom.window.document;
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      const header = React.createElement(PortalHeader, {
        sidebarOpen: false,
        user: { id: "qa-user", name: "Docente QA", email: "qa@ubiobio.cl", role: "teacher" },
        context: "Área personal",
        notifications: [],
        notificationsLoading: false,
        unreadCommunications: 0,
        onLogout() {},
        onHome() {},
        onCommunications() {},
        onSettings() {},
        onSearch() {},
        onOpenNotification() {},
        onMarkAllNotifications() {},
        toggleSidebar() {},
      });
      const container = dom.window.document.getElementById("root");
      delete globalThis.window;
      delete globalThis.navigator;
      container.innerHTML = renderToString(header);
      assert.equal(container.querySelector(".header-search kbd").textContent, "Ctrl K");
      globalThis.window = dom.window;
      Object.defineProperty(globalThis, "navigator", {
        value: dom.window.navigator,
        configurable: true,
      });
      const failures = [];
      let hydratedRoot;

      try {
        await act(async () => {
          hydratedRoot = hydrateRoot(container, header, {
            onRecoverableError: (error) => failures.push(error.message),
          });
        });
        assert.deepEqual(failures, []);
        assert.equal(container.querySelector(".header-search kbd").textContent, expected);
        assert.equal(
          container.querySelector(".header-search").getAttribute("aria-keyshortcuts"),
          "Control+K Meta+K"
        );
      } finally {
        if (hydratedRoot) await act(async () => hydratedRoot.unmount());
        dom.window.close();
      }
    }
  } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

// Implements: REQ-PERF-LOAD-02
test("cached Google avatars hydrate from the server initials and preserve custom photo precedence", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://127.0.0.1" });
  const keys = ["window", "document", "IS_REACT_ACT_ENVIRONMENT"];
  const previous = keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const utils = require("../lib/portal-utils.ts");
  const email = "avatar@alumnos.ubiobio.cl";
  const googlePhoto = "https://lh3.googleusercontent.com/qa-avatar";
  utils.rememberPhoto(email, googlePhoto);
  assert.equal(utils.cachedPhoto(email), googlePhoto);
  const avatarSource = await readFile(new URL("../app/portal-ui.tsx", import.meta.url), "utf8");
  const avatarModule = { exports: {} };
  const adapters = {
    "../lib/portal-utils": utils,
    "../lib/firebase-client": {
      watchGooglePhoto: (callback) => {
        callback(null);
        return () => {};
      },
    },
    "../lib/hooks/use-hydrated-reduced-motion": {},
    "motion/react-m": {},
  };
  new Function("require", "module", "exports", transpile(avatarSource, "tsx"))(
    (specifier) => adapters[specifier] ?? require(specifier),
    avatarModule,
    avatarModule.exports
  );
  const { Avatar } = avatarModule.exports;
  const { renderToString } = require("react-dom/server");
  const { hydrateRoot } = require("react-dom/client");
  const container = dom.window.document.getElementById("root");
  let hydratedRoot;

  try {
    for (const photoUrl of [null, "https://example.test/custom-avatar.png"]) {
      const avatar = React.createElement(Avatar, { email, name: "Docente QA", photoUrl });
      delete globalThis.window;
      try {
        container.innerHTML = renderToString(avatar);
      } finally {
        globalThis.window = dom.window;
      }
      if (photoUrl) assert.equal(container.querySelector("img").getAttribute("src"), photoUrl);
      else assert.equal(container.textContent, "DQ");
      const failures = [];
      await act(async () => {
        hydratedRoot = hydrateRoot(container, avatar, {
          onRecoverableError: (error) => failures.push(error.message),
        });
      });
      assert.deepEqual(failures, []);
      assert.equal(container.querySelector("img").getAttribute("src"), photoUrl ?? googlePhoto);
      await act(async () => hydratedRoot.unmount());
      hydratedRoot = undefined;
    }
  } finally {
    if (hydratedRoot) await act(async () => hydratedRoot.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
