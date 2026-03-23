import { test, expect } from "./fixtures/auth";

test.describe("Autenticación", () => {
  test("dashboard carga con sesión válida", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    await expect(authedPage).not.toHaveURL(/\/login/);
  });

  test("sesión muestra datos del usuario", async ({ authedPage, testUser }) => {
    await authedPage.goto("/dashboard");
    await expect(authedPage.locator("body")).toContainText(testUser.name);
  });
});
