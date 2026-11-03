async (page) => {
  // The open project's Estimating to Excel, saved where `page.context().__exportTo` names (queue
  // 2026-11-03): all columns, all rows, all layers in one tab, without formulas, so a script can
  // read each line's figures. Opens the Estimating tab when the page is elsewhere.
  const to = page.context().__exportTo;
  if (!to) throw new Error("Set page.context().__exportTo first.");
  const m = page.url().match(/\/project\/([0-9a-f-]{36})/);
  await page.goto(`http://localhost:5173/project/${m[1]}/takeoff?tab=estimating`);
  await page.waitForFunction(() => /Bid total/.test(document.body.innerText), null, { timeout: 180000 });
  const open = page.getByRole("dialog", { name: /Export to Excel/ });
  if (!(await open.isVisible().catch(() => false))) await page.getByRole("button", { name: "Export", exact: true }).first().click();
  await open.waitFor();
  for (const label of ["All columns", "All rows", "All layers in one tab", "Without formulas"]) await open.getByText(label, { exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 120000 }), open.getByRole("button", { name: "Export", exact: true }).click()]);
  await download.saveAs(to);
  return { saved: to, name: download.suggestedFilename() };
}
