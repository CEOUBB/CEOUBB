import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "@playwright/test";
import { freePort } from "../scripts/qa/runtime.mjs";

test("an agent can attach to the configured exploration browser and operate its existing page", async () => {
  const previous = { explore: process.env.QA_EXPLORE, port: process.env.QA_CDP_PORT };
  const port = await freePort();
  process.env.QA_EXPLORE = "1";
  process.env.QA_CDP_PORT = String(port);
  let owner;
  let attached;
  try {
    const { default: config } = await import("../playwright.qa.config.ts");
    owner = await chromium.launch({ ...config.use.launchOptions, headless: true });
    const page = await owner.newPage();
    await page.setContent('<button type="button">Inspect</button>');
    await page.evaluate(() => {
      document.querySelector("button").addEventListener("click", () => {
        document.title = "Agent attached";
      });
    });
    attached = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    const existing = attached.contexts().flatMap((context) => context.pages());
    assert.equal(existing.length, 1);
    await existing[0].getByRole("button", { name: "Inspect" }).click();
    assert.equal(await page.title(), "Agent attached");
    await attached.close();
    attached = undefined;
    assert.equal(
      owner.isConnected(),
      true,
      "detaching an agent must preserve the owning QA browser"
    );
  } finally {
    await attached?.close();
    await owner?.close();
    for (const [key, value] of [
      ["QA_EXPLORE", previous.explore],
      ["QA_CDP_PORT", previous.port],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
