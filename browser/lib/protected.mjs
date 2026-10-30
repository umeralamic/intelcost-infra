// Projects no bench script, smoke helper or browser flow may write to (the founder, 2026-10-16,
// D-542): the 3D test copy, tested only through its duplicates, and the founder's own projects,
// which are never opened, recalculated or shared from here.
//
// The rule, for every request but GET, HEAD and OPTIONS: refused when its path or body names a
// protected project. One exception: `POST …/project/<3D test copy>/duplicate`, which reads the copy
// to make a duplicate and writes only the new project.
//
// Share links: every request to `/api/share/<token>/…` or `/api/share-link/<token>/…` (a member
// opening a link), reads included, is refused unless the run
// made that link itself (`allowShareToken`, on a duplicate). Every guest request, a read too, stamps
// the link's last access, and a link's token does not say whose project it opens, so nothing is
// looked up: a link the run did not make is never touched (D-542). A Save to my workspace names
// its link in the body (`…/share-copy`) and is held to the same rule.
//
// Copies: every project copy a guarded fetch or browser starts (Duplicate project, or a link's
// Save to my workspace) is followed to its end and renamed at once, "BENCH DUP <yyyy-mm-dd hh:mm>
// — delete me" (UTC), so no bench copy looks like the project it was made from (A4, D-544).

/** uuid → name, as the projects are named on the bench. */
export const PROTECTED_PROJECTS = Object.freeze({
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
});

/** The founder's own workspaces that hold no bench project: never opened from here (D-601). */
export const FOUNDER_WORKSPACES = Object.freeze({
  "04df326a-6dba-41df-ac98-095bf841f910": "Intelcost Team (umeralam.q@gmail.com)",
});

/** The 3D test copy: the one project that may be duplicated from here. */
export const TEST_COPY = "042c8817-4a65-47ba-95d8-686ecf986246";

const READS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Why a request is refused for opening a founder project or workspace, any method, reads too
 *  (D-601): every protected project but the 3D test copy, which is read to duplicate it. */
export function openRefusal(method, url, body = "") {
  const text = `${url} ${typeof body === "string" ? body : ""}`;
  for (const [uuid, name] of [...Object.entries(PROTECTED_PROJECTS), ...Object.entries(FOUNDER_WORKSPACES)]) {
    if (uuid !== TEST_COPY && text.includes(uuid)) {
      return `${String(method || "GET").toUpperCase()} refused: it names "${name}" (${uuid}), the founder's own, never opened from here (D-601)`;
    }
  }
  return null;
}

/** Why this request is refused, or null. `body` is its text, if any. */
export function writeRefusal(method, url, body = "") {
  const opened = openRefusal(method, url, body);
  if (opened) return opened;
  const verb = String(method || "GET").toUpperCase();
  if (READS.has(verb)) return null;
  const text = `${url} ${typeof body === "string" ? body : ""}`;
  for (const [uuid, name] of Object.entries(PROTECTED_PROJECTS)) {
    if (!text.includes(uuid)) continue;
    if (uuid === TEST_COPY && verb === "POST" && new RegExp(`/project/${uuid}/duplicate/?(\\?|$)`).test(String(url))) continue;
    return `${verb} refused: it names "${name}" (${uuid}), which bench runs never write to (D-542)`;
  }
  return null;
}

const allowedTokens = new Set();

/** The seeded account: the founder's, never signed in from a browser (CLAUDE.md). Its password is
 *  his alone (D-601); the api's own scripts act for it in its process, for a purge. */
export const SEEDED_EMAIL = "estimator@bench.intelcost.io";

/** The founder's accounts: never signed in as from a browser or a script (D-542, D-601). */
export const FOUNDER_EMAILS = Object.freeze([SEEDED_EMAIL, "umeralam.q@gmail.com"]);

/** Why a request is refused for its account, or null: a sign-in as one of the founder's. */
export function signInRefusal(method, url, body = "") {
  if (String(method).toUpperCase() !== "POST" || !/\/api\/auth\/login(?:[?#]|$)/.test(String(url))) return null;
  const text = String(body).toLowerCase();
  return FOUNDER_EMAILS.some((email) => text.includes(email)) ? "sign-in refused: the founder's accounts are never signed in from here (D-542, D-601)" : null;
}

/** A share link this run made, on a duplicate: its guest requests may go through. */
export function allowShareToken(token) {
  allowedTokens.add(String(token));
}

/** Why a request to a share link is refused, or null: any method, unless the run made the link. */
export function shareRefusal(url, allowed = allowedTokens, body = "") {
  if (SHARE_COPY.test(String(url))) {
    let token = null;
    try {
      token = JSON.parse(String(body)).token;
    } catch {
      // No body to read: no link of the run's.
    }
    return allowed.has(String(token)) ? null : `save a copy refused: a link this run did not make (allowShareToken), never touched (D-542)`;
  }
  // A guest's requests, and a member opening a link (`/api/share-link/<token>/as-member`).
  const m = String(url).match(/\/api\/share(?:-link)?\/([^/?#]+)\//);
  if (!m) return null;
  const token = decodeURIComponent(m[1]);
  return allowed.has(token) ? null : `share link refused: a link this run did not make (allowShareToken), never touched (D-542)`;
}

const SHARE_COPY = /\/api\/workspace\/[^/]+\/share-copy\/?(?:[?#]|$)/;

/** A request that starts a project copy: Duplicate project, or a link's Save to my workspace. The
 *  workspace the copy is made in is the first group. */
const COPY_START = /\/api\/workspace\/([^/]+)\/(?:project\/[^/]+\/duplicate|share-copy)\/?(?:[?#]|$)/;

/** A bench copy's name, the moment it is made (A4, D-544): "BENCH DUP <yyyy-mm-dd hh:mm> — delete
 *  me", in UTC. */
export function benchDupName(at = new Date()) {
  const iso = at.toISOString();
  return `BENCH DUP ${iso.slice(0, 10)} ${iso.slice(11, 16)} — delete me`;
}

/**
 * A copy's job followed to its end and the copy renamed at once (A4, D-544). `send(method, url,
 * body)` is the caller's transport, carrying the caller's own sign-in; it returns the parsed
 * response or throws. Resolves to the copy's `{ uuid, name }`, or null when the job made none.
 */
export async function renameWhenMade(apiBase, workspace, job, send, { timeout = 900000 } = {}) {
  const deadline = Date.now() + timeout;
  const projects = `${apiBase}/api/workspace/${workspace}/project`;
  for (;;) {
    const state = await send("GET", `${projects}/duplicate/${job}`);
    if (state?.state === "done" && state.project_uuid) {
      const name = benchDupName();
      const renamed = await send("PATCH", `${projects}/${state.project_uuid}`, { name });
      if (renamed?.name !== name) throw new Error(`copy ${state.project_uuid}: not renamed to "${name}"`);
      return { uuid: state.project_uuid, name };
    }
    if (!state || state.state === "failed") return null;
    if (Date.now() > deadline) throw new Error(`copy job ${job}: not done after ${timeout / 1000} s`);
    // A job's progress, polled as the app's own dialog polls it.
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/** Copies this process started, by job: each resolves to the renamed copy (`copyMade`). */
const copies = new Map();

/** The copy a job of this process made, once it is renamed: `{ uuid, name }`, or null. */
export function copyMade(job) {
  const made = copies.get(String(job));
  if (!made) throw new Error(`copy job ${job}: not started through the guard`);
  return made;
}

/** A copy's start seen in a response: its job followed and the copy renamed, in the background. */
function followCopy(url, job, send, registry) {
  const match = String(url).match(COPY_START);
  if (!match || !job || registry.has(String(job))) return;
  const apiBase = String(url).slice(0, String(url).indexOf("/api/"));
  const made = renameWhenMade(apiBase, match[1], job, send).catch((error) => {
    console.error(`[guard] ${error.message}`);
    return null;
  });
  registry.set(String(job), made);
}

/**
 * Every fetch this process makes, refused before it leaves when it would write to a protected
 * project or touch a share link the run did not make. Installed once; `bench.mjs` installs it on import, so every script that uses the bench's
 * helpers has it.
 */
export function guardFetch() {
  if (globalThis.fetch.__protected) return;
  const real = globalThis.fetch.bind(globalThis);
  const guarded = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init.method ?? (typeof input === "object" && "method" in input ? input.method : "GET");
    const body = typeof init.body === "string" ? init.body : "";
    const refusal = writeRefusal(method, url, body) ?? shareRefusal(url, allowedTokens, body) ?? signInRefusal(method, url, body);
    if (refusal) throw new Error(refusal);
    const response = await real(input, init);
    if (String(method).toUpperCase() === "POST" && response.ok && COPY_START.test(url)) {
      const job = (await response.clone().json().catch(() => null))?.job;
      const headers = new Headers(init.headers ?? (typeof input === "object" && "headers" in input ? input.headers : undefined));
      followCopy(url, job, nodeSend(real, headers.get("authorization")), copies);
    }
    return response;
  };
  guarded.__protected = true;
  globalThis.fetch = guarded;
}

/** The guard's own requests from Node, signed in as the request it follows. */
function nodeSend(real, authorization) {
  return async (method, url, body) => {
    const response = await real(url, {
      method,
      headers: { ...(authorization ? { authorization } : {}), ...(body ? { "content-type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`${method} ${url}: ${response.status}`);
    return response.json().catch(() => null);
  };
}

/** The guard's own requests beside a browser context, signed in as the page. `nodeUrl` maps the
 *  page's address to one Node reaches (the bench's containerised browser, `bench.mjs`). */
function contextSend(context, authorization, nodeUrl) {
  return async (method, url, body) => {
    const response = await context.request.fetch(await nodeUrl(url), {
      method,
      headers: authorization ? { authorization } : {},
      ...(body ? { data: body } : {}),
    });
    if (!response.ok()) throw new Error(`${method} ${url}: ${response.status()}`);
    return response.json().catch(() => null);
  };
}

/**
 * A browser context's requests, aborted when they would write to a protected project, touch a
 * share link the run did not make, or sign in as the seeded account; a copy the page starts is
 * renamed the moment it is made. Returns the list of refused requests, for the run to report.
 */
export async function guardContext(context, { nodeUrl = (url) => url } = {}) {
  if (context.__protectedRefusals) return context.__protectedRefusals;
  const refused = [];
  context.__protectedRefusals = refused;
  // A context's own links, as the run makes them (`context.__allowShare.add(token)`).
  context.__allowShare = context.__allowShare ?? new Set();
  // The copies its pages started, by job, each resolving to the renamed copy.
  context.__copies = context.__copies ?? new Map();
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const body = request.postData() ?? "";
    const refusal =
      writeRefusal(request.method(), request.url(), body) ??
      shareRefusal(request.url(), new Set([...allowedTokens, ...context.__allowShare]), body) ??
      signInRefusal(request.method(), request.url(), body);
    if (refusal) {
      refused.push(`${request.method()} ${request.url()}: ${refusal}`);
      return route.abort("blockedbyclient");
    }
    return route.fallback();
  });
  context.on("response", (response) => {
    const request = response.request();
    if (request.method() !== "POST" || !response.ok() || !COPY_START.test(request.url())) return;
    void (async () => {
      const job = (await response.json().catch(() => null))?.job;
      const authorization = (await request.allHeaders()).authorization;
      followCopy(request.url(), job, contextSend(context, authorization, nodeUrl), context.__copies);
    })();
  });
  return refused;
}

/** Every context of this browser guarded, now and when made later (`newContext`, `newPage`). */
export async function guardBrowser(browser, options = {}) {
  for (const context of browser.contexts()) await guardContext(context, options);
  if (browser.__protected) return browser;
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const context = await newContext(...args);
    await guardContext(context, options);
    return context;
  };
  browser.newPage = async (...args) => {
    const context = await browser.newContext(...args);
    const page = await context.newPage();
    // As Playwright's own newPage: the page owns its context.
    page.once("close", () => void context.close().catch(() => null));
    return page;
  };
  browser.__protected = true;
  return browser;
}
