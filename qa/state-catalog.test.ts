import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { test } from "node:test";
import { QA_SCENARIOS } from "./catalog.ts";

test("every shipped App Router page has an explicit QA catalog source mapping", () => {
  const mapped = new Set(QA_SCENARIOS.flatMap((scenario) => scenario.sources));
  const pages = readdirSync("app", { recursive: true })
    .map((path) => String(path).replaceAll("\\", "/"))
    .filter((path) => /(?:^|\/)page\.[jt]sx?$/.test(path));
  assert.ok(pages.length > 0);
  for (const path of pages) {
    assert.ok(mapped.has(`app/${path}`), `Shipped route missing from QA inventory: app/${path}`);
  }
});
