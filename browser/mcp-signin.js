async (page) => {
  // Run second in every Playwright MCP session, after mcp-guard.js, with browser_run_code_unsafe's
  // `filename` (D-566). It signs in as the bench's second estimator (window-b, "Sara W.") and lands
  // where it is sent, never on Home. Home reopens the last sheet the account visited, and for this
  // account that has been the 3D test copy: a sign-in that landed on Home loaded the copy (the guard
  // refused its writes, but the copy loaded).
  // The landing is Account settings, which opens no project. If `page.context().__benchOpen` holds a
  // project's uuid, the page goes on to that project, once the api names it "BENCH DUP … — delete me".
  // Returns where the page landed and the guard's refusals so far.
  const APP = "http://localhost:5173";
  const API = "http://localhost:8000";
  const WORKSPACE = "69a35a11-ad9f-4a93-8f97-7f3f89f7d6b9"; // Bench Construction Test
  const LANDING = "/settings/account";
  const context = page.context();
  if (!context.__protectedRefusals) throw new Error("Run mcp-guard.js first (D-542).");
  // The login page goes on to `next` once signed in, or at once when a session is already held.
  await page.goto(`${APP}/login?next=${encodeURIComponent(LANDING)}`);
  await page.waitForFunction((landing) => location.pathname === landing || Boolean(document.querySelector("#email")), LANDING, { timeout: 30000 });
  if (new URL(page.url()).pathname !== LANDING) {
    await page.fill("#email", "window-b@bench.intelcost.io");
    await page.fill("#password", "bench-password-1");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname === LANDING, { timeout: 30000 });
  }
  const open = context.__benchOpen;
  if (open) {
    const name = await page.evaluate(
      async ({ api, workspace, uuid }) => {
        const { accessToken } = JSON.parse(localStorage.getItem("intelcost.session") ?? "{}");
        const response = await fetch(`${api}/api/workspace/${workspace}/project/${uuid}`, { headers: { authorization: `Bearer ${accessToken}` } });
        return response.ok ? (await response.json()).name : null;
      },
      { api: API, workspace: WORKSPACE, uuid: open },
    );
    if (!/^BENCH DUP .* — delete me$/.test(name ?? "")) throw new Error(`${open} is not a bench duplicate (${name}): not opened.`);
    await page.goto(`${APP}/project/${open}/takeoff`);
  }
  return { landed: page.url(), refused: [...context.__protectedRefusals] };
}
