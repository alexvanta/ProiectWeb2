import { expect, test } from "@playwright/test";

test.describe("Authentication & RBAC role flows (D-002, D-005)", () => {
  test("redirects unauthenticated visitors from protected panels to /login", async ({
    page,
  }) => {
    for (const protectedPath of ["/capitan", "/arbitru", "/admin"]) {
      await page.goto(protectedPath);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("Captain login -> server rejects match sheet containing a suspended player", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("capitan@craiova.ro");
    await page.getByLabel("Parolă").fill("Capitan123!");
    await page.getByRole("button", { name: /Intră în cont/i }).click();

    await expect(page).toHaveURL(/\/capitan/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Panou Căpitan",
    );

    // Open first fixture's match sheet
    await page.getByText("Completează foaia →").first().click();
    await expect(page).toHaveURL(/\/capitan\/foaie-meci\//);

    // Click test button that submits a suspended player directly to the server API
    const testBtn = page.getByRole("button", {
      name: /Testează respingere server/i,
    });
    await expect(testBtn).toBeVisible();
    await testBtn.click();

    // Server unconditionally rejects with 422 and displays Romanian error alert
    await expect(page.getByRole("alert")).toContainText(
      "Foaia de meci a fost respinsă: jucători suspendați detectați",
    );
  });

  test("Referee login -> audited result correction with mandatory reason records before/after snapshot", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("arbitru@superliga.ro");
    await page.getByLabel("Parolă").fill("Arbitru123!");
    await page.getByRole("button", { name: /Intră în cont/i }).click();

    await expect(page).toHaveURL(/\/arbitru/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Panou Arbitru / Organizator",
    );

    // First fixture in Season 2 is PLAYED (Round 1) -> requires correction reason
    const reasonBox = page.getByPlaceholder(/Corecție cartonaș galben/i);
    await expect(reasonBox).toBeVisible();
    await reasonBox.fill("Corecție E2E validată de observatorul partidei");

    await page
      .getByRole("button", { name: /Salvează corecția/i })
      .click();

    await expect(page.getByRole("status").first()).toContainText(
      "Corecția a fost salvată cu audit",
    );
    await expect(page.getByText("Corecție E2E validată de observatorul partidei").first()).toBeVisible();
    await expect(page.getByText(/BEFORE:/).first()).toBeVisible();
    await expect(page.getByText(/AFTER:/).first()).toBeVisible();
  });

  test("Admin login -> accesses Admin panel and generates schedule preview", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@superliga.ro");
    await page.getByLabel("Parolă").fill("Admin123!");
    await page.getByRole("button", { name: /Intră în cont/i }).click();

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Panou Admin",
    );

    await page.getByRole("button", { name: "Generează preview" }).click();
    await expect(page.getByText(/30.*etape.*240.*meciuri/i)).toBeVisible();
  });
});
