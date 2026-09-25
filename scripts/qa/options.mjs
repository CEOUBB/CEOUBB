import { parseArgs as parseNodeArgs } from "node:util";
import { execFileSync } from "node:child_process";

const aliases = {
  cuestionarios: "quizzes",
  calendario: "calendar",
  comunicaciones: "communications",
  cursos: "courses",
  notas: "grades",
  entregas: "submissions",
  configuracion: "settings",
  administracion: "admin",
  acceso: "auth",
  participantes: "people",
  recursos: "resources",
  importaciones: "imports",
  interoperabilidad: "interop",
  publicacion: "publications",
};

// Implements: REQ-QA-01, REQ-QA-10
export function parseArgs(args) {
  const { values, positionals } = parseNodeArgs({
    args: args[0] === "--" ? args.slice(1) : args,
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      list: { type: "boolean" },
      json: { type: "boolean" },
      all: { type: "boolean" },
      screenshots: { type: "boolean" },
      explore: { type: "boolean" },
      staging: { type: "boolean" },
      "update-snapshots": { type: "boolean" },
      area: { type: "string" },
      scenario: { type: "string" },
      base: { type: "string" },
      browser: { type: "string" },
      reference: { type: "string" },
    },
  });
  if (positionals.length) throw new Error(`Unexpected arguments: ${positionals.join(" ")}`);
  if ([values.all, values.area, values.scenario].filter(Boolean).length > 1)
    throw new Error("--all, --area and --scenario cannot be used together.");
  if (values["update-snapshots"] && !values.screenshots)
    throw new Error("--update-snapshots requires --screenshots and explicit visual review.");
  if (values.staging && (values.explore || values["update-snapshots"]))
    throw new Error("Staging cannot be used together with exploration or reference updates.");
  if (values.explore && values.browser && !values.browser.startsWith("chromium-"))
    throw new Error("--explore requires a Chromium browser project for agent attachment.");
  return { ...values, area: aliases[values.area] ?? values.area };
}

// Implements: REQ-QA-10
export function changedFiles(base) {
  const git = (...args) =>
    execFileSync("git", args, {
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  try {
    let anchor = base;
    if (!anchor) {
      try {
        git("rev-parse", "--verify", "origin/main");
        anchor = "origin/main";
      } catch {
        anchor = "HEAD";
      }
    }
    const mergeBase = git("merge-base", "HEAD", anchor).trim();
    return [
      ...new Set(
        [
          ...git("diff", "--name-only", "-z", mergeBase).split("\0"),
          ...git("ls-files", "--others", "--exclude-standard", "-z").split("\0"),
        ].filter(Boolean)
      ),
    ];
  } catch {
    return null;
  }
}

// Implements: REQ-QA-01, REQ-QA-10
export function selectScenarios(catalog, options, changed) {
  let selected;
  let reason;
  if (options.scenario) {
    selected = catalog.filter((entry) => entry.id === options.scenario);
    reason = `scenario:${options.scenario}`;
  } else if (options.area) {
    selected = catalog.filter((entry) => entry.area === options.area);
    reason = `area:${options.area}`;
  } else if (options.all || options.list || changed === null) {
    selected = catalog;
    reason =
      changed === null && !options.all && !options.list
        ? "git-unavailable-full-fallback"
        : "complete-catalog";
  } else {
    const code = changed.filter(
      (file) =>
        !/^(docs\/|openspec\/|\.agents\/|\.github\/|\.jules\/|tests\/)/.test(file) &&
        !/\.(md|mdc)$/.test(file)
    );
    const matches = (entry, file) =>
      entry.sources.some((source) =>
        source.endsWith("/") ? file.startsWith(source) : source === file
      );
    const shared =
      /^(lib\/(auth|access-policy|firebase|services\/enrollment-projection)|db\/|firebase\/|components\/|app\/(Portal|portal-|campus\.css|globals\.css)|qa\/|scripts\/qa|.*config\.|package\.json|pnpm-lock\.yaml)/;
    const fallback = code.some(
      (file) => shared.test(file) || !catalog.some((entry) => matches(entry, file))
    );
    selected = fallback
      ? catalog
      : catalog.filter((entry) => entry.critical || code.some((file) => matches(entry, file)));
    reason = fallback ? "shared-or-unmapped-change-full-fallback" : "affected-plus-critical";
  }
  if (!selected.length) throw new Error("No scenarios match the selection. Use pnpm qa --list.");
  return { ids: selected.map((entry) => entry.id), scenarios: selected, reason, changed };
}
