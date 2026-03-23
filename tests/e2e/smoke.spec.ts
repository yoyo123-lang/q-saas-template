import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("health endpoint responde OK", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("healthy");
  });

  test("landing page carga", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveTitle(/error/i);
  });

  test("login page carga", async ({ page }) => {
    await page.goto("/login");
    await expect(page).not.toHaveTitle(/error/i);
  });

  test("ruta protegida redirige a login sin sesión", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
