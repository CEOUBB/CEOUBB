import { expect, test } from "@playwright/test";

test("INV-01: un formulario externo no instala una cookie de sesión", async ({ page, context }) => {
  await page.setContent(
    '<form action="http://localhost:3123/api/auth/firebase" method="post" enctype="text/plain"><input name="idToken" value="synthetic"><button>Enviar</button></form>'
  );
  const [response] = await Promise.all([
    page.waitForNavigation(),
    page.getByRole("button", { name: "Enviar" }).click(),
  ]);
  expect(response?.status()).toBe(403);
  expect(await context.cookies()).toEqual([]);
});

test("INV-01: login exige JSON y rechaza Origin ajeno antes de verificar el token", async ({
  request,
}) => {
  const foreign = await request.post("/api/auth/firebase", {
    headers: { Origin: "https://foreign.example" },
    data: { idToken: "synthetic" },
  });
  expect(foreign.status()).toBe(403);
  expect(foreign.headers()["set-cookie"]).toBeUndefined();
  const plain = await request.post("/api/auth/firebase", {
    headers: { Origin: "http://localhost:3123", "Content-Type": "text/plain" },
    data: '{"idToken":"synthetic"}',
  });
  expect(plain.status()).toBe(415);
  expect(plain.headers()["set-cookie"]).toBeUndefined();
});
