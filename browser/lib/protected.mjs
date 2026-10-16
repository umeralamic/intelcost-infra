// Projects no bench script, smoke helper or browser flow may write to (the founder, 2026-10-16,
// D-542): the 3D test copy, tested only through its duplicates, and the founder's own projects,
// which are never opened, recalculated or shared from here.
//
// The rule, for every request but GET, HEAD and OPTIONS: refused when its path or body names a
// protected project. One exception: `POST …/project/<3D test copy>/duplicate`, which reads the copy
// to make a duplicate and writes only the new project.
//
// Share links: every request to `/api/share/<token>/…`, reads included, is refused unless the run
// made that link itself (`allowShareToken`, on a duplicate). Every guest request, a read too, stamps
// the link's last access, and a link's token does not say whose project it opens, so nothing is
// looked up: a link the run did not make is never touched (D-542).

/** uuid → name, as the projects are named on the bench. */
export const PROTECTED_PROJECTS = Object.freeze({
  "042c8817-4a65-47ba-95d8-686ecf986246": "Hidden Valley Rebid — 3D test",
  "9c348237-1ca6-42d0-bd8c-712d7cf915c1": "HIdden Valley Spec",
  "bd8fc5b0-34ca-4186-99f0-7278c43b4c1c": "Hidden Valley Spec Building Rebid",
  "51e474d2-b55b-40d2-ab46-09433ffc5add": "Waxing City",
  "09f1fc14-42f4-4140-9726-bcaf3056ea87": "Minmar",
});

/** The 3D test copy: the one project that may be duplicated from here. */
export const TEST_COPY = "042c8817-4a65-47ba-95d8-686ecf986246";

const READS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Why this request is refused, or null. `body` is its text, if any. */
export function writeRefusal(method, url, body = "") {
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

/** The seeded account: the founder's, never signed in from a browser (CLAUDE.md). The api's own
 *  helpers may use it, for a duplicate, a link on one, or a purge. */
export const SEEDED_EMAIL = "estimator@bench.intelcost.io";

/** Why a browser's request is refused for its account, or null: a sign-in as the seeded account. */
export function signInRefusal(method, url, body = "") {
  if (String(method).toUpperCase() !== "POST" || !/\/api\/auth\/login(?:[?#]|$)/.test(String(url))) return null;
  return String(body).includes(SEEDED_EMAIL) ? "sign-in refused: the seeded account is never signed in from a browser (CLAUDE.md, D-542)" : null;
}

/** A share link this run made, on a duplicate: its guest requests may go through. */
export function allowShareToken(token) {
  allowedTokens.add(String(token));
}

/** Why a request to a share link is refused, or null: any method, unless the run made the link. */
export function shareRefusal(url, allowed = allowedTokens) {
  const m = String(url).match(/\/api\/share\/([^/?#]+)\//);
  if (!m) return null;
  const token = decodeURIComponent(m[1]);
  return allowed.has(token) ? null : `share link refused: a link this run did not make (allowShareToken), never touched (D-542)`;
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
    const refusal = writeRefusal(method, url, body) ?? shareRefusal(url);
    if (refusal) throw new Error(refusal);
    return real(input, init);
  };
  guarded.__protected = true;
  globalThis.fetch = guarded;
}

/**
 * A browser context's requests, aborted when they would write to a protected project, touch a
 * share link the run did not make, or sign in as the seeded account. Returns the list of refused requests, for the run to report.
 */
export async function guardContext(context) {
  if (context.__protectedRefusals) return context.__protectedRefusals;
  const refused = [];
  context.__protectedRefusals = refused;
  // A context's own links, as the run makes them (`context.__allowShare.add(token)`).
  context.__allowShare = context.__allowShare ?? new Set();
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const body = request.postData() ?? "";
    const refusal =
      writeRefusal(request.method(), request.url(), body) ??
      shareRefusal(request.url(), new Set([...allowedTokens, ...context.__allowShare])) ??
      signInRefusal(request.method(), request.url(), body);
    if (refusal) {
      refused.push(`${request.method()} ${request.url()}: ${refusal}`);
      return route.abort("blockedbyclient");
    }
    return route.fallback();
  });
  return refused;
}

/** Every context of this browser guarded, now and when made later (`newContext`, `newPage`). */
export async function guardBrowser(browser) {
  for (const context of browser.contexts()) await guardContext(context);
  if (browser.__protected) return browser;
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const context = await newContext(...args);
    await guardContext(context);
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
