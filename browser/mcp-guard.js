async (page) => {
  // Run first in every Playwright MCP session (D-542), with browser_run_code_unsafe's `filename`:
  // every context of the browser, now and later, aborts a request that would write to a protected
  // project, touch a share link the session did not make (a Save to my workspace from one too), or
  // sign in as the seeded account. Reads of projects, and a duplicate of the 3D test copy, go
  // through. A link made on a duplicate is let through with `page.context().__allowShare.add(token)`.
  // A copy a page starts (Duplicate project, Save to my workspace) is renamed the moment it is made,
  // "BENCH DUP <yyyy-mm-dd hh:mm> — delete me" in UTC (A4, D-544); `page.context().__copies` holds
  // each job's renamed copy. Returns each context's refusals so far.
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
  const SHARE_COPY = /\/api\/workspace\/[^/]+\/share-copy\/?(?:[?#]|$)/;
  const COPY_START = /\/api\/workspace\/([^/]+)\/(?:project\/[^/]+\/duplicate|share-copy)\/?(?:[?#]|$)/;
  const refusal = (method, url, body, allowed) => {
    if (SHARE_COPY.test(url)) {
      let token = null;
      try {
        token = JSON.parse(String(body ?? "")).token;
      } catch {
        // No body to read: no link of the session's.
      }
      if (!allowed.has(String(token))) return "save a copy refused: a link not made by this session (D-542)";
    }
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
  const dupName = () => {
    const iso = new Date().toISOString();
    return `BENCH DUP ${iso.slice(0, 10)} ${iso.slice(11, 16)} — delete me`;
  };
  // A copy's job followed to its end, then the copy renamed, signed in as the page that started it.
  const rename = async (context, url, job, authorization) => {
    const projects = `${url.slice(0, url.indexOf("/api/"))}/api/workspace/${url.match(COPY_START)[1]}/project`;
    const send = async (method, target, data) => {
      const response = await context.request.fetch(target, { method, headers: authorization ? { authorization } : {}, ...(data ? { data } : {}) });
      if (!response.ok()) throw new Error(`${method} ${target}: ${response.status()}`);
      return response.json().catch(() => null);
    };
    const deadline = Date.now() + 900000;
    for (;;) {
      const state = await send("GET", `${projects}/duplicate/${job}`);
      if (state?.state === "done" && state.project_uuid) {
        const name = dupName();
        const renamed = await send("PATCH", `${projects}/${state.project_uuid}`, { name });
        if (renamed?.name !== name) throw new Error(`copy ${state.project_uuid}: not renamed`);
        return { uuid: state.project_uuid, name };
      }
      if (!state || state.state === "failed" || Date.now() > deadline) return null;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };
  const guard = async (context) => {
    if (context.__protectedRefusals) return;
    const refused = [];
    context.__protectedRefusals = refused;
    context.__allowShare = context.__allowShare ?? new Set();
    context.__copies = context.__copies ?? new Map();
    await context.route("**/api/**", async (route) => {
      const request = route.request();
      const why = refusal(request.method(), request.url(), request.postData(), context.__allowShare);
      if (why) {
        refused.push(`${request.method()} ${request.url()}: ${why}`);
        return route.abort("blockedbyclient");
      }
      return route.fallback();
    });
    context.on("response", (response) => {
      const request = response.request();
      if (request.method() !== "POST" || !response.ok() || !COPY_START.test(request.url())) return;
      void (async () => {
        const job = (await response.json().catch(() => null))?.job;
        if (!job || context.__copies.has(job)) return;
        const authorization = (await request.allHeaders()).authorization;
        context.__copies.set(job, rename(context, request.url(), job, authorization).catch((error) => ({ error: error.message })));
      })();
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
