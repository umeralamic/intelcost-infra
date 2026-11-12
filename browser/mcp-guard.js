async (page) => {
  // Run first in every Playwright MCP session (D-542, D-601), with browser_run_code_unsafe's
  // `filename`: every context of the browser, now and later, aborts a request that would write to a
  // protected project, open one of the founder's own (reads too), touch a share link the session did
  // not make (a Save to my workspace from one too), or sign in as one of the founder's accounts.
  // Reads of the 3D test copy, and a duplicate of it, go through. A link made on a duplicate is let through with `page.context().__allowShare.add(token)`.
  // A copy a page starts (Duplicate project, Save to my workspace) is renamed the moment it is made,
  // "BENCH DUP <yyyy-mm-dd hh:mm> — delete me" in UTC (A4, D-544); `page.context().__copies` holds
  // each job's renamed copy. Returns each context's refusals so far.
  // The MCP's sandbox cannot import or read a file, so the list comes from the one file outside git
  // that INTELCOST_GUARD_LIST names, served on 127.0.0.1 by `node browser/bench-session-serve.mjs`
  // (start it first; it reads and checks the file on every request). No list, no guard: this throws,
  // and mcp-signin.js refuses to sign in without a guarded context. The rule is lib/protected.mjs's.
  const answer = await page.context().request.get("http://127.0.0.1:5199/guard-list").catch(() => null);
  if (!answer || !answer.ok()) throw new Error("No guard list: start `node browser/bench-session-serve.mjs` in intelcost-infra first, with INTELCOST_GUARD_LIST set (D-542).");
  const LIST = await answer.json();
  const lowerKeys = (o) => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  const PROTECTED = lowerKeys(LIST.protected_projects);
  // The founder's own workspaces: never opened, reads too (D-601, D-891).
  const FOUNDER_WORKSPACES = lowerKeys(LIST.founder_workspaces);
  // The founder's accounts: never signed in as (D-542, D-601).
  const FOUNDER_EMAILS = [...new Set([LIST.seeded_email, ...(LIST.founder_emails ?? [])].map((e) => String(e).toLowerCase()))];
  const TEST_COPY = String(LIST.test_copy).toLowerCase();
  if (!Object.keys(PROTECTED).length || !Object.keys(FOUNDER_WORKSPACES).length || !FOUNDER_EMAILS.length || !PROTECTED[TEST_COPY]) {
    throw new Error("The guard list served is incomplete: no guard (D-542).");
  }
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
  return { list: LIST.digest, protected: Object.keys(PROTECTED).length, contexts: contexts.map((c, i) => ({ context: i, guarded: Boolean(c.__protectedRefusals), refused: c.__protectedRefusals })) };
}
