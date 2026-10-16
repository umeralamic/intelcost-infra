async (page) => {
  // Run first in every Playwright MCP session (D-542), with browser_run_code_unsafe's `filename`:
  // every context of the browser, now and later, aborts a request that would write to a protected
  // project, touch a share link the session did not make, or sign in as the seeded account. Reads
  // of projects, and a duplicate of the 3D test copy, go through. A link made on a duplicate is let
  // through with `page.context().__allowShare.add(token)`. Returns each context's refusals so far.
  // The MCP's sandbox cannot import, so the rule is written out here; it is lib/protected.mjs's,
  // and the guard check compares the two lists.
  const PROTECTED = {
    "042c8817-4a65-47ba-95d8-686ecf986246": "Hidden Valley Rebid — 3D test",
    "9c348237-1ca6-42d0-bd8c-712d7cf915c1": "HIdden Valley Spec",
    "bd8fc5b0-34ca-4186-99f0-7278c43b4c1c": "Hidden Valley Spec Building Rebid",
    "51e474d2-b55b-40d2-ab46-09433ffc5add": "Waxing City",
    "09f1fc14-42f4-4140-9726-bcaf3056ea87": "Minmar",
  };
  const TEST_COPY = "042c8817-4a65-47ba-95d8-686ecf986246";
  const refusal = (method, url, body, allowed) => {
    const share = url.match(/\/api\/share\/([^/?#]+)\//);
    // Every guest request stamps the link, a read too: only links this session made.
    if (share && !allowed.has(decodeURIComponent(share[1]))) return "share link refused: not made by this session (D-542)";
    const verb = String(method).toUpperCase();
    // The seeded account (the founder's) is never signed in from a browser (CLAUDE.md).
    if (verb === "POST" && /\/api\/auth\/login(?:[?#]|$)/.test(url) && String(body ?? "").includes("estimator@bench.intelcost.io")) return "sign-in refused: the seeded account (D-542)";
    if (verb === "GET" || verb === "HEAD" || verb === "OPTIONS") return null;
    const text = `${url} ${body ?? ""}`;
    for (const [uuid, name] of Object.entries(PROTECTED)) {
      if (!text.includes(uuid)) continue;
      if (uuid === TEST_COPY && verb === "POST" && new RegExp(`/project/${uuid}/duplicate/?(\\?|$)`).test(url)) continue;
      return `${verb} refused: it names "${name}" (D-542)`;
    }
    return null;
  };
  const guard = async (context) => {
    if (context.__protectedRefusals) return;
    const refused = [];
    context.__protectedRefusals = refused;
    context.__allowShare = context.__allowShare ?? new Set();
    await context.route("**/api/**", async (route) => {
      const request = route.request();
      const why = refusal(request.method(), request.url(), request.postData(), context.__allowShare);
      if (why) {
        refused.push(`${request.method()} ${request.url()}: ${why}`);
        return route.abort("blockedbyclient");
      }
      return route.fallback();
    });
  };
  const browser = page.context().browser();
  for (const context of browser ? browser.contexts() : [page.context()]) await guard(context);
  if (browser && !browser.__protected) {
    const make = browser.newContext.bind(browser);
    browser.newContext = async (...args) => {
      const context = await make(...args);
      await guard(context);
      return context;
    };
    browser.__protected = true;
  }
  const contexts = browser ? browser.contexts() : [page.context()];
  return contexts.map((c, i) => ({ context: i, guarded: Boolean(c.__protectedRefusals), refused: c.__protectedRefusals }));
}
