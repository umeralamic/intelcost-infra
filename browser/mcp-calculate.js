async (page) => {
  // An earthwork Calculate on the sheet `page.context().__calcSheet` of the open project, through
  // its assumptions dialog with the saved answers (queue 2026-11-03). Returns the volume totals.
  const sheet = page.context().__calcSheet;
  const m = page.url().match(/\/project\/([0-9a-f-]{36})/);
  if (!sheet || !m) throw new Error("Open a project and set page.context().__calcSheet first.");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`http://localhost:5173/project/${m[1]}/takeoff/${sheet}?tab=earthwork`);
  await page.locator("[data-canvas-scale]").first().waitFor({ state: "attached", timeout: 120000 });
  await page.getByRole("button", { name: "Calculate", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Earthwork assumptions" });
  await dialog.waitFor({ timeout: 60000 });
  await dialog.getByRole("button", { name: "Calculate", exact: true }).click();
  await dialog.waitFor({ state: "detached", timeout: 60000 });
  const panel = page.getByRole("dialog", { name: "Earthwork Volumes" });
  await panel.locator("[data-volume-totals]").waitFor({ timeout: 300000 });
  // The lines and the site spreads are written after the panel shows: wait until the page sends nothing more.
  await page.waitForLoadState("networkidle", { timeout: 300000 }).catch(() => {});
  await page.waitForTimeout(5000);
  await page.waitForLoadState("networkidle", { timeout: 300000 }).catch(() => {});
  return (await panel.locator("[data-volume-totals]").innerText()).replace(/\n/g, " ");
}
