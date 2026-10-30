async (page) => {
  // Run first in every Playwright MCP session (D-542, D-601), with browser_run_code_unsafe's
  // `filename`: every context of the browser, now and later, aborts a request that would write to a
  // protected project, open one of the founder's own (reads too), touch a share link the session did
  // not make (a Save to my workspace from one too), or sign in as one of the founder's accounts.
  // Reads of the 3D test copy, and a duplicate of it, go through. A link made on a duplicate is let through with `page.context().__allowShare.add(token)`.
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
    // umeralam.q@gmail.com's workspace, Intelcost Team, found by owner (2026-10-17, D-601).
    "90cb3a75-3553-4de0-aac4-1693c7d18d57": "Miramar Cove Vault Buildings",
    "c1770e62-715a-4d1d-8be5-aa2f23ecdeed": "11",
    "4df73dc7-901b-4933-b2bb-fafc327b01f0": "Hidden Valley Rebid — 3D test (shared copy)",
    "6ca7f34b-6ab2-4a29-874e-67d39d45b616": "10793 SBR",
    // The founder's copy of the shared copy (2026-10-30 overnight brief).
    "9e3b9d2d-8cf4-45db-8980-a519d7efdaf9": "Hidden Valley Rebid — 3D test (shared copy) (shared copy)",
    // The rest of Bench Construction Test (workspace 69a35a11), all 17 projects guarded (D-881).
    "48ee1ed1-151a-49f6-87d2-4c23dffda452": "Riverside Medical Center",
    "4452f8f1-537b-4fa2-9ef3-6a4fec2062cd": "trdt",
    "3ba916aa-bef6-469f-8456-d11e0772a500": "Lilly",
    "c0144c30-a769-40f7-a516-3382561e8ec6": "multipart smoke",
    "4a19fd97-c8bd-47ef-bd8a-41d4b7e17a0d": "wweedd",
    "8af33201-a81d-488d-90f1-2317c12ef06c": "LLAADD",
    "08ab6b4b-6a18-4fca-abad-15cd3bb15aa6": "Umer Check",
    "25711190-6ef4-4190-8f64-91a882bb5820": "Test 3344",
    "557a8c48-c48f-4c94-a031-f087c6c8e6d2": "Hendrick Honda (10786)",
    "97d18924-fc37-4015-8f8d-d43c2ac794c7": "Test project",
    "21c099b1-1a9a-49db-8b80-c6a3b9a0dcc8": "Test 3",
    "dd3065bf-ec08-4f49-adcf-f268db833f7c": "Dania Pointe position test",
    "7aba5c72-2be8-41bc-a177-517488dffaf5": "CCCP",
  };
  // The founder's own workspaces that hold no bench project: never opened, reads too (D-601).
  const FOUNDER_WORKSPACES = {
    "04df326a-6dba-41df-ac98-095bf841f910": "Intelcost Team (umeralam.q@gmail.com)",
    // All of Bench Construction Test, a project added later too (D-891).
    "69a35a11-ad9f-4a93-8f97-7f3f89f7d6b9": "Bench Construction Test",
  };
  // The founder's accounts: never signed in as (D-542, D-601).
  const FOUNDER_EMAILS = ["estimator@bench.intelcost.io", "umeralam.q@gmail.com"];
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
    // A guest's requests, and a member opening a link (`/api/share-link/<token>/as-member`).
    const share = url.match(/\/api\/share(?:-link)?\/([^/?#]+)\//);
    // Every guest request stamps the link, a read too: only links this session made.
    if (share && !allowed.has(decodeURIComponent(share[1]))) return "share link refused: not made by this session (D-542)";
    const verb = String(method).toUpperCase();
    // The founder's accounts are never signed in from a browser (CLAUDE.md, D-601).
    const lower = String(body ?? "").toLowerCase();
    if (verb === "POST" && /\/api\/auth\/login(?:[?#]|$)/.test(url) && FOUNDER_EMAILS.some((e) => lower.includes(e))) return "sign-in refused: a founder account (D-542, D-601)";
    const text = `${url} ${body ?? ""}`;
    // The founder's own projects and workspaces are never opened, any method (D-601).
    for (const [uuid, name] of [...Object.entries(PROTECTED), ...Object.entries(FOUNDER_WORKSPACES)]) {
      if (uuid !== TEST_COPY && text.includes(uuid)) return `${verb} refused: it names "${name}", the founder's own (D-601)`;
    }
    if (verb === "GET" || verb === "HEAD" || verb === "OPTIONS") return null;
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
