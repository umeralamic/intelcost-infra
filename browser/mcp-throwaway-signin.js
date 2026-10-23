async (page) => {
  // Run second in a Playwright MCP session, after mcp-guard.js, with browser_run_code_unsafe's
  // `filename` (the night of 2026-10-23, D-729). Signs in as this session's own throwaway account,
  // `fx.equip.<stamp>@bench.intelcost.io`, registered here on first use with a random password made
  // in this process and kept only on the browser context, so no password reaches a command, a file
  // or the transcript. Never the founder's accounts, never window-b, never Bench Construction Test.
  // Lands on Account settings. Returns the email and the account's workspaces.
  const APP = "http://localhost:5173";
  const API = "http://localhost:8000";
  const context = page.context();
  if (!context.__protectedRefusals) throw new Error("Run mcp-guard.js first (D-542).");
  if (!context.__fx) {
    const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 12);
    const bytes = new Uint8Array(18);
    globalThis.crypto.getRandomValues(bytes);
    const password = "Fx-" + Buffer.from(bytes).toString("base64url");
    context.__fx = { email: `fx.equip.${stamp}@bench.intelcost.io`, password, fullName: "Equip Night" };
    const made = await context.request.post(`${API}/api/auth/register`, {
      data: { email: context.__fx.email, password, full_name: context.__fx.fullName },
    });
    if (!made.ok() && made.status() !== 409) throw new Error(`register: ${made.status()} ${(await made.text()).slice(0, 200)}`);
  }
  const { email, password } = context.__fx;
  await page.goto(`${APP}/login?next=${encodeURIComponent("/settings/account")}`);
  await page.waitForFunction(() => location.pathname === "/settings/account" || Boolean(document.querySelector("#email")), null, { timeout: 30000 });
  if (new URL(page.url()).pathname !== "/settings/account") {
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => url.pathname === "/settings/account", { timeout: 30000 });
  }
  const workspaces = await page.evaluate(async (api) => {
    const { accessToken } = JSON.parse(localStorage.getItem("intelcost.session") ?? "{}");
    const r = await fetch(`${api}/api/workspace`, { headers: { authorization: `Bearer ${accessToken}` } });
    return r.ok ? (await r.json()).map((w) => ({ uuid: w.uuid, name: w.name })) : r.status;
  }, API);
  return { email, landed: new URL(page.url()).pathname, workspaces, refusals: context.__protectedRefusals.length };
}
