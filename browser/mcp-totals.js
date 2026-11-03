async (page) => {
  // The open project's Estimating figures, as the page shows them (queue 2026-11-03): direct cost,
  // labor, material, equipment, bid total and Needs attention. Opens the Estimating tab when the
  // page is elsewhere. Reads only.
  const m = page.url().match(/\/project\/([0-9a-f-]{36})/);
  if (!m) throw new Error("Open a project first.");
  // Always a fresh load: a page left open keeps the equipment it read before a Calculate.
  await page.goto(`http://localhost:5173/project/${m[1]}/takeoff?tab=estimating`);
  await page.waitForFunction(() => /Bid total/.test(document.body.innerText), null, { timeout: 180000 });
  // Settled: the same text three times running, three seconds apart, after the page has had five seconds
  // (new lines are priced in waves: two equal reads once came before them).
  await page.waitForTimeout(5000);
  let last = "";
  let same = 0;
  for (let i = 0; i < 40 && same < 2; i++) {
    const now = await page.locator("body").innerText();
    const sum = now.slice(0, now.search(/\nEstimate\n/));
    same = sum === last ? same + 1 : 0;
    last = sum;
    await page.waitForTimeout(3000);
  }
  const grab = (label) => {
    const r = new RegExp(`${label}[^\\n]*\\n(\\$[\\d,.]+|—)`).exec(last);
    return r ? r[1] : null;
  };
  return {
    direct: grab("Direct cost"),
    labor: grab("Labor"),
    material: grab("Material"),
    equipment: grab("Equipment"),
    bid: grab("Bid total"),
    attention: (/Needs attention\n(\d+)/.exec(last) ?? [])[1] ?? null,
  };
}
