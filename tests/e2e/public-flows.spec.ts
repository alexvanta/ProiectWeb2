import { expect, test } from "@playwright/test";

test.describe("Public SuperLiga flows (Light & Dark)", () => {
  test("displays 2025/2026 official standings vs 2026/2027 active season, switches Light/Dark without console errors, and switches tabs", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    // 1. Open home (active Season 2026/2027)
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "SuperLiga României",
    );

    // 2. Switch to completed real Season 2025/2026
    const seasonSelect = page.getByLabel("Selectează sezon");
    await seasonSelect.selectOption("2025-2026");
    await expect(page).toHaveURL(/season=2025-2026/);
    await expect(page.locator("table")).toContainText("Universitatea Craiova");
    await expect(page.locator("table")).toContainText("60");
    await expect(page.locator("table")).toContainText("Petrolul Ploiești");
    await expect(page.locator("table")).toContainText("Csíkszereda Miercurea Ciuc");

    // 3. Switch tabs: CLASAMENT -> FORMA -> MARCATORI -> CLASAMENT
    await page.getByRole("tab", { name: "FORMA" }).click();
    await expect(page.getByRole("tab", { name: "FORMA" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.getByRole("tab", { name: "MARCATORI" }).click();
    await expect(page.getByRole("tab", { name: "MARCATORI" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.getByRole("tab", { name: "CLASAMENT" }).click();

    // 4. Switch Light -> Dark and verify persistence across reload
    await page.getByLabel("Comută pe tema întunecată").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Switch back to Light
    await page.getByLabel("Comută pe tema deschisă").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // 5. Switch back to active Season 2026/2027
    await page.getByLabel("Selectează sezon").selectOption("2026-2027");
    await expect(page).toHaveURL(/season=2026-2027/);

    expect(consoleErrors).toEqual([]);
  });

  test("filters /program fixtures and serves valid iCal (.ics) export", async ({
    page,
    request,
  }) => {
    await page.goto("/program?season=2026-2027");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Program & rezultate",
    );

    // Filter by Round 1
    await page.getByLabel("Etapă").selectOption("1");
    await expect(page.getByText("Etapa 1 · Tur")).toBeVisible();

    // Verify iCal endpoint returns valid VCALENDAR
    const seasonsRes = await request.get("/api/seasons");
    expect(seasonsRes.ok()).toBe(true);
    const { seasons } = await seasonsRes.json();
    const activeSeason = seasons.find((s: { isActive: boolean }) => s.isActive);
    expect(activeSeason).toBeTruthy();

    const fixturesRes = await request.get(
      `/api/seasons/${activeSeason.id}/fixtures?round=1`,
    );
    expect(fixturesRes.ok()).toBe(true);
    const { fixtures } = await fixturesRes.json();
    const teamId = fixtures[0]?.homeTeam?.id;
    expect(teamId).toBeTruthy();

    const icalRes = await request.get(`/api/ical/${activeSeason.id}/${teamId}`);
    expect(icalRes.status()).toBe(200);
    expect(icalRes.headers()["content-type"]).toContain("text/calendar");
    const icsBody = await icalRes.text();
    expect(icsBody).toContain("BEGIN:VCALENDAR");
    expect(icsBody).toContain("BEGIN:VEVENT");
    expect(icsBody).toContain("END:VCALENDAR");
  });
});
